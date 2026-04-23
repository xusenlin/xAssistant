package services

import (
	"context"
	"fmt"
	"time"
	"xAssistant/internal/models"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/xusenlin/go-agent/agent"
	"github.com/xusenlin/go-agent/provider"
	"github.com/xusenlin/go-agent/provider/anthropic"
	"github.com/xusenlin/go-agent/provider/google"
	"github.com/xusenlin/go-agent/provider/openai"
)

type ChatService struct {
	conversationService *ConversationService
	messageService      *MessageService
	messageBlockService *MessageBlockService
	modelService        *ModelService
	app                 *application.App
}

type ModelGetter interface {
	GetByID(id string) (*models.Model, error)
	GetDecryptedAPIKey(id string) (string, error)
}

func NewChatService(
	conversationService *ConversationService,
	messageService *MessageService,
	messageBlockService *MessageBlockService,
	modelService *ModelService,
) *ChatService {
	return &ChatService{
		conversationService: conversationService,
		messageService:      messageService,
		messageBlockService: messageBlockService,
		modelService:        modelService,
	}
}

// ServiceStartup is called when the service is registered
func (s *ChatService) ServiceStartup(ctx context.Context, options application.ServiceOptions) error {
	return nil
}

func (s *ChatService) SetApp(app *application.App) {
	s.app = app
}

func (s *ChatService) emit(name string, data ...any) {
	if s.app != nil {
		s.app.Event.Emit(name, data...)
	}
}

// SendMessageStream sends a message with streaming output
func (s *ChatService) SendMessageStream(conversationID, userInput, modelID string) (string, error) {
	// Get conversation
	conversation, err := s.conversationService.GetByID(conversationID)
	if err != nil {
		return "", err
	}

	// Get model config
	modelConfig, err := s.modelService.GetByID(modelID)
	if err != nil {
		return "", err
	}

	// Get decrypted API key
	apiKey, err := s.modelService.GetDecryptedAPIKey(modelID)
	if err != nil {
		return "", err
	}

	if err := s.saveUserMessage(conversationID, userInput, modelConfig.Name); err != nil {
		return "", err
	}

	// Update conversation
	conversation.MessageCount++
	if err := s.conversationService.repo.Update(conversation); err != nil {
		return "", err
	}

	// Create assistant message

	agentMsg, err := s.messageService.Create(conversationID, "assistant", modelConfig.Name)
	if err != nil {
		return "", err
	}

	// Run streaming in background
	go s.runStreamingInBackground(conversation, agentMsg, modelConfig, apiKey, userInput)

	return agentMsg.ID, nil
}

func (s *ChatService) runStreamingInBackground(conversation *models.Conversation, message *models.Message, modelConfig *models.Model, apiKey, userInput string) {
	// Run with streaming
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	// Build provider
	p, err := s.buildProvider(ctx, modelConfig, apiKey)
	if err != nil {
		//TODO 错误推送
		fmt.Println("Error-117:", err)

		return
	}

	// Create agent with builder pattern
	a, err := agent.New().
		WithProvider(p).
		WithModel(modelConfig.ModelID).
		WithSystemPrompt("You are a helpful assistant.").
		Build()

	if err != nil {
		//TODO 错误推送
		fmt.Println("Error-128:", err)

		return
	}
	defer a.Close()

	streamCh, err := a.RunStream(ctx, userInput)
	if err != nil {
		//TODO 错误推送
		fmt.Println("Error-136:", err)
		return
	}
	// Process stream events
	for block := range streamCh {
		switch block.Type {
		case agent.BlockThinkEnd:
			s.saveBlockSeqIncrement(&models.MessageBlock{
				MessageID: message.ID,
				BlockType: models.BlockTypeThinking,
				Content:   block.Content,
			})
		case agent.BlockTextEnd:
			s.saveBlockSeqIncrement(&models.MessageBlock{
				MessageID: message.ID,
				BlockType: models.BlockTypeText,
				Content:   block.Content,
			})
		case agent.BlockToolCall:
			s.saveBlockSeqIncrement(&models.MessageBlock{
				MessageID: message.ID,
				BlockType: models.BlockTypeToolUse,
				ToolUseID: block.ToolID,
				ToolName:  block.ToolName,
				ToolInput: block.Content,
			})
		case agent.BlockToolResult:
			s.saveBlockSeqIncrement(&models.MessageBlock{
				MessageID: message.ID,
				BlockType: models.BlockTypeToolResult,
				ToolUseID: block.ToolID,
				ToolName:  block.ToolName,
				ToolInput: s.truncate(block.Content, 500),
			})
		case agent.BlockFinish:
			//更新message和conversation
			message.Status = models.MessageStatusCompleted
			message.InputTokens = block.InputTokens
			message.OutputTokens = block.OutputTokens
			s.messageService.repo.Update(message)
			conversation.OutputTokens += block.OutputTokens
			conversation.InputTokens += block.InputTokens
			conversation.TotalTokens += block.InputTokens + block.OutputTokens
			s.conversationService.repo.Update(conversation)
		case agent.BlockError:
			s.saveBlockSeqIncrement(&models.MessageBlock{
				MessageID: message.ID,
				BlockType: models.BlockTypeText,
				Content:   fmt.Sprintf("错误 #%d: %s", block.Iteration, block.Content),
				IsError:   true,
			})
			message.Status = models.MessageStatusCompleted
			s.messageService.repo.Update(message)
		}
	}
}

func (s *ChatService) buildProvider(ctx context.Context, modelConfig *models.Model, apiKey string) (provider.Provider, error) {
	switch modelConfig.Provider {
	case "openai":
		return openai.New(apiKey, nil, openai.WithBaseURL(modelConfig.BaseURL)), nil
	case "anthropic":
		return anthropic.New(apiKey, nil, anthropic.WithBaseURL(modelConfig.BaseURL)), nil
	case "gemini":
		return google.New(apiKey, nil, google.WithBaseURL(modelConfig.BaseURL)), nil
	default:
		return nil, fmt.Errorf("unknown provider: %s", modelConfig.Provider)
	}
}

func (s *ChatService) saveUserMessage(userInput string, conversationID string, modelName string) error {
	userMsg := &models.Message{
		ConversationID: conversationID,
		Role:           "user",
		ModelName:      modelName,
	}
	if err := s.messageService.repo.Create(userMsg); err != nil {
		return err
	}

	// Save user text block
	userBlock := &models.MessageBlock{
		MessageID: userMsg.ID,
		BlockType: "text",
		Content:   userInput,
	}
	if err := s.messageBlockService.repo.Create(userBlock); err != nil {
		return err
	}
	return nil
}
func (s *ChatService) saveBlockSeqIncrement(block *models.MessageBlock) error {
	lastSeq, err := s.messageBlockService.repo.GetLastSequence(block.MessageID)
	if err != nil {
		return err
	}
	block.SequenceOrder = lastSeq + 1
	if err := s.messageBlockService.repo.Create(block); err != nil {
		return err
	}
	return nil
}
func (s *ChatService) truncate(c string, maxLen int) string {
	if len(c) <= maxLen {
		return c
	}
	return c[:maxLen] + "..."
}
