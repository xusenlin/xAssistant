package models

import (
	"time"
)

type Model struct {
	ID          string    `gorm:"type:text;primaryKey" json:"id"`
	Name        string    `gorm:"type:text;not null" json:"name"`
	Provider    string    `gorm:"type:text;not null" json:"provider"`
	ModelID     string    `gorm:"column:model_id;type:text;not null" json:"model_id"`
	BaseURL     string    `gorm:"type:text" json:"base_url"`
	APIKey      string    `gorm:"type:text" json:"-"` // 加密存储，不序列化到 JSON
	Description string    `gorm:"type:text" json:"description"`
	Temperature float64   `gorm:"type:real;default:0.7" json:"temperature"`
	MaxTokens   int       `gorm:"type:integer;default:4096" json:"max_tokens"`
	TopP        float64   `gorm:"type:real;default:1.0" json:"top_p"`
	Enabled     bool      `gorm:"type:integer;default:1" json:"enabled"`
	IsDefault   bool      `gorm:"type:integer;default:0" json:"is_default"`
	Tags        string    `gorm:"type:text" json:"tags"`      // JSON 数组
	Metadata    string    `gorm:"type:text" json:"metadata"` // JSON 对象
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Model) TableName() string {
	return "models"
}
