package dao

import (
	"fmt"

	"xAssistant/internal/models"
	"xAssistant/internal/services"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ModelDAO struct {
	db *gorm.DB
}

func NewModelDAO(db *gorm.DB) services.ModelRepository {
	return &ModelDAO{db: db}
}

func (r *ModelDAO) Create(model *models.Model) error {
	model.ID = uuid.New().String()
	return r.db.Create(model).Error
}

func (r *ModelDAO) GetByID(id string) (*models.Model, error) {
	var m models.Model
	if err := r.db.First(&m, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("模型不存在: %s", id)
		}
		return nil, err
	}
	return &m, nil
}

func (r *ModelDAO) GetAll() ([]*models.Model, error) {
	var models []*models.Model
	if err := r.db.Order("created_at DESC").Find(&models).Error; err != nil {
		return nil, err
	}
	return models, nil
}

func (r *ModelDAO) Update(model *models.Model) error {
	return r.db.Save(model).Error
}

func (r *ModelDAO) Delete(id string) error {
	return r.db.Delete(&models.Model{}, "id = ?", id).Error
}

func (r *ModelDAO) GetEnabled() ([]*models.Model, error) {
	var models []*models.Model
	if err := r.db.Where("enabled = ?", true).Order("created_at DESC").Find(&models).Error; err != nil {
		return nil, err
	}
	return models, nil
}
