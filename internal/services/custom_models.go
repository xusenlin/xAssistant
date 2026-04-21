package services

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/nlpodyssey/openai-agents-go/agents"
	"github.com/nlpodyssey/openai-agents-go/usage"
	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/packages/param"
	"github.com/openai/openai-go/v2/responses"
	"github.com/openai/openai-go/v2/shared/constant"
)

// AnthropicModel implements agents.Model for Anthropic API
type AnthropicModel struct {
	Model      string
	BaseURL    string
	APIKey     string
	HTTPClient *http.Client
}

func NewAnthropicModel(model, baseURL, apiKey string) *AnthropicModel {
	return &AnthropicModel{
		Model:      model,
		BaseURL:    strings.TrimSuffix(baseURL, "/"),
		APIKey:     apiKey,
		HTTPClient: &http.Client{},
	}
}

func (m *AnthropicModel) GetResponse(ctx context.Context, params agents.ModelResponseParams) (*agents.ModelResponse, error) {
	reqBody := m.buildAnthropicRequest(params, false)

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", m.BaseURL+"/v1/messages", strings.NewReader(string(body)))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	m.setHeaders(req)

	resp, err := m.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Anthropic API error: %s", string(bodyBytes))
	}

	return m.parseAnthropicResponse(resp.Body)
}

func (m *AnthropicModel) StreamResponse(ctx context.Context, params agents.ModelResponseParams, yield agents.ModelStreamResponseCallback) error {
	reqBody := m.buildAnthropicRequest(params, true)

	body, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", m.BaseURL+"/v1/messages", strings.NewReader(string(body)))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	m.setHeaders(req)

	resp, err := m.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Anthropic API error: %s", string(bodyBytes))
	}

	return m.streamAnthropicResponse(resp.Body, yield)
}

func (m *AnthropicModel) setHeaders(req *http.Request) {
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", m.APIKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("anthropic-dangerous-direct-browser-access", "true")
}

func (m *AnthropicModel) buildAnthropicRequest(params agents.ModelResponseParams, stream bool) anthropicRequest {
	req := anthropicRequest{
		Model:     m.Model,
		MaxTokens: 4096,
		Stream:    stream,
	}

	if params.SystemInstructions.Valid() {
		req.System = params.SystemInstructions.Value
	}

	// Convert Input to messages
	messages := agents.ItemHelpers().InputToNewInputList(params.Input)
	for _, msg := range messages {
		if msg.OfMessage != nil {
			role := string(msg.OfMessage.Role)
			content := ""
			if msg.OfMessage.Content.OfString.Valid() {
				content = msg.OfMessage.Content.OfString.Value
			}
			req.Messages = append(req.Messages, anthropicMessage{
				Role:    role,
				Content: content,
			})
		}
	}

	return req
}

func (m *AnthropicModel) parseAnthropicResponse(body io.Reader) (*agents.ModelResponse, error) {
	var resp anthropicResponse
	if err := json.NewDecoder(body).Decode(&resp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	content := ""
	for _, block := range resp.Content {
		if block.Type == "text" {
			content += block.Text
		}
	}

	return &agents.ModelResponse{
		Output: []responses.ResponseOutputItemUnion{
			{
				ID:     "anth_" + resp.ID,
				Type:   "message",
				Role:   constant.ValueOf[constant.Assistant](),
				Status: "completed",
				Content: []responses.ResponseOutputMessageContentUnion{
					{Type: "output_text", Text: content},
				},
			},
		},
		Usage: &usage.Usage{
			InputTokens:  uint64(resp.Usage.InputTokens),
			OutputTokens: uint64(resp.Usage.OutputTokens),
		},
	}, nil
}

func (m *AnthropicModel) streamAnthropicResponse(body io.Reader, yield agents.ModelStreamResponseCallback) error {
	reader := bufio.NewReader(body)
	var fullContent strings.Builder
	seqNum := int64(0)

	// Send created event
	yield(context.Background(), responses.ResponseStreamEventUnion{
		Type:           "response.created",
		SequenceNumber:  seqNum,
	})
	seqNum++

	for {
		line, err := reader.ReadString('\n')
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("error reading stream: %w", err)
		}

		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "data: ") {
			continue
		}

		data := strings.TrimPrefix(line, "data: ")
		if data == "[DONE]" {
			break
		}

		var event map[string]interface{}
		if err := json.Unmarshal([]byte(data), &event); err != nil {
			continue
		}

		eventType, _ := event["type"].(string)
		switch eventType {
		case "content_block_start":
			// Send output item added
			yield(context.Background(), responses.ResponseStreamEventUnion{
				Type:           "response.output_item.added",
				SequenceNumber: seqNum,
				OutputIndex:    0,
				Item: responses.ResponseOutputItemUnion{
					ID:     "anth_stream",
					Type:   "message",
					Role:   constant.ValueOf[constant.Assistant](),
					Status: "in_progress",
				},
			})
			seqNum++

			// Send content part added
			yield(context.Background(), responses.ResponseStreamEventUnion{
				Type:           "response.content_part.added",
				SequenceNumber: seqNum,
				OutputIndex:    0,
				ContentIndex:   0,
				ItemID:         "anth_stream",
				Part: responses.ResponseStreamEventUnionPart{
					Type: "output_text",
					Text: "",
				},
			})
			seqNum++

		case "content_block_delta":
			if delta, ok := event["delta"].(map[string]interface{}); ok {
				if delta["type"] == "text_delta" {
					if text, ok := delta["text"].(string); ok {
						fullContent.WriteString(text)
						yield(context.Background(), responses.ResponseStreamEventUnion{
							Type:           "response.output_text.delta",
							SequenceNumber: seqNum,
							Delta:          text,
							ContentIndex:   0,
							ItemID:         "anth_stream",
							OutputIndex:    0,
						})
						seqNum++
					}
				}
			}

		case "message_delta":
			// Send content part done
			yield(context.Background(), responses.ResponseStreamEventUnion{
				Type:           "response.content_part.done",
				SequenceNumber: seqNum,
				OutputIndex:    0,
				ContentIndex:   0,
				ItemID:         "anth_stream",
				Part: responses.ResponseStreamEventUnionPart{
					Type: "output_text",
					Text: fullContent.String(),
				},
			})
			seqNum++

		case "message_stop":
			// Send output item done
			yield(context.Background(), responses.ResponseStreamEventUnion{
				Type:           "response.output_item.done",
				SequenceNumber: seqNum,
				OutputIndex:    0,
				Item: responses.ResponseOutputItemUnion{
					ID:     "anth_stream",
					Type:   "message",
					Role:   constant.ValueOf[constant.Assistant](),
					Status: "completed",
					Content: []responses.ResponseOutputMessageContentUnion{
						{Type: "output_text", Text: fullContent.String()},
					},
				},
			})
			seqNum++

			// Send completed
			yield(context.Background(), responses.ResponseStreamEventUnion{
				Type:     "response.completed",
				Response: responses.Response{Output: []responses.ResponseOutputItemUnion{{}}},
			})
		}
	}

	return nil
}

type anthropicRequest struct {
	Model       string              `json:"model"`
	Messages    []anthropicMessage  `json:"messages"`
	System      string              `json:"system,omitempty"`
	MaxTokens   int                 `json:"max_tokens"`
	Stream      bool                `json:"stream,omitempty"`
}

type anthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type anthropicResponse struct {
	ID          string             `json:"id"`
	Type        string             `json:"type"`
	Role        string             `json:"role"`
	Content     []anthropicContent `json:"content"`
	Model       string             `json:"model"`
	StopReason  string             `json:"stop_reason"`
	Usage       anthropicUsage     `json:"usage"`
}

type anthropicContent struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type anthropicUsage struct {
	InputTokens  float64 `json:"input_tokens"`
	OutputTokens float64 `json:"output_tokens"`
}

// GoogleModel implements agents.Model for Google AI API
type GoogleModel struct {
	Model      string
	BaseURL    string
	APIKey     string
	HTTPClient *http.Client
}

func NewGoogleModel(model, baseURL, apiKey string) *GoogleModel {
	return &GoogleModel{
		Model:      model,
		BaseURL:    strings.TrimSuffix(baseURL, "/"),
		APIKey:     apiKey,
		HTTPClient: &http.Client{},
	}
}

func (m *GoogleModel) GetResponse(ctx context.Context, params agents.ModelResponseParams) (*agents.ModelResponse, error) {
	reqBody := m.buildGoogleRequest(params, false)

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/v1beta/models/%s:generateContent?key=%s", m.BaseURL, m.Model, m.APIKey)
	req, err := http.NewRequestWithContext(ctx, "POST", url, strings.NewReader(string(body)))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := m.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Google API error: %s", string(bodyBytes))
	}

	return m.parseGoogleResponse(resp.Body)
}

func (m *GoogleModel) StreamResponse(ctx context.Context, params agents.ModelResponseParams, yield agents.ModelStreamResponseCallback) error {
	reqBody := m.buildGoogleRequest(params, true)

	body, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/v1beta/models/%s:streamGenerateContent?key=%s&alt=sse", m.BaseURL, m.Model, m.APIKey)
	req, err := http.NewRequestWithContext(ctx, "POST", url, strings.NewReader(string(body)))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := m.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Google API error: %s", string(bodyBytes))
	}

	return m.streamGoogleResponse(resp.Body, yield)
}

func (m *GoogleModel) buildGoogleRequest(params agents.ModelResponseParams, stream bool) googleRequest {
	req := googleRequest{
		Contents: []googleContent{},
		Stream:   stream,
	}

	if params.SystemInstructions.Valid() {
		req.SystemInstruction = &googlePart{Text: params.SystemInstructions.Value}
	}

	// Convert Input to contents
	messages := agents.ItemHelpers().InputToNewInputList(params.Input)
	for _, msg := range messages {
		if msg.OfMessage != nil {
			role := string(msg.OfMessage.Role)
			content := ""
			if msg.OfMessage.Content.OfString.Valid() {
				content = msg.OfMessage.Content.OfString.Value
			}
			req.Contents = append(req.Contents, googleContent{
				Role: role,
				Parts: []googlePart{{Text: content}},
			})
		}
	}

	return req
}

func (m *GoogleModel) parseGoogleResponse(body io.Reader) (*agents.ModelResponse, error) {
	var resp googleResponse
	if err := json.NewDecoder(body).Decode(&resp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	content := ""
	for _, candidate := range resp.Candidates {
		for _, part := range candidate.Content.Parts {
			content += part.Text
		}
	}

	var u *usage.Usage
	if resp.UsageMetadata != nil {
		u = &usage.Usage{
			InputTokens:  uint64(resp.UsageMetadata.PromptTokenCount),
			OutputTokens: uint64(resp.UsageMetadata.CandidatesTokenCount),
		}
	}

	return &agents.ModelResponse{
		Output: []responses.ResponseOutputItemUnion{
			{
				ID:     "goog_" + resp.ModelVersion,
				Type:   "message",
				Role:   constant.ValueOf[constant.Assistant](),
				Status: "completed",
				Content: []responses.ResponseOutputMessageContentUnion{
					{Type: "output_text", Text: content},
				},
			},
		},
		Usage: u,
	}, nil
}

func (m *GoogleModel) streamGoogleResponse(body io.Reader, yield agents.ModelStreamResponseCallback) error {
	reader := bufio.NewReader(body)
	var fullContent strings.Builder
	seqNum := int64(0)

	// Send created event
	yield(context.Background(), responses.ResponseStreamEventUnion{
		Type:           "response.created",
		SequenceNumber:  seqNum,
	})
	seqNum++

	for {
		line, err := reader.ReadString('\n')
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("error reading stream: %w", err)
		}

		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "data: ") {
			continue
		}

		data := strings.TrimPrefix(line, "data: ")
		var chunk googleChunk
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			continue
		}

		for _, candidate := range chunk.Candidates {
			for _, part := range candidate.Content.Parts {
				if part.Text != "" {
					fullContent.WriteString(part.Text)
					yield(context.Background(), responses.ResponseStreamEventUnion{
						Type:           "response.output_text.delta",
						SequenceNumber: seqNum,
						Delta:          part.Text,
						ContentIndex:   0,
						ItemID:         "goog_stream",
						OutputIndex:    0,
					})
					seqNum++
				}
			}
		}
	}

	// Send content part done
	yield(context.Background(), responses.ResponseStreamEventUnion{
		Type:           "response.content_part.done",
		SequenceNumber: seqNum,
		OutputIndex:    0,
		ContentIndex:   0,
		ItemID:         "goog_stream",
		Part: responses.ResponseStreamEventUnionPart{
			Type: "output_text",
			Text: fullContent.String(),
		},
	})
	seqNum++

	// Send completed
	yield(context.Background(), responses.ResponseStreamEventUnion{
		Type:     "response.completed",
		Response: responses.Response{Output: []responses.ResponseOutputItemUnion{{}}},
	})

	return nil
}

type googleRequest struct {
	Contents         []googleContent `json:"contents"`
	SystemInstruction *googlePart   `json:"systemInstruction,omitempty"`
	Stream           bool           `json:"stream,omitempty"`
}

type googleContent struct {
	Role  string       `json:"role,omitempty"`
	Parts []googlePart `json:"parts"`
}

type googlePart struct {
	Text string `json:"text,omitempty"`
}

type googleResponse struct {
	Candidates    []googleCandidate `json:"candidates"`
	UsageMetadata *googleUsage     `json:"usageMetadata,omitempty"`
	ModelVersion  string           `json:"modelVersion,omitempty"`
}

type googleCandidate struct {
	Content googleContent `json:"content"`
}

type googleUsage struct {
	PromptTokenCount     float64 `json:"promptTokenCount,omitempty"`
	CandidatesTokenCount float64 `json:"candidatesTokenCount,omitempty"`
}

type googleChunk struct {
	Candidates    []googleCandidate `json:"candidates,omitempty"`
	UsageMetadata *googleUsage     `json:"usageMetadata,omitempty"`
}

// ModelConfig holds model configuration
type ModelConfig struct {
	ModelID string
	BaseURL string
}

// ModelFactory creates the appropriate model based on BaseURL
func ModelFactory(modelConfig *ModelConfig, apiKey string) agents.Model {
	baseURL := strings.ToLower(modelConfig.BaseURL)

	// Detect provider from URL
	if strings.Contains(baseURL, "anthropic") || strings.Contains(baseURL, "api.anthropic") {
		return NewAnthropicModel(modelConfig.ModelID, modelConfig.BaseURL, apiKey)
	}

	if strings.Contains(baseURL, "google") || strings.Contains(baseURL, "generativelanguage") ||
		strings.Contains(baseURL, "aiplatform") || strings.Contains(baseURL, "vertexai") {
		return NewGoogleModel(modelConfig.ModelID, modelConfig.BaseURL, apiKey)
	}

	// Default to OpenAI-compatible
	client := agents.NewOpenaiClient(
		param.NewOpt(modelConfig.BaseURL),
		param.NewOpt(apiKey),
	)
	return agents.NewOpenAIChatCompletionsModel(
		openai.ChatModel(modelConfig.ModelID),
		client,
	)
}
