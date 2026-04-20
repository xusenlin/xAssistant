package services

import (
	"xAssistant/internal/models"
)

type MessageRepository interface {
	Create(m *models.Message) error
	GetByID(id string) (*models.Message, error)
	GetByConversationID(conversationID string) ([]*models.Message, error)
	Update(m *models.Message) error
	Delete(id string) error
	DeleteByConversationID(conversationID string) error
	GetLastSequence(conversationID string) (int, error)
}

type MessageService struct {
	repo MessageRepository
}

func NewMessageService(repo MessageRepository) *MessageService {
	return &MessageService{repo: repo}
}

func (s *MessageService) Create(conversationID, role, modelID string) (*models.Message, error) {
	seq, err := s.repo.GetLastSequence(conversationID)
	if err != nil {
		return nil, err
	}

	m := &models.Message{
		ConversationID: conversationID,
		Role:           role,
		ModelID:        modelID,
		SequenceOrder:  seq + 1,
	}
	if err := s.repo.Create(m); err != nil {
		return nil, err
	}
	return m, nil
}

func (s *MessageService) GetByID(id string) (*models.Message, error) {
	return s.repo.GetByID(id)
}

func (s *MessageService) GetByConversationID(conversationID string) ([]*models.Message, error) {
	return s.repo.GetByConversationID(conversationID)
}

func (s *MessageService) Update(id, role, modelID string, inputTokens, outputTokens int) error {
	m, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}
	m.Role = role
	m.ModelID = modelID
	m.InputTokens = inputTokens
	m.OutputTokens = outputTokens
	return s.repo.Update(m)
}

func (s *MessageService) UpdateTokens(id string, inputTokens, outputTokens int) error {
	m, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}
	m.InputTokens = inputTokens
	m.OutputTokens = outputTokens
	return s.repo.Update(m)
}

func (s *MessageService) Delete(id string) error {
	return s.repo.Delete(id)
}

func (s *MessageService) DeleteByConversationID(conversationID string) error {
	return s.repo.DeleteByConversationID(conversationID)
}
