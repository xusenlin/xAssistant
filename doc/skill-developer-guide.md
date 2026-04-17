# Skill 开发文档

## 概述

Skill 是 AI Agent 的可插拔能力模块，以 ZIP 包形式存储。每个 Skill 包含完整的技能定义、提示词和配置文件，通过统一的前端界面导入、编辑、导出。

## 目录结构

```
skill-name/
├── SKILL.md          # 必需，技能主定义（YAML frontmatter + Markdown 正文）
├── PROMPT.md         # 可选，基础提示词
├── EXTENDED.md       # 可选，扩展内容
├── DEEP.md           # 可选，深度上下文
├── config.json       # 可选，技能配置参数
└── assets/           # 可选，资源文件（图标、脚本等）
```

## SKILL.md 格式

`SKILL.md` 是每个 Skill 的入口文件，采用 YAML frontmatter + Markdown 正文的混合格式。

### Frontmatter 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 技能唯一名称，用于目录命名和引用 |
| `version` | string | 否 | 语义化版本，如 `1.0.0` |
| `description` | string | 否 | 技能简短描述 |
| `license` | string | 否 | 许可证，如 `MIT`、`Apache-2.0` |
| `compatibility` | string | 否 | 兼容性描述，如 `claude-code 2.x+` |
| `category` | string | 否 | 分类，如 `coding`、`review`、`debug`、`analysis`、`utility` |
| `tags` | string[] | 否 | 标签数组 |
| `allowed_tools` | string[] | 否 | 允许使用的工具列表 |

### 示例

```yaml
---
name: golang-patterns
version: 1.0.0
description: Idiomatic Go patterns, best practices, and conventions
license: MIT
compatibility: claude-code 2.x+
category: coding
tags: [go, patterns, best-practices, refactor]
allowed_tools: [Read, Edit, Write, Bash, Glob, Grep]
---

## 简介

本技能提供 idiomatic Go 编码模式、最佳实践和惯例指南，帮助编写健壮、高效、可维护的 Go 应用。

## 核心原则

- 偏好组合而非继承
- 错误作为返回值而非异常
- 接口定义在消费侧
- 最小化依赖
```

## 存储机制

### 数据库存储

Skill 的完整内容以 ZIP 二进制形式存储在 SQLite 数据库的 `skills.content` 字段（BLOB）。

### 目录存储

导入时 ZIP 自动解压到 `~/.xAssistant/skills/{name}/`，作为编辑时的文件系统工作副本。编辑保存后重新打包 ZIP 同步回数据库。

```
~/.xAssistant/
├── config.json       # 加密配置
├── data.db          # SQLite 数据库
└── skills/          # Skill 工作目录
    ├── golang-patterns/
    │   ├── SKILL.md
    │   ├── PROMPT.md
    │   └── ...
    └── another-skill/
        └── ...
```

### 数据流

```
导入流程：
  ZIP 文件 → base64 编码 → Go backend
            → 解码 → 解压到 ~/.xAssistant/skills/{name}/
            → 解析 SKILL.md frontmatter
            → 写入 DB (content = 原始 ZIP)

编辑流程：
  点击编辑 → 检查目录是否存在（无则从 DB 解压）
           → 读取文件内容 → 前端展示
           → 保存 → 重新打包目录为 ZIP → 同步回 DB

导出流程：
  DB content → 下发 base64 → 前端 → 解码 → 下载 ZIP
```

## 渐进式披露

Skill 内容支持分层披露，AI 对话时可按需加载不同层级的上下文：

| 文件 | 披露层级 | 说明 |
|------|----------|------|
| `SKILL.md` | 始终可见 | 技能元信息和核心定义 |
| `PROMPT.md` | 基础层 | 基础提示词 |
| `EXTENDED.md` | 扩展层 | 扩展上下文和详细说明 |
| `DEEP.md` | 深度层 | 深度背景、案例、高级用法 |

> 渐进式披露的具体触发逻辑由 AI 框架后续实现，本模块仅负责管理和提供内容。

## 编写规范

### 命名规范

- 目录名使用 kebab-case（小写 + 连字符）
- 名称唯一，导入重复名称会报错

### 文件编码

- 所有文件使用 UTF-8 编码
- 避免二进制文件（放在 `assets/` 目录）

### PROMPT.md 编写建议

```markdown
## 角色定义
你是一个 [角色描述]，专注于 [领域]。

## 核心能力
- 能力1
- 能力2

## 工作流程
1. 理解需求
2. 分析方案
3. 执行操作
4. 验证结果

## 约束
- 不做假设，主动询问
- 每次修改前备份
```

### config.json 示例

```json
{
  "version": "1.0.0",
  "language": "zh-CN",
  "max_depth": 3,
  "enabled": true,
  "options": {
    "strict_mode": false,
    "auto_fix": true
  }
}
```

## 导入/导出

### 导入

1. 打开 Skills 页面，点击 `Import Skill` 或拖拽 ZIP
2. 系统自动解析 ZIP，验证 `SKILL.md` 存在且 `name` 字段非空
3. 检查名称是否已存在（唯一性）
4. 显示导入预览（名称、描述、license、compatibility）
5. 确认导入 → 解压文件 + 存入数据库

### 导出

点击技能卡片上的下载按钮，直接下载原始 ZIP 包。

### 编辑

1. 点击技能卡片上的编辑按钮
2. 系统确保文件已解压到工作目录
3. 通过文件标签切换查看/编辑不同文件
4. 保存时自动重新打包 ZIP 并同步 frontmatter 到数据库

## CLI 工具（未来扩展）

```bash
# 创建新 skill 脚手架
xassistant skill new golang-patterns

# 打包 skill
xassistant skill pack ./golang-patterns

# 解包 skill 到目录
xassistant skill unpack ./golang-patterns.zip

# 验证 skill 结构
xassistant skill validate ./golang-patterns

# 列出本地已安装 skill
xassistant skill list
```
