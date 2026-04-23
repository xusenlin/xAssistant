package models

import "time"

// Message status constants
const (
	MessageStatusPending   = "pending"   // 消息已创建，等待处理
	MessageStatusStreaming = "streaming" // 流式传输中
	MessageStatusCompleted = "completed" // 处理完成
)

type Message struct {
	ID             string    `gorm:"type:text;primaryKey" json:"id"`
	ConversationID string    `gorm:"type:text;not null;index" json:"conversation_id"`
	Role           string    `gorm:"type:text;not null" json:"role"` // user / assistant
	ModelName      string    `gorm:"column:model_name;type:text" json:"model_name"`
	InputTokens    int       `gorm:"type:integer;default:0" json:"input_tokens"`
	OutputTokens   int       `gorm:"type:integer;default:0" json:"output_tokens"`
	CreatedAt      time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt      time.Time `gorm:"autoUpdateTime" json:"updated_at"`
	Status         string    `gorm:"type:text;default:'pending'" json:"status"`
	SequenceOrder  int       `gorm:"type:integer;not null" json:"sequence_order"`
}

func (Message) TableName() string {
	return "messages"
}
