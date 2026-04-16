package models

import (
	"time"
)

type Agent struct {
	ID          string    `gorm:"type:text;primaryKey" json:"id"`
	Name        string    `gorm:"type:text;not null" json:"name"`
	Icon        string    `gorm:"type:text" json:"icon"`
	Description string    `gorm:"type:text" json:"description"`
	AgentsMD    string    `gorm:"column:agents_md;type:text" json:"agents_md"`
	SoulMD      string    `gorm:"column:soul_md;type:text" json:"soul_md"`
	ProfileMD   string    `gorm:"column:profile_md;type:text" json:"profile_md"`
	MemoryMD    string    `gorm:"column:memory_md;type:text" json:"memory_md"`
	Language    string    `gorm:"type:text" json:"language"`
	Enabled     bool      `gorm:"type:integer;default:1" json:"enabled"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Agent) TableName() string {
	return "agents"
}
