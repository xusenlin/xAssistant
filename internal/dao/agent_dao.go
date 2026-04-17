package dao

import (
	"fmt"

	"xAssistant/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AgentDAO struct {
	db *gorm.DB
}

func NewAgentDAO(db *gorm.DB) *AgentDAO {
	return &AgentDAO{db: db}
}

func (r *AgentDAO) Create(agent *models.Agent) error {
	agent.ID = uuid.New().String()
	return r.db.Create(agent).Error
}

func (r *AgentDAO) GetByID(id string) (*models.Agent, error) {
	var a models.Agent
	if err := r.db.First(&a, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("agent 不存在: %s", id)
		}
		return nil, err
	}
	return &a, nil
}

func (r *AgentDAO) GetAll() ([]*models.Agent, error) {
	var agents []*models.Agent
	if err := r.db.Order("created_at DESC").Find(&agents).Error; err != nil {
		return nil, err
	}
	return agents, nil
}

func (r *AgentDAO) Update(agent *models.Agent) error {
	return r.db.Save(agent).Error
}

func (r *AgentDAO) Delete(id string) error {
	return r.db.Delete(&models.Agent{}, "id = ?", id).Error
}

func (r *AgentDAO) GetEnabled() ([]*models.Agent, error) {
	var agents []*models.Agent
	if err := r.db.Where("enabled = ?", true).Order("created_at DESC").Find(&agents).Error; err != nil {
		return nil, err
	}
	return agents, nil
}
