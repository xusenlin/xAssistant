package services

import (
	"context"
	"fmt"
	"log"
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
	streamManager       *StreamManager
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
		streamManager:       NewStreamManager(),
	}
}

// ServiceStartup is called when the service is registered
func (s *ChatService) ServiceStartup(ctx context.Context, options application.ServiceOptions) error {
	s.app = application.Get()
	return nil
}

// Subscribe returns the current stream buffer for a message
func (s *ChatService) Subscribe(messageID string) (*StreamSnapshot, error) {
	return s.streamManager.GetSnapshot(messageID)
}

// emitStreamEvent sends a stream event to the frontend
func (s *ChatService) emitStreamEvent(messageID string, event StreamEvent) {
	if s.app == nil {
		return
	}
	s.app.Event.Emit(fmt.Sprintf("chat:stream:%s", messageID), event)
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

	// Create stream buffer
	s.streamManager.Create(agentMsg.ID)

	go s.runStreamingInBackground(conversationID, agentMsg.ID, modelConfig, apiKey, userInput)

	return agentMsg.ID, nil
}

func (s *ChatService) runStreamingInBackground(conversationID, messageID string, modelConfig *models.Model, apiKey, userInput string) {
	// Cleanup buffer when done
	defer s.streamManager.Delete(messageID)

	// Run with streaming
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	// Build provider
	p, err := s.buildProvider(ctx, modelConfig, apiKey)
	if err != nil {
		s.emitStreamEvent(messageID, StreamEvent{Type: "error", Error: err.Error()})
		s.messageService.UpdateStatus(messageID, models.MessageStatusFailed)
		return
	}

	// Create agent with builder pattern
	// Enable thinking mode by default for supported models
	thinkingLevel := provider.ThinkingLevelMedium
	a, err := agent.New().
		WithProvider(p).
		WithModel(modelConfig.ModelID).
		WithSystemPrompt("You are a helpful assistant.").
		WithThinkingLevel(thinkingLevel).
		Build()
	if err != nil {
		s.emitStreamEvent(messageID, StreamEvent{Type: "error", Error: err.Error()})
		s.messageService.UpdateStatus(messageID, models.MessageStatusFailed)
		return
	}
	defer a.Close()

	streamCh, err := a.RunStream(ctx, userInput)
	if err != nil {
		s.emitStreamEvent(messageID, StreamEvent{Type: "error", Error: err.Error()})
		s.messageService.UpdateStatus(messageID, models.MessageStatusFailed)
		return
	}
	s.messageService.UpdateStatus(messageID, models.MessageStatusStreaming)

	// Get stream buffer
	buffer, exists := s.streamManager.Get(messageID)
	if !exists {
		s.emitStreamEvent(messageID, StreamEvent{Type: "error", Error: "stream buffer not found"})
		s.messageService.UpdateStatus(messageID, models.MessageStatusFailed)
		return
	}

	// Process stream events
	for block := range streamCh {
		log.Printf("[CHAT] Block type=%s, delta=%q\n", block.Type, block.Delta)
		switch block.Type {
		case agent.BlockThinkStart:
			s.emitStreamEvent(messageID, StreamEvent{Type: "block_start", BlockType: "thinking"})

		case agent.BlockThinkStream:
			buffer.AppendDelta("thinking", block.Delta)
			s.emitStreamEvent(messageID, StreamEvent{
				Type:      "delta",
				BlockType: "thinking",
				Delta:     block.Delta,
				Content:   buffer.Current.Content,
			})

		case agent.BlockThinkEnd:
			buffer.FinishBlock("thinking", block.Full)
			s.messageBlockService.CreateThinkingBlock(messageID, block.Full)
			s.emitStreamEvent(messageID, StreamEvent{
				Type:      "block_end",
				BlockType: "thinking",
				Content:   block.Full,
			})

		case agent.BlockTextStart:
			s.emitStreamEvent(messageID, StreamEvent{Type: "block_start", BlockType: "text"})

		case agent.BlockTextStream:
			buffer.AppendDelta("text", block.Delta)
			s.emitStreamEvent(messageID, StreamEvent{
				Type:      "delta",
				BlockType: "text",
				Delta:     block.Delta,
				Content:   buffer.Current.Content,
			})

		case agent.BlockTextEnd:
			buffer.FinishBlock("text", block.Full)
			s.messageBlockService.CreateTextBlock(messageID, block.Full)
			s.emitStreamEvent(messageID, StreamEvent{
				Type:      "block_end",
				BlockType: "text",
				Content:   block.Full,
			})

		case agent.BlockToolCall:
			buffer.FinishToolBlock("tool_use", block.ToolID, block.ToolName, block.Payload, false)
			s.messageBlockService.CreateToolUseBlock(messageID, block.ToolID, block.ToolName, block.Payload)
			s.emitStreamEvent(messageID, StreamEvent{
				Type:      "block_end",
				BlockType: "tool_use",
				Content:   block.Payload,
			})

		case agent.BlockToolResult:
			buffer.FinishToolBlock("tool_result", block.ToolID, block.ToolName, s.truncate(block.Payload, 500), false)
			s.messageBlockService.CreateToolResultBlock(messageID, block.ToolID, block.ToolName, s.truncate(block.Payload, 500), false)
			s.emitStreamEvent(messageID, StreamEvent{
				Type:      "block_end",
				BlockType: "tool_result",
				Content:   block.Payload,
			})

		case agent.BlockFinish:
			s.messageService.UpdateStatus(messageID, models.MessageStatusCompleted)
			s.messageService.UpdateTokens(messageID, block.InputTokens, block.OutputTokens)
			s.conversationService.IncrementTokenCount(conversationID, block.InputTokens, block.OutputTokens)
			s.emitStreamEvent(messageID, StreamEvent{Type: "complete"})

		case agent.BlockError:
			s.messageBlockService.CreateErrorTextBlock(messageID, fmt.Sprintf("错误 #%d: %s", block.Iteration, block.Full))
			s.messageService.UpdateStatus(messageID, models.MessageStatusCompleted)
			s.emitStreamEvent(messageID, StreamEvent{Type: "error", Error: block.Full})
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
