package models

import "time"

const BlockTypeText = "text"
const BlockTypeThinking = "thinking"
const BlockTypeToolUse = "tool_use"
const BlockTypeToolResult = "tool_result"

type MessageBlock struct {
	ID            string    `gorm:"type:text;primaryKey" json:"id"`
	MessageID     string    `gorm:"type:text;not null;index" json:"message_id"`
	BlockType     string    `gorm:"type:text;not null" json:"block_type"` // text / thinking / tool_use / tool_result
	SequenceOrder int       `gorm:"type:integer;not null" json:"sequence_order"`
	Content       string    `gorm:"type:text" json:"content"`           // text/thinking 内容
	ToolUseID     string    `gorm:"type:text;index" json:"tool_use_id"` // 关联 tool_use 和 tool_result
	ToolName      string    `gorm:"type:text" json:"tool_name"`
	ToolInput     string    `gorm:"type:text" json:"tool_input"` // JSON string
	ToolResult    string    `gorm:"type:text" json:"tool_result"`
	IsError       bool      `gorm:"type:integer;default:0" json:"is_error"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (MessageBlock) TableName() string {
	return "message_blocks"
}
