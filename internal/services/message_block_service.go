package services

import (
	"xAssistant/internal/models"
)

type MessageBlockRepository interface {
	Create(b *models.MessageBlock) error
	GetByID(id string) (*models.MessageBlock, error)
	GetByMessageID(messageID string) ([]*models.MessageBlock, error)
	GetByToolUseID(toolUseID string) ([]*models.MessageBlock, error)
	Update(b *models.MessageBlock) error
	Delete(id string) error
	DeleteByMessageID(messageID string) error
	GetLastSequence(messageID string) (int, error)
}

type MessageBlockService struct {
	repo MessageBlockRepository
}

func NewMessageBlockService(repo MessageBlockRepository) *MessageBlockService {
	return &MessageBlockService{repo: repo}
}

func (s *MessageBlockService) CreateTextBlock(messageID, content string) (*models.MessageBlock, error) {
	seq, err := s.repo.GetLastSequence(messageID)
	if err != nil {
		return nil, err
	}

	b := &models.MessageBlock{
		MessageID:     messageID,
		BlockType:     "text",
		SequenceOrder: seq + 1,
		Content:       content,
	}
	if err := s.repo.Create(b); err != nil {
		return nil, err
	}
	return b, nil
}

func (s *MessageBlockService) CreateThinkingBlock(messageID, content string) (*models.MessageBlock, error) {
	seq, err := s.repo.GetLastSequence(messageID)
	if err != nil {
		return nil, err
	}

	b := &models.MessageBlock{
		MessageID:     messageID,
		BlockType:     "thinking",
		SequenceOrder: seq + 1,
		Content:       content,
	}
	if err := s.repo.Create(b); err != nil {
		return nil, err
	}
	return b, nil
}

func (s *MessageBlockService) CreateToolUseBlock(messageID, toolUseID, toolName, toolInput string) (*models.MessageBlock, error) {
	seq, err := s.repo.GetLastSequence(messageID)
	if err != nil {
		return nil, err
	}

	b := &models.MessageBlock{
		MessageID:     messageID,
		BlockType:     "tool_use",
		SequenceOrder: seq + 1,
		ToolUseID:     toolUseID,
		ToolName:      toolName,
		ToolInput:     toolInput,
	}
	if err := s.repo.Create(b); err != nil {
		return nil, err
	}
	return b, nil
}

func (s *MessageBlockService) CreateToolResultBlock(messageID, toolUseID, toolResult string, isError bool) (*models.MessageBlock, error) {
	seq, err := s.repo.GetLastSequence(messageID)
	if err != nil {
		return nil, err
	}

	b := &models.MessageBlock{
		MessageID:     messageID,
		BlockType:     "tool_result",
		SequenceOrder: seq + 1,
		ToolUseID:     toolUseID,
		ToolResult:    toolResult,
		IsError:       isError,
	}
	if err := s.repo.Create(b); err != nil {
		return nil, err
	}
	return b, nil
}

func (s *MessageBlockService) GetByID(id string) (*models.MessageBlock, error) {
	return s.repo.GetByID(id)
}

func (s *MessageBlockService) GetByMessageID(messageID string) ([]*models.MessageBlock, error) {
	return s.repo.GetByMessageID(messageID)
}

func (s *MessageBlockService) GetByToolUseID(toolUseID string) ([]*models.MessageBlock, error) {
	return s.repo.GetByToolUseID(toolUseID)
}

func (s *MessageBlockService) UpdateContent(id, content string) error {
	b, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}
	b.Content = content
	return s.repo.Update(b)
}

func (s *MessageBlockService) UpdateToolResult(id, toolResult string, isError bool) error {
	b, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}
	b.ToolResult = toolResult
	b.IsError = isError
	return s.repo.Update(b)
}

func (s *MessageBlockService) Delete(id string) error {
	return s.repo.Delete(id)
}

func (s *MessageBlockService) DeleteByMessageID(messageID string) error {
	return s.repo.DeleteByMessageID(messageID)
}
