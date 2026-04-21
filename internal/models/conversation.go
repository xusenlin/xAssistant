package models

import "time"

type Conversation struct {
	ID            string    `gorm:"type:text;primaryKey" json:"id"`
	Title         string    `gorm:"type:text;not null" json:"title"`
	AgentID       string    `gorm:"type:text;not null;index" json:"agent_id"`
	ModelID       string    `gorm:"type:text;index" json:"model_id"`
	Type          string    `gorm:"type:text;default:simple" json:"type"`   // simple / project
	Status        string    `gorm:"type:text;default:active" json:"status"` // active / archived / deleted
	Pinned        bool      `gorm:"type:integer;default:0" json:"pinned"`
	MessageCount  int       `gorm:"type:integer;default:0" json:"message_count"`
	ToolCallCount int       `gorm:"type:integer;default:0" json:"tool_call_count"`
	TotalTokens   int       `gorm:"type:integer;default:0" json:"total_tokens"`
	InputTokens   int       `gorm:"type:integer;default:0" json:"input_tokens"`
	OutputTokens  int       `gorm:"type:integer;default:0" json:"output_tokens"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Conversation) TableName() string {
	return "conversations"
}
