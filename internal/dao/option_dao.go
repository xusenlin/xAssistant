package dao

import (
	"xAssistant/internal/models"

	"gorm.io/gorm"
)

type OptionDAO struct {
	db *gorm.DB
}

func NewOptionDAO(db *gorm.DB) *OptionDAO {
	return &OptionDAO{db: db}
}

func (r *OptionDAO) Get(key string) (*models.Option, error) {
	var opt models.Option
	if err := r.db.First(&opt, "key = ?", key).Error; err != nil {
		return nil, err
	}
	return &opt, nil
}

func (r *OptionDAO) Set(key, value string) error {
	opt := models.Option{Key: key, Value: value}
	return r.db.Save(&opt).Error
}

func (r *OptionDAO) Exists(key string) bool {
	var count int64
	r.db.Model(&models.Option{}).Where("key = ?", key).Count(&count)
	return count > 0
}
