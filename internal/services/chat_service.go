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

// SendMessageStream sends a message with streaming output
func (s *ChatService) SendMessageStream(conversationID, userInput, modelID string) (string, error) {
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

	// Create user message
	userMsg, err := s.messageService.Create(conversationID, "user", modelConfig.Name)
	if err != nil {
		return "", err
	}
	if _, err := s.messageBlockService.CreateTextBlock(userMsg.ID, userInput); err != nil {
		return "", err
	}

	// Update conversation message count
	if err := s.conversationService.IncrementMessageCount(conversationID); err != nil {
		return "", err
	}

	// Create assistant message
	agentMsg, err := s.messageService.Create(conversationID, "assistant", modelConfig.Name)
	if err != nil {
		return "", err
	}
	fmt.Println("[DUBUG]agentMsg:", agentMsg)

	go s.runStreamingInBackground(conversationID, agentMsg.ID, modelConfig, apiKey, userInput)

	return agentMsg.ID, nil
}

func (s *ChatService) runStreamingInBackground(conversationID, messageID string, modelConfig *models.Model, apiKey, userInput string) {
	// Run with streaming
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	// Build provider
	fmt.Println("[DEBUG]modelConfig:", modelConfig.ID, modelConfig.Name, modelConfig.Provider, modelConfig.ModelID, modelConfig.BaseURL)
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

	fmt.Println("[DEBUG]a:", a)
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
	s.messageService.UpdateStatus(messageID, models.MessageStatusStreaming)

	// Process stream events
	for block := range streamCh {
		switch block.Type {
		case agent.BlockThinkEnd:
			s.messageBlockService.CreateThinkingBlock(messageID, block.Full)
			fmt.Println("BlockThinkEnd:", block.Full)
		case agent.BlockTextEnd:
			s.messageBlockService.CreateTextBlock(messageID, block.Full)
			fmt.Println("BlockTextEnd:", block.Full)
		case agent.BlockToolCall:
			s.messageBlockService.CreateToolUseBlock(messageID, block.ToolID, block.ToolName, block.Payload)
			fmt.Println("BlockToolCall:", block.ToolName, block.ToolID, block.Payload)
		case agent.BlockToolResult:
			s.messageBlockService.CreateToolResultBlock(messageID, block.ToolID, block.ToolName, s.truncate(block.Payload, 500), false)
			fmt.Println("BlockToolResult:", block.ToolName, block.ToolID, block.Payload)
		case agent.BlockFinish:
			// Update message status and tokens
			s.messageService.UpdateStatus(messageID, models.MessageStatusCompleted)
			s.messageService.UpdateTokens(messageID, block.InputTokens, block.OutputTokens)
			// Update conversation tokens
			s.conversationService.IncrementTokenCount(conversationID, block.InputTokens, block.OutputTokens)
			fmt.Printf("[DEBUG] BlockFinish: InputTokens=%d, OutputTokens=%d, TotalTokens=%d\n",
				block.InputTokens, block.OutputTokens, block.TotalTokens)
		case agent.BlockError:
			s.messageBlockService.CreateErrorTextBlock(messageID, fmt.Sprintf("错误 #%d: %s", block.Iteration, block.Full))
			// Update message status to completed
			s.messageService.UpdateStatus(messageID, models.MessageStatusCompleted)
			fmt.Println("BlockError:", block.Iteration, block.Full)
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

func (s *ChatService) truncate(c string, maxLen int) string {
	if len(c) <= maxLen {
		return c
	}
	return c[:maxLen] + "..."
}
