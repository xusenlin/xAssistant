package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"xAssistant/internal/dao"
	"xAssistant/internal/models"

	"github.com/nlpodyssey/openai-agents-go/agents"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type ChatService struct {
	conversationRepo *dao.ConversationDAO
	messageRepo     *dao.MessageDAO
	messageBlockRepo *dao.MessageBlockDAO
	modelService   ModelGetter
	app           *application.App
}

type ModelGetter interface {
	GetByID(id string) (*models.Model, error)
	GetDecryptedAPIKey(id string) (string, error)
}

func NewChatService(
	conversationRepo *dao.ConversationDAO,
	messageRepo *dao.MessageDAO,
	messageBlockRepo *dao.MessageBlockDAO,
	modelService ModelGetter,
) *ChatService {
	return &ChatService{
		conversationRepo: conversationRepo,
		messageRepo:      messageRepo,
		messageBlockRepo: messageBlockRepo,
		modelService:     modelService,
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
	conversation, err := s.conversationRepo.GetByID(conversationID)
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

	// Create user message
	userMsg := &models.Message{
		ConversationID: conversationID,
		Role:           "user",
		ModelName:      modelConfig.Name,
	}
	if err := s.messageRepo.Create(userMsg); err != nil {
		return "", err
	}

	// Save user text block
	userBlock := &models.MessageBlock{
		MessageID: userMsg.ID,
		BlockType: "text",
		Content:   userInput,
	}
	if err := s.messageBlockRepo.Create(userBlock); err != nil {
		return "", err
	}

	// Update conversation
	conversation.MessageCount++
	if err := s.conversationRepo.Update(conversation); err != nil {
		return "", err
	}

	// Create assistant message
	agentMsg := &models.Message{
		ConversationID: conversationID,
		Role:           "assistant",
		ModelName:      modelConfig.Name,
	}
	if err := s.messageRepo.Create(agentMsg); err != nil {
		return "", err
	}

	// Create a block for streaming content
	streamingBlock := &models.MessageBlock{
		MessageID: agentMsg.ID,
		BlockType: "text",
		Content:   "",
	}
	if err := s.messageBlockRepo.Create(streamingBlock); err != nil {
		return "", err
	}

	// Run streaming in background
	go s.runStreamingInBackground(agentMsg.ID, streamingBlock, modelConfig, apiKey, userInput)

	return agentMsg.ID, nil
}

func (s *ChatService) runStreamingInBackground(messageID string, block *models.MessageBlock, modelConfig *models.Model, apiKey, userInput string) {
	var fullText strings.Builder

	// Build model
	model := s.buildModel(modelConfig, apiKey)

	// Create agent with builder pattern
	agent := agents.New("assistant").
		WithInstructions("You are a helpful assistant.").
		WithModelInstance(model)

	// Run with streaming
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	seqResult, err := agents.RunStreamedSeq(ctx, agent, userInput)
	if err != nil {
		block.Content = "Error: " + err.Error()
		block.IsError = true
		s.messageBlockRepo.Update(block)
		s.emit("stream:error", map[string]string{
			"messageID": messageID,
			"error":     err.Error(),
		})
		return
	}

	// Process stream events
	for event := range seqResult.Seq {
		switch e := event.(type) {
		case agents.RawResponsesStreamEvent:
			// Text delta from LLM
			if e.Data.Delta != "" {
				fullText.WriteString(e.Data.Delta)
				block.Content = fullText.String()
				s.messageBlockRepo.Update(block)
				s.emit("stream:token", map[string]string{
					"messageID": messageID,
					"token":     e.Data.Delta,
				})
			}
			if e.Data.Type == "response.completed" {
				s.emit("stream:end", map[string]string{
					"messageID": messageID,
				})
			}

		case agents.RunItemStreamEvent:
			switch e.Name {
			case agents.StreamEventToolCalled:
				// Tool call started
				if tc, ok := e.Item.(agents.ToolCallItem); ok {
					toolInput := ""
					if raw, ok := tc.RawItem.(agents.ResponseFunctionToolCall); ok {
						toolInput = raw.Arguments
						s.messageBlockRepo.Create(&models.MessageBlock{
							MessageID: messageID,
							BlockType: "tool_use",
							ToolUseID: raw.CallID,
							ToolName:  raw.Name,
							ToolInput: toolInput,
						})
					}
				}

			case agents.StreamEventToolOutput:
				// Tool call completed
				if tc, ok := e.Item.(agents.ToolCallOutputItem); ok {
					s.messageBlockRepo.Create(&models.MessageBlock{
						MessageID:  messageID,
						BlockType:  "tool_result",
						ToolUseID:  tc.RawItem.(agents.ResponseInputItemFunctionCallOutputParam).CallID,
						ToolResult: fmt.Sprintf("%v", tc.Output),
					})
				}

			case agents.StreamEventMessageOutputCreated:
				// Message output completed
			}
		}
	}

	// Check for errors
	if seqResult.Err != nil {
		block.Content = "Error: " + seqResult.Err.Error()
		block.IsError = true
		s.messageBlockRepo.Update(block)
		s.emit("stream:error", map[string]string{
			"messageID": messageID,
			"error":     seqResult.Err.Error(),
		})
		return
	}

	// Final update
	block.Content = fullText.String()
	s.messageBlockRepo.Update(block)
	s.emit("stream:end", map[string]string{
		"messageID": messageID,
	})
}

func (s *ChatService) buildModel(modelConfig *models.Model, apiKey string) agents.Model {
	return ModelFactory(&ModelConfig{
		ModelID: modelConfig.ModelID,
		BaseURL: modelConfig.BaseURL,
	}, apiKey)
}
