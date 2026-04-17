package models

type StatSummary struct {
	ModelID       string `json:"model_id"`
	InputTokens   int64  `json:"input_tokens"`
	OutputTokens  int64  `json:"output_tokens"`
	Conversations int    `json:"conversations"`
	APIErrors     int    `json:"api_errors"`
	AvgRespTimeMs int64  `json:"avg_resp_time_ms"`
	RequestCount  int    `json:"request_count"`
}
