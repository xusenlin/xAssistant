package services

import "xAssistant/internal/config"

type SettingsService struct {
	cfg *config.Manager
}

func NewSettingsService(cfg *config.Manager) *SettingsService {
	return &SettingsService{cfg: cfg}
}

func (s *SettingsService) GetDBPath() string {
	return s.cfg.GetDBPath()
}
