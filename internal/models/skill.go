package models

import (
	"time"
)

type Skill struct {
	ID            string    `gorm:"type:text;primaryKey" json:"id"`
	Name          string    `gorm:"type:text;not null;uniqueIndex" json:"name"`
	Description   string    `gorm:"type:text" json:"description"`
	License       string    `gorm:"type:text" json:"license"`
	Compatibility string    `gorm:"type:text" json:"compatibility"`
	Metadata      string    `gorm:"type:text" json:"metadata"`
	AllowedTools  string    `gorm:"column:allowed_tools;type:text" json:"allowed_tools"`
	Content       []byte    `gorm:"type:blob" json:"-"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Skill) TableName() string {
	return "skills"
}
