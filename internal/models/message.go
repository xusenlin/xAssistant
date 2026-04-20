package models

import "time"

type Message struct {
	ID             string    `gorm:"type:text;primaryKey" json:"id"`
	ConversationID string    `gorm:"type:text;not null;index" json:"conversation_id"`
	Role           string    `gorm:"type:text;not null" json:"role"` // user / assistant
	ModelID        string    `gorm:"type:text" json:"model_id"`
	SequenceOrder  int       `gorm:"type:integer;not null" json:"sequence_order"`
	InputTokens    int       `gorm:"type:integer;default:0" json:"input_tokens"`
	OutputTokens   int       `gorm:"type:integer;default:0" json:"output_tokens"`
	CreatedAt      time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt      time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Message) TableName() string {
	return "messages"
}
