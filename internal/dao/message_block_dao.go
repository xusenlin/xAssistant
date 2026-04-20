package dao

import (
	"fmt"

	"xAssistant/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MessageBlockDAO struct {
	db *gorm.DB
}

func NewMessageBlockDAO(db *gorm.DB) *MessageBlockDAO {
	return &MessageBlockDAO{db: db}
}

func (r *MessageBlockDAO) Create(b *models.MessageBlock) error {
	b.ID = uuid.New().String()
	return r.db.Create(b).Error
}

func (r *MessageBlockDAO) GetByID(id string) (*models.MessageBlock, error) {
	var b models.MessageBlock
	if err := r.db.First(&b, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("message block not found: %s", id)
		}
		return nil, err
	}
	return &b, nil
}

func (r *MessageBlockDAO) GetByMessageID(messageID string) ([]*models.MessageBlock, error) {
	var blocks []*models.MessageBlock
	if err := r.db.Where("message_id = ?", messageID).Order("sequence_order ASC").Find(&blocks).Error; err != nil {
		return nil, err
	}
	return blocks, nil
}

func (r *MessageBlockDAO) GetByToolUseID(toolUseID string) ([]*models.MessageBlock, error) {
	var blocks []*models.MessageBlock
	if err := r.db.Where("tool_use_id = ?", toolUseID).Order("sequence_order ASC").Find(&blocks).Error; err != nil {
		return nil, err
	}
	return blocks, nil
}

func (r *MessageBlockDAO) Update(b *models.MessageBlock) error {
	return r.db.Save(b).Error
}

func (r *MessageBlockDAO) Delete(id string) error {
	return r.db.Delete(&models.MessageBlock{}, "id = ?", id).Error
}

func (r *MessageBlockDAO) DeleteByMessageID(messageID string) error {
	return r.db.Delete(&models.MessageBlock{}, "message_id = ?", messageID).Error
}

func (r *MessageBlockDAO) GetLastSequence(messageID string) (int, error) {
	var b models.MessageBlock
	if err := r.db.Where("message_id = ?", messageID).Order("sequence_order DESC").First(&b).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return 0, nil
		}
		return 0, err
	}
	return b.SequenceOrder, nil
}
