package models

import (
	"time"
)

type ModelStat struct {
	ID            string    `gorm:"type:text;primaryKey" json:"id"`
	ModelID       string    `gorm:"type:text;index" json:"model_id"`
	Date          string    `gorm:"type:text;index" json:"date"`
	InputTokens   int64     `gorm:"type:integer;default:0" json:"input_tokens"`
	OutputTokens  int64     `gorm:"type:integer;default:0" json:"output_tokens"`
	Conversations int       `gorm:"type:integer;default:0" json:"conversations"`
	APIErrors     int       `gorm:"type:integer;default:0" json:"api_errors"`
	TotalRespTime int64     `gorm:"type:integer;default:0" json:"total_resp_time"`
	RequestCount  int       `gorm:"type:integer;default:0" json:"request_count"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (ModelStat) TableName() string {
	return "model_stats"
}
