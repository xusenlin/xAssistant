package dao

import (
	"fmt"

	"xAssistant/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MessageDAO struct {
	db *gorm.DB
}

func NewMessageDAO(db *gorm.DB) *MessageDAO {
	return &MessageDAO{db: db}
}

func (r *MessageDAO) Create(m *models.Message) error {
	m.ID = uuid.New().String()
	return r.db.Create(m).Error
}

func (r *MessageDAO) GetByID(id string) (*models.Message, error) {
	var m models.Message
	if err := r.db.First(&m, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("message not found: %s", id)
		}
		return nil, err
	}
	return &m, nil
}

func (r *MessageDAO) GetByConversationID(conversationID string) ([]*models.Message, error) {
	var messages []*models.Message
	if err := r.db.Where("conversation_id = ?", conversationID).Order("sequence_order ASC").Find(&messages).Error; err != nil {
		return nil, err
	}
	return messages, nil
}

func (r *MessageDAO) Update(m *models.Message) error {
	return r.db.Save(m).Error
}

func (r *MessageDAO) Delete(id string) error {
	return r.db.Delete(&models.Message{}, "id = ?", id).Error
}

func (r *MessageDAO) DeleteByConversationID(conversationID string) error {
	return r.db.Delete(&models.Message{}, "conversation_id = ?", conversationID).Error
}

func (r *MessageDAO) GetLastSequence(conversationID string) (int, error) {
	var m models.Message
	if err := r.db.Where("conversation_id = ?", conversationID).Order("sequence_order DESC").First(&m).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return 0, nil
		}
		return 0, err
	}
	return m.SequenceOrder, nil
}
