package services

import (
	"time"

	"xAssistant/internal/models"
)

type ModelStatRepository interface {
	UpsertByModelAndDate(modelID, date string, inputTokens, outputTokens int64, respTimeMs int64, isError bool, conversationInc int) error
	GetAllGroupByModel() ([]*models.ModelStat, error)
	GetByDateRange(startDate, endDate string) ([]*models.ModelStat, error)
	GetGlobalStats() (*models.ModelStat, error)
	GetGlobalStatsByDateRange(startDate, endDate string) (*models.ModelStat, error)
}

type ModelStatService struct {
	repo ModelStatRepository
}

func NewModelStatService(repo ModelStatRepository) *ModelStatService {
	return &ModelStatService{repo: repo}
}

func (s *ModelStatService) RecordUsage(modelID string, inputTokens, outputTokens int64, respTimeMs int64, isError bool, conversationInc int) error {
	date := time.Now().Format("2006-01-02")
	return s.repo.UpsertByModelAndDate(modelID, date, inputTokens, outputTokens, respTimeMs, isError, conversationInc)
}

func (s *ModelStatService) GetStatsByModelID(modelID string) (*models.StatSummary, error) {
	stats, err := s.repo.GetAllGroupByModel()
	if err != nil {
		return nil, err
	}
	for _, st := range stats {
		if st.ModelID == modelID {
			return toSummary(st), nil
		}
	}
	return &models.StatSummary{}, nil
}

func (s *ModelStatService) GetAllStats() ([]*models.StatSummary, error) {
	stats, err := s.repo.GetAllGroupByModel()
	if err != nil {
		return nil, err
	}
	result := make([]*models.StatSummary, len(stats))
	for i, st := range stats {
		result[i] = toSummary(st)
	}
	return result, nil
}

func (s *ModelStatService) GetStatsByDateRange(startDate, endDate string) ([]*models.StatSummary, error) {
	stats, err := s.repo.GetByDateRange(startDate, endDate)
	if err != nil {
		return nil, err
	}
	result := make([]*models.StatSummary, len(stats))
	for i, st := range stats {
		result[i] = toSummary(st)
	}
	return result, nil
}

func (s *ModelStatService) GetGlobalStats() (*models.StatSummary, error) {
	stat, err := s.repo.GetGlobalStats()
	if err != nil {
		return nil, err
	}
	return toSummary(stat), nil
}

func (s *ModelStatService) GetGlobalStatsByDateRange(startDate, endDate string) (*models.StatSummary, error) {
	stat, err := s.repo.GetGlobalStatsByDateRange(startDate, endDate)
	if err != nil {
		return nil, err
	}
	return toSummary(stat), nil
}

func toSummary(st *models.ModelStat) *models.StatSummary {
	avg := int64(0)
	if st.RequestCount > 0 {
		avg = st.TotalRespTime / int64(st.RequestCount)
	}
	return &models.StatSummary{
		ModelID:       st.ModelID,
		InputTokens:   st.InputTokens,
		OutputTokens:  st.OutputTokens,
		Conversations: st.Conversations,
		APIErrors:     st.APIErrors,
		AvgRespTimeMs: avg,
		RequestCount:  st.RequestCount,
	}
}
