package dao

import (
	"fmt"

	"xAssistant/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ConversationDAO struct {
	db *gorm.DB
}

func NewConversationDAO(db *gorm.DB) *ConversationDAO {
	return &ConversationDAO{db: db}
}

func (r *ConversationDAO) Create(c *models.Conversation) error {
	c.ID = uuid.New().String()
	return r.db.Create(c).Error
}

func (r *ConversationDAO) GetByID(id string) (*models.Conversation, error) {
	var c models.Conversation
	if err := r.db.First(&c, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("conversation not found: %s", id)
		}
		return nil, err
	}
	return &c, nil
}

func (r *ConversationDAO) GetAll() ([]*models.Conversation, error) {
	var conversations []*models.Conversation
	if err := r.db.Order("updated_at DESC").Find(&conversations).Error; err != nil {
		return nil, err
	}
	return conversations, nil
}

func (r *ConversationDAO) GetByAgentID(agentID string) ([]*models.Conversation, error) {
	var conversations []*models.Conversation
	if err := r.db.Where("agent_id = ?", agentID).Order("updated_at DESC").Find(&conversations).Error; err != nil {
		return nil, err
	}
	return conversations, nil
}

func (r *ConversationDAO) Update(c *models.Conversation) error {
	return r.db.Save(c).Error
}

func (r *ConversationDAO) Delete(id string) error {
	return r.db.Delete(&models.Conversation{}, "id = ?", id).Error
}

func (r *ConversationDAO) GetActive() ([]*models.Conversation, error) {
	var conversations []*models.Conversation
	if err := r.db.Where("status = ?", "active").Order("updated_at DESC").Find(&conversations).Error; err != nil {
		return nil, err
	}
	return conversations, nil
}

func (r *ConversationDAO) GetPinned() ([]*models.Conversation, error) {
	var conversations []*models.Conversation
	if err := r.db.Where("pinned = ?", true).Order("updated_at DESC").Find(&conversations).Error; err != nil {
		return nil, err
	}
	return conversations, nil
}
