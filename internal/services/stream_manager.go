package services

import (
	"fmt"
	"sync"

	"xAssistant/internal/models"
)

// StreamEvent is sent to frontend via Wails Events
type StreamEvent struct {
	Type      string              `json:"type"`       // "delta" | "block_end" | "complete" | "error"
	BlockType string              `json:"block_type"` // "thinking" | "text" | "tool_use" | "tool_result"
	Delta     string              `json:"delta,omitempty"`
	Content   string              `json:"content,omitempty"` // full content for delta, or content for block_end
	Error     string              `json:"error,omitempty"`
}

// StreamSnapshot is returned to frontend on Subscribe
type StreamSnapshot struct {
	MessageID string                `json:"message_id"`
	Blocks    []models.MessageBlock `json:"blocks"`
	Current   *models.MessageBlock  `json:"current"`
}

// StreamBuffer holds the streaming state for a single message
type StreamBuffer struct {
	MessageID string
	Blocks    []models.MessageBlock
	Current   *models.MessageBlock
	mu        sync.RWMutex
}

// AppendDelta updates the current block with new delta content
func (b *StreamBuffer) AppendDelta(blockType, delta string) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if b.Current == nil || b.Current.BlockType != blockType {
		b.Current = &models.MessageBlock{
			MessageID: b.MessageID,
			BlockType: blockType,
			Content:   delta,
		}
	} else {
		b.Current.Content += delta
	}
}

// FinishBlock moves current to blocks and clears current
func (b *StreamBuffer) FinishBlock(blockType, content string) {
	b.mu.Lock()
	defer b.mu.Unlock()

	block := models.MessageBlock{
		MessageID: b.MessageID,
		BlockType: blockType,
		Content:   content,
	}
	b.Blocks = append(b.Blocks, block)
	b.Current = nil
}

// FinishToolBlock adds a tool block
func (b *StreamBuffer) FinishToolBlock(blockType, toolID, toolName, content string, isError bool) {
	b.mu.Lock()
	defer b.mu.Unlock()

	block := models.MessageBlock{
		MessageID: b.MessageID,
		BlockType: blockType,
		Content:   content,
		ToolUseID: toolID,
		ToolName:  toolName,
		IsError:   isError,
	}
	b.Blocks = append(b.Blocks, block)
	b.Current = nil
}

// GetSnapshot returns a copy of the current buffer state
func (b *StreamBuffer) GetSnapshot() *StreamSnapshot {
	b.mu.RLock()
	defer b.mu.RUnlock()

	snapshot := &StreamSnapshot{
		MessageID: b.MessageID,
		Blocks:    make([]models.MessageBlock, len(b.Blocks)),
	}
	copy(snapshot.Blocks, b.Blocks)

	if b.Current != nil {
		current := *b.Current
		snapshot.Current = &current
	}

	return snapshot
}

// StreamManager manages all active stream buffers
type StreamManager struct {
	buffers map[string]*StreamBuffer
	mu      sync.RWMutex
}

// NewStreamManager creates a new StreamManager
func NewStreamManager() *StreamManager {
	return &StreamManager{
		buffers: make(map[string]*StreamBuffer),
	}
}

// Create creates a new buffer for a message
func (m *StreamManager) Create(messageID string) *StreamBuffer {
	m.mu.Lock()
	defer m.mu.Unlock()

	buffer := &StreamBuffer{
		MessageID: messageID,
		Blocks:    make([]models.MessageBlock, 0),
	}
	m.buffers[messageID] = buffer
	return buffer
}

// Get returns a buffer by messageID
func (m *StreamManager) Get(messageID string) (*StreamBuffer, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	buffer, exists := m.buffers[messageID]
	return buffer, exists
}

// Delete removes a buffer
func (m *StreamManager) Delete(messageID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.buffers, messageID)
}

// GetSnapshot returns a snapshot of the buffer
func (m *StreamManager) GetSnapshot(messageID string) (*StreamSnapshot, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	buffer, exists := m.buffers[messageID]
	if !exists {
		return nil, fmt.Errorf("no active stream for message %s", messageID)
	}

	return buffer.GetSnapshot(), nil
}
