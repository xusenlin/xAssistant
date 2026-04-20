package services

import (
	"xAssistant/internal/config"
	"xAssistant/internal/models"
)

type OptionRepository interface {
	Get(key string) (*models.Option, error)
	Set(key, value string) error
	Exists(key string) bool
}

type OptionService struct {
	repo OptionRepository
	cfg  *config.Manager
}

func NewOptionService(repo OptionRepository, cfg *config.Manager) *OptionService {
	return &OptionService{repo: repo, cfg: cfg}
}

const (
	OptionProxyEnabled = "proxy_enabled"
	OptionProxyURL     = "proxy_url"
)

func (s *OptionService) Get(key string) (string, error) {
	opt, err := s.repo.Get(key)
	if err != nil {
		return "", err
	}
	return opt.Value, nil
}

func (s *OptionService) Set(key, value string) error {
	return s.repo.Set(key, value)
}

func (s *OptionService) GetDBPath() string {
	return s.cfg.DBPath
}

func (s *OptionService) InitDefaults() error {
	defaults := map[string]string{
		OptionProxyEnabled: "false",
		OptionProxyURL:     "http://127.0.0.1:7890",
	}

	for key, value := range defaults {
		if !s.repo.Exists(key) {
			if err := s.repo.Set(key, value); err != nil {
				return err
			}
		}
	}
	return nil
}
