package models

import "time"

type Option struct {
	Key       string    `gorm:"type:text;primaryKey" json:"key"`
	Value     string    `gorm:"type:text" json:"value"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Option) TableName() string {
	return "options"
}
