package dao

import (
	"xAssistant/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ModelStatDAO struct {
	db *gorm.DB
}

func NewModelStatDAO(db *gorm.DB) *ModelStatDAO {
	return &ModelStatDAO{db: db}
}

func (d *ModelStatDAO) GetByModelAndDate(modelID, date string) (*models.ModelStat, error) {
	var stat models.ModelStat
	err := d.db.Where("model_id = ? AND date = ?", modelID, date).First(&stat).Error
	if err != nil {
		return nil, err
	}
	return &stat, nil
}

func (d *ModelStatDAO) UpsertByModelAndDate(modelID, date string, inputTokens, outputTokens int64, respTimeMs int64, isError bool, conversationInc int) error {
	stat, err := d.GetByModelAndDate(modelID, date)
	if err == gorm.ErrRecordNotFound {
		stat = &models.ModelStat{
			ID:            uuid.New().String(),
			ModelID:       modelID,
			Date:          date,
			InputTokens:   inputTokens,
			OutputTokens:  outputTokens,
			Conversations: conversationInc,
			APIErrors:     boolToInt(isError),
			TotalRespTime: respTimeMs,
			RequestCount:  1,
		}
		return d.db.Create(stat).Error
	}
	if err != nil {
		return err
	}

	stat.InputTokens += inputTokens
	stat.OutputTokens += outputTokens
	stat.TotalRespTime += respTimeMs
	stat.RequestCount++
	stat.Conversations += conversationInc
	if isError {
		stat.APIErrors++
	}
	return d.db.Save(stat).Error
}

func (d *ModelStatDAO) GetAllGroupByModel() ([]*models.ModelStat, error) {
	var results []*models.ModelStat
	err := d.db.Model(&models.ModelStat{}).
		Select("model_id, SUM(input_tokens) as input_tokens, SUM(output_tokens) as output_tokens, SUM(conversations) as conversations, SUM(api_errors) as api_errors, SUM(total_resp_time) as total_resp_time, SUM(request_count) as request_count").
		Group("model_id").
		Order("input_tokens DESC").
		Find(&results).Error
	return results, err
}

func (d *ModelStatDAO) GetByDateRange(startDate, endDate string) ([]*models.ModelStat, error) {
	var results []*models.ModelStat
	err := d.db.Model(&models.ModelStat{}).
		Select("model_id, SUM(input_tokens) as input_tokens, SUM(output_tokens) as output_tokens, SUM(conversations) as conversations, SUM(api_errors) as api_errors, SUM(total_resp_time) as total_resp_time, SUM(request_count) as request_count").
		Where("date >= ? AND date <= ?", startDate, endDate).
		Group("model_id").
		Order("input_tokens DESC").
		Find(&results).Error
	return results, err
}

func (d *ModelStatDAO) GetGlobalStats() (*models.ModelStat, error) {
	var result models.ModelStat
	err := d.db.Model(&models.ModelStat{}).
		Select("SUM(input_tokens) as input_tokens, SUM(output_tokens) as output_tokens, SUM(conversations) as conversations, SUM(api_errors) as api_errors, SUM(total_resp_time) as total_resp_time, SUM(request_count) as request_count").
		Take(&result).Error
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (d *ModelStatDAO) GetGlobalStatsByDateRange(startDate, endDate string) (*models.ModelStat, error) {
	var result models.ModelStat
	err := d.db.Model(&models.ModelStat{}).
		Select("SUM(input_tokens) as input_tokens, SUM(output_tokens) as output_tokens, SUM(conversations) as conversations, SUM(api_errors) as api_errors, SUM(total_resp_time) as total_resp_time, SUM(request_count) as request_count").
		Where("date >= ? AND date <= ?", startDate, endDate).
		Take(&result).Error
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
