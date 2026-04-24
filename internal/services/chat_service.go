package services

import (
	"context"
	"encoding/json"
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
	agentService        *AgentService
	app                 *application.App
	streamManager       *StreamManager
}

func NewChatService(
	conversationService *ConversationService,
	messageService *MessageService,
	messageBlockService *MessageBlockService,
	modelService *ModelService,
	agentService *AgentService,
) *ChatService {
	return &ChatService{
		conversationService: conversationService,
		messageService:      messageService,
		messageBlockService: messageBlockService,
		modelService:        modelService,
		agentService:        agentService,
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
// thinkingLevel: "" (no thinking), "low", "medium", "high"
func (s *ChatService) SendMessageStream(conversationID, userInput, modelID, agentID, thinkingLevel string) (string, error) {
	// Get model config
	modelConfig, err := s.modelService.GetByID(modelID)
	if err != nil {
		return "", err
	}

	// Get agent config
	agentConfig, err := s.agentService.GetByID(agentID)
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

	go s.runStreamingInBackground(conversationID, agentMsg.ID, modelConfig, agentConfig, apiKey, userInput, provider.ThinkingLevel(thinkingLevel))

	return agentMsg.ID, nil
}

func (s *ChatService) runStreamingInBackground(conversationID, messageID string, modelConfig *models.Model, agentConfig *models.Agent, apiKey, userInput string, thinkingLevel provider.ThinkingLevel) {
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

	// Build conversation history from database
	history, err := s.buildConversationHistory(conversationID, messageID)
	if err != nil {
		// Continue without history if there's an error
		history = nil
	}

	// Build system prompt
	systemPrompt := s.buildSystemPrompt(agentConfig)

	// Create agent with builder pattern
	builder := agent.New().
		WithProvider(p).
		WithModel(modelConfig.ModelID).
		WithSystemPrompt(systemPrompt)
	if thinkingLevel != "" {
		builder = builder.WithThinkingLevel(thinkingLevel)
	}
	if len(history) > 0 {
		builder = builder.WithHistory(history)
	}
	a, err := builder.Build()
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

	// Generate title in background if needed
	conv, _ := s.conversationService.GetByID(conversationID)
	if conv != nil && (conv.Title == "New Chat" || conv.Title == "") {
		go s.generateTitleFromInput(conversationID, userInput, modelConfig, apiKey)
	}

	// Process stream events
	for block := range streamCh {
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

// buildConversationHistory retrieves all messages from the database and converts them to provider.Message format
func (s *ChatService) buildConversationHistory(conversationID, excludeMessageID string) ([]provider.Message, error) {
	// Get all messages for this conversation
	messages, err := s.messageService.GetByConversationID(conversationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages: %w", err)
	}

	var history []provider.Message

	for _, msg := range messages {
		// Skip the message we're currently generating (excludeMessageID is the assistant message)
		// Also skip any pending/streaming messages
		if msg.ID == excludeMessageID || msg.Status == models.MessageStatusPending || msg.Status == models.MessageStatusStreaming {
			continue
		}

		// Only include completed messages
		if msg.Status != models.MessageStatusCompleted {
			continue
		}

		// Get message blocks
		blocks, err := s.messageBlockService.GetByMessageID(msg.ID)
		if err != nil {
			continue
		}

		// Convert blocks to provider.Message
		providerMsg := s.convertBlocksToProviderMessage(msg.Role, blocks)
		if providerMsg != nil {
			history = append(history, *providerMsg)
		}
	}

	return history, nil
}

// convertBlocksToProviderMessage converts message blocks to a provider.Message
func (s *ChatService) convertBlocksToProviderMessage(role string, blocks []*models.MessageBlock) *provider.Message {
	if len(blocks) == 0 {
		return nil
	}

	msg := &provider.Message{
		Role: provider.Role(role),
	}

	var textContent string
	var toolCalls []provider.ToolCall
	var toolResults []provider.ToolResult

	for _, block := range blocks {
		switch block.BlockType {
		case models.BlockTypeText:
			textContent += block.Content
		case models.BlockTypeToolUse:
			toolCalls = append(toolCalls, provider.ToolCall{
				ID:    block.ToolUseID,
				Name:  block.ToolName,
				Input: json.RawMessage(block.ToolInput),
			})
		case models.BlockTypeToolResult:
			toolResults = append(toolResults, provider.ToolResult{
				ToolCallID: block.ToolUseID,
				Content:    block.ToolResult,
				IsError:    block.IsError,
			})
		}
	}

	msg.Content = textContent
	msg.ToolCalls = toolCalls
	msg.ToolResults = toolResults

	return msg
}

func (s *ChatService) buildProvider(ctx context.Context, modelConfig *models.Model, apiKey string) (provider.Provider, error) {
	switch modelConfig.Provider {
	case "openai":
		opts := []openai.Option{openai.WithBaseURL(modelConfig.BaseURL)}
		// Check metadata for reasoning_effort support (default: true for backward compatibility)
		if s.getMetadataBool(modelConfig.Metadata, "reasoning_effort", true) {
			opts = append(opts, openai.WithReasoningEffort(true))
		}
		return openai.New(apiKey, nil, opts...), nil
	case "anthropic":
		return anthropic.New(apiKey, nil, anthropic.WithBaseURL(modelConfig.BaseURL)), nil
	case "gemini":
		return google.New(apiKey, nil, google.WithBaseURL(modelConfig.BaseURL)), nil
	default:
		return nil, fmt.Errorf("unknown provider: %s", modelConfig.Provider)
	}
}

func (s *ChatService) getMetadataBool(metadata string, key string, defaultVal bool) bool {
	if metadata == "" {
		return defaultVal
	}
	var m map[string]interface{}
	if err := json.Unmarshal([]byte(metadata), &m); err != nil {
		return defaultVal
	}
	if v, ok := m[key]; ok {
		if b, ok := v.(bool); ok {
			return b
		}
	}
	return defaultVal
}

func (s *ChatService) truncate(c string, maxLen int) string {
	if len(c) <= maxLen {
		return c
	}
	return c[:maxLen] + "..."
}

// GenerateTitle generates a title for a conversation based on its messages
func (s *ChatService) GenerateTitle(conversationID string) (string, error) {

	// Get conversation to find the model
	conv, err := s.conversationService.GetByID(conversationID)
	if err != nil {
		return "", err
	}

	// Get messages
	msgs, err := s.messageService.GetByConversationID(conversationID)
	if err != nil {
		return "", err
	}

	// Build a summary of the conversation
	var summary string
	for _, msg := range msgs {
		if msg == nil {
			continue
		}
		blocks, err := s.messageBlockService.GetByMessageID(msg.ID)
		if err != nil {
			continue
		}
		for _, block := range blocks {
			if block != nil && (block.BlockType == "text" || block.BlockType == "user_input") {
				summary += block.Content + "\n"
			}
		}
		if len(summary) > 500 {
			break
		}
	}

	if summary == "" {
		return "", fmt.Errorf("no text content to generate title")
	}

	// Use default model to generate title
	modelID := conv.ModelID
	if modelID == "" {
		// Get first available model
		models, err := s.modelService.GetAll()
		if err != nil || len(models) == 0 {
			return "", fmt.Errorf("no model available for title generation")
		}
		modelID = models[0].ID
	}

	modelConfig, err := s.modelService.GetByID(modelID)
	if err != nil {
		return "", fmt.Errorf("failed to get model config: %w", err)
	}

	apiKey, err := s.modelService.GetDecryptedAPIKey(modelID)
	if err != nil {
		return "", fmt.Errorf("failed to get API key: %w", err)
	}

	// Build provider
	p, err := s.buildProvider(context.Background(), modelConfig, apiKey)
	if err != nil {
		return "", fmt.Errorf("failed to build provider: %w", err)
	}

	// Create agent for title generation
	a, err := agent.New().
		WithProvider(p).
		WithModel(modelConfig.ModelID).
		WithSystemPrompt("You are a helpful assistant. Generate a short title (max 50 chars) for the given conversation. Return ONLY the title, no quotes or extra text.").
		WithMaxIter(1).
		Build()
	if err != nil {
		return "", fmt.Errorf("failed to build agent: %w", err)
	}
	defer a.Close()

	// Run to generate title
	prompt := fmt.Sprintf("Generate a title for this conversation:\n%s", s.truncate(summary, 500))
	result, err := a.Run(context.Background(), prompt)
	if err != nil {
		return "", fmt.Errorf("title generation failed: %w", err)
	}

	title := result.Output
	if title == "" {
		return "", fmt.Errorf("title generation returned empty")
	}

	// Update conversation title
	if err := s.conversationService.UpdateTitle(conversationID, title); err != nil {
		return "", err
	}

	return title, nil
}

// generateTitleFromInput generates a conversation title from user input in background
func (s *ChatService) generateTitleFromInput(conversationID, userInput string, modelConfig *models.Model, apiKey string) {
	p, err := s.buildProvider(context.Background(), modelConfig, apiKey)
	if err != nil {
		return
	}

	a, err := agent.New().
		WithProvider(p).
		WithModel(modelConfig.ModelID).
		WithSystemPrompt("You are a helpful assistant. Generate a short title (max 50 chars) for the user's input. Return ONLY the title, no quotes or extra text.").
		WithMaxIter(1).
		Build()
	if err != nil {
		return
	}
	defer a.Close()

	prompt := fmt.Sprintf("Generate a title for this user input:\n%s", s.truncate(userInput, 200))
	result, err := a.Run(context.Background(), prompt)
	if err != nil {
		return
	}

	title := result.Output
	if title == "" {
		return
	}

	// Update conversation title
	if err := s.conversationService.UpdateTitle(conversationID, title); err != nil {
		return
	}

}

// buildSystemPrompt constructs the system prompt based on agent configuration
func (s *ChatService) buildSystemPrompt(agentConfig *models.Agent) string {
	currentDate := time.Now().Format("2006-01-02")

	// Base prompt
	prompt := fmt.Sprintf("You are %s, running in the xAssistant app. You are a helpful assistant skilled at using tools to solve problems.", agentConfig.Name)

	// Add agent description if not empty
	if agentConfig.Description != "" {
		prompt += fmt.Sprintf(" %s.", agentConfig.Description)
	}

	// Add agents_md if not empty
	if agentConfig.AgentsMD != "" {
		prompt += fmt.Sprintf(" %s.", agentConfig.AgentsMD)
	}

	// Add soul_md if not empty
	if agentConfig.SoulMD != "" {
		prompt += fmt.Sprintf(" %s.", agentConfig.SoulMD)
	}

	// Add profile_md if not empty
	if agentConfig.ProfileMD != "" {
		prompt += fmt.Sprintf(" %s.", agentConfig.ProfileMD)
	}

	// Add memory_md if not empty
	if agentConfig.MemoryMD != "" {
		prompt += fmt.Sprintf(" %s.", agentConfig.MemoryMD)
	}

	// Add current date
	prompt += fmt.Sprintf(" Today's date is %s.", currentDate)

	return prompt
}
