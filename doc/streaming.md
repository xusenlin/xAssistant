# 流式消息实时推送

## 功能概述

支持用户在多个对话之间自由切换，同时保持流式消息的实时接收。无论用户切换到哪个对话，流式消息都不会丢失，切换回来时可以无缝恢复。

## 核心特性

- **多对话并发流式**：同时在多个对话中发送消息，流式响应并行处理
- **无损切换**：切换对话再回来，所有增量数据完整恢复
- **打字机效果**：实时显示 LLM 的思考和回答过程
- **状态一致性**：消息状态（pending/streaming/completed/failed）始终保持一致

## 架构设计

### 内存缓冲区 + 订阅模式

```
┌─────────────────────────────────────────────────────────────────┐
│                        Go 后端                                  │
│                                                                 │
│  StreamManager                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  StreamBuffer[msg_123]                                   │   │
│  │  ├─ Blocks: [{thinking, "你好"}]  ← 已完成的 blocks     │   │
│  │  └─ Current: {text, "Hello..."}   ← 正在流式的 block    │   │
│  │                                                         │   │
│  │  StreamBuffer[msg_456]                                   │   │
│  │  ├─ Blocks: []                                           │   │
│  │  └─ Current: {thinking, "让我想想..."}                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│              通过 Wails Events 实时推送给前端                   │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                        前端                                     │
│                                                                 │
│  streamState: {                                                │
│    messageID: "msg_123",    ← 当前订阅的消息                    │
│    blocks: [...],           ← 已完成的 blocks                  │
│    current: {...},          ← 正在流式的 block                 │
│    isStreaming: true                                             │
│  }                                                              │
│                                                                 │
│  用户切换对话 → unsubscribe → 切换回来 → subscribe → 恢复全部  │
└─────────────────────────────────────────────────────────────────┘
```

### 消息状态机

```
                    ┌─────────────────────────────────────┐
                    ↓                                     │
┌─────────┐    ┌───────────┐    ┌───────────┐    ┌───────┴──┐
│ pending │ → │ streaming │ → │ completed │    │  failed  │
└─────────┘    └───────────┘    └───────────┘    └──────────┘
                    │                                     ↑
                    │ (错误/超时/崩溃)                      │
                    └─────────────────────────────────────┘
```

- **pending**：消息已创建，等待流式开始
- **streaming**：流式进行中，blocks 持续写入
- **completed**：流式正常结束，数据已持久化
- **failed**：流式异常中断

## 数据流

### 1. 用户发送消息

```
用户点击发送
    │
    ├─ 前端: ChatService.SendMessageStream() → messageID
    ├─ 前端: subscribeToStream(messageID)
    │   ├─ ChatService.Subscribe(messageID) → 获取当前缓冲区
    │   └─ Events.On(`chat:stream:${messageID}`, handleStreamEvent)
    └─ 前端: 在 UI 中添加空的 assistant 消息
```

### 2. Go 后端流式处理

```
runStreamingInBackground()
    │
    ├─ streamManager.Create(messageID) → 创建缓冲区
    ├─ messageService.UpdateStatus(messageID, "streaming")
    │
    ├─ BlockThinkStream "你"
    │   ├─ buffer.AppendDelta("thinking", "你")
    │   └─ Emit("chat:stream:msg_123", {type: "delta", ...})
    │
    ├─ BlockThinkEnd "你好"
    │   ├─ buffer.FinishBlock("thinking", "你好")
    │   ├─ messageBlockService.CreateThinkingBlock(...)
    │   └─ Emit("chat:stream:msg_123", {type: "block_end", ...})
    │
    ├─ BlockTextStream "Hello"
    │   ├─ buffer.AppendDelta("text", "Hello")
    │   └─ Emit("chat:stream:msg_123", {type: "delta", ...})
    │
    ├─ BlockFinish
    │   ├─ 写入数据库
    │   ├─ streamManager.Delete(messageID)
    │   └─ Emit("chat:stream:msg_123", {type: "complete"})
    │
```

### 3. 前端事件处理

```
handleStreamEvent(event)
    │
    ├─ type: "delta"
    │   └─ 更新 streamState.current.content → 打字机效果
    │
    ├─ type: "block_end"
    │   └─ 将 current 移入 blocks，清空 current
    │
    ├─ type: "complete"
    │   └─ unsubscribeFromStream() + loadMessages()
    │
    └─ type: "error"
        └─ unsubscribeFromStream() + loadMessages()
```

## 场景处理

### 场景 1：正常流式

```
用户发送 → 订阅 → 实时渲染 → 完成 → 从 DB 加载最终数据
```

### 场景 2：切换对话再回来

```
T1: 用户在对话 A 发送消息 msg_A
    └─ 前端: subscribeToStream(msg_A)

T2: 用户切换到对话 B
    └─ 前端: unsubscribeFromStream()
         Go: StreamBuffer[msg_A] 继续运行

T3: 用户切换回对话 A
    ├─ 前端: loadMessages()
    ├─ 前端: msg_A.status === "streaming"
    └─ 前端: subscribeToStream(msg_A)
         └─ Go: 返回 StreamBuffer[msg_A] 的当前状态（包含已累积的数据）
```

### 场景 3：多对话并发

```
T1: 对话 A 发送 msg_A → subscribeToStream(msg_A)
T2: 切换到对话 B → unsubscribeFromStream()
T3: 对话 B 发送 msg_B → subscribeToStream(msg_B)
T4: 切换回对话 A → unsubscribeFromStream() → subscribeToStream(msg_A)
    └─ 两个 StreamBuffer 并行运行，互不干扰
```

### 场景 4：打开历史对话（未完成消息）

```
loadMessages()
    │
    ├─ 检查最后一条消息的 status
    │
    ├─ status === "streaming"
    │   └─ subscribeToStream(lastMsg.id) → 恢复流式
    │
    ├─ status === "pending"
    │   └─ 可能是进程崩溃 → 标记为 "failed"
    │
    └─ status === "completed"
        └─ 从 DB 加载 blocks
```

### 场景 5：进程崩溃恢复

```
启动时检查:
    SELECT * FROM messages WHERE status IN ('pending', 'streaming')
    
对这些消息:
    UPDATE messages SET status = 'failed'
```

## 事件定义

| 事件名 | 数据 | 说明 |
|--------|------|------|
| `chat:stream:{messageID}` | `{type: "block_start", blockType}` | block 开始 |
| `chat:stream:{messageID}` | `{type: "delta", blockType, delta, content}` | 增量推送 |
| `chat:stream:{messageID}` | `{type: "block_end", blockType, content}` | block 完成 |
| `chat:stream:{messageID}` | `{type: "complete"}` | 流式结束 |
| `chat:stream:{messageID}` | `{type: "error", error}` | 流式错误 |

## 文件结构

```
internal/
├── services/
│   ├── stream_manager.go      # StreamManager + StreamBuffer
│   └── chat_service.go        # 集成 StreamManager + Events
├── models/
│   └── message.go             # MessageStatusFailed

frontend/src/pages/Chat/
└── ChatDetail.tsx             # 前端订阅 + 打字机渲染
```

## API

### Go 端

```go
// Subscribe 返回消息的当前流式缓冲区
func (s *ChatService) Subscribe(messageID string) (*StreamSnapshot, error)

// StreamSnapshot 包含当前流式状态
type StreamSnapshot struct {
    MessageID string                `json:"message_id"`
    Blocks    []models.MessageBlock `json:"blocks"`
    Current   *models.MessageBlock  `json:"current"`
}
```

### 前端

```typescript
// 订阅消息流
const snapshot = await ChatService.Subscribe(messageID);

// 监听事件
Events.On(`chat:stream:${messageID}`, handleStreamEvent);

// 取消订阅
Events.Off(`chat:stream:${messageID}`);
```

## 优势

| 特性 | 说明 |
|------|------|
| **数据完整性** | 切换对话再回来，所有数据完整恢复 |
| **实时性** | 增量数据通过 Events 实时推送，延迟毫秒级 |
| **简单性** | 前端统一逻辑：未完成就订阅，完成就从 DB 加载 |
| **并发性** | 多个对话可以同时流式，互不干扰 |
| **容错性** | 进程崩溃时，未完成消息标记为 failed |
