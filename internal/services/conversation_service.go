package services

import (
	"xAssistant/internal/models"
)

type ConversationRepository interface {
	Create(c *models.Conversation) error
	GetByID(id string) (*models.Conversation, error)
	GetAll() ([]*models.Conversation, error)
	GetByAgentID(agentID string) ([]*models.Conversation, error)
	Update(c *models.Conversation) error
	Delete(id string) error
	GetActive() ([]*models.Conversation, error)
	GetPinned() ([]*models.Conversation, error)
}

type ConversationService struct {
	repo ConversationRepository
}

func NewConversationService(repo ConversationRepository) *ConversationService {
	return &ConversationService{repo: repo}
}

func (s *ConversationService) Create(title, agentID, conversationType string) (*models.Conversation, error) {
	c := &models.Conversation{
		Title:   title,
		AgentID: agentID,
		Type:    conversationType,
		Status:  "active",
		Pinned:  false,
	}
	if err := s.repo.Create(c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *ConversationService) GetByID(id string) (*models.Conversation, error) {
	return s.repo.GetByID(id)
}

func (s *ConversationService) GetAll() ([]*models.Conversation, error) {
	return s.repo.GetAll()
}

func (s *ConversationService) GetByAgentID(agentID string) ([]*models.Conversation, error) {
	return s.repo.GetByAgentID(agentID)
}

func (s *ConversationService) GetActive() ([]*models.Conversation, error) {
	return s.repo.GetActive()
}

func (s *ConversationService) GetPinned() ([]*models.Conversation, error) {
	return s.repo.GetPinned()
}

func (s *ConversationService) Update(id, title, conversationType, status string, pinned bool, messageCount, toolCallCount, inputTokens, outputTokens int) error {
	c, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}
	c.Title = title
	c.Type = conversationType
	c.Status = status
	c.Pinned = pinned
	c.MessageCount = messageCount
	c.ToolCallCount = toolCallCount
	c.InputTokens = inputTokens
	c.OutputTokens = outputTokens
	c.TotalTokens = inputTokens + outputTokens
	return s.repo.Update(c)
}

func (s *ConversationService) UpdateTitle(id, title string) error {
	c, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}
	c.Title = title
	return s.repo.Update(c)
}

func (s *ConversationService) TogglePin(id string) error {
	c, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}
	c.Pinned = !c.Pinned
	return s.repo.Update(c)
}

func (s *ConversationService) Archive(id string) error {
	c, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}
	c.Status = "archived"
	return s.repo.Update(c)
}

func (s *ConversationService) Delete(id string) error {
	return s.repo.Delete(id)
}

func (s *ConversationService) IncrementMessageCount(id string) error {
	c, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}
	c.MessageCount++
	return s.repo.Update(c)
}

func (s *ConversationService) IncrementTokenCount(id string, inputTokens, outputTokens int) error {
	c, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}
	c.InputTokens += inputTokens
	c.OutputTokens += outputTokens
	c.TotalTokens = c.InputTokens + c.OutputTokens
	return s.repo.Update(c)
}
