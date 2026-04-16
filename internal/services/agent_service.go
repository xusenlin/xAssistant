package services

import (
	"xAssistant/internal/models"
)

type AgentRepository interface {
	Create(agent *models.Agent) error
	GetByID(id string) (*models.Agent, error)
	GetAll() ([]*models.Agent, error)
	Update(agent *models.Agent) error
	Delete(id string) error
	GetEnabled() ([]*models.Agent, error)
}

type AgentService struct {
	repo AgentRepository
}

func NewAgentService(repo AgentRepository) *AgentService {
	return &AgentService{repo: repo}
}

func (s *AgentService) Create(name, icon, description, agentsMD, soulMD, profileMD, memoryMD, language string, enabled bool) (*models.Agent, error) {
	a := &models.Agent{
		Name:        name,
		Icon:        icon,
		Description: description,
		AgentsMD:    agentsMD,
		SoulMD:      soulMD,
		ProfileMD:   profileMD,
		MemoryMD:    memoryMD,
		Language:    language,
		Enabled:     enabled,
	}
	if err := s.repo.Create(a); err != nil {
		return nil, err
	}
	return a, nil
}

func (s *AgentService) GetByID(id string) (*models.Agent, error) {
	return s.repo.GetByID(id)
}

func (s *AgentService) GetAll() ([]*models.Agent, error) {
	return s.repo.GetAll()
}

func (s *AgentService) Update(id, name, icon, description, agentsMD, soulMD, profileMD, memoryMD, language string, enabled bool) error {
	a, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}
	a.Name = name
	a.Icon = icon
	a.Description = description
	a.AgentsMD = agentsMD
	a.SoulMD = soulMD
	a.ProfileMD = profileMD
	a.MemoryMD = memoryMD
	a.Language = language
	a.Enabled = enabled
	return s.repo.Update(a)
}

func (s *AgentService) Delete(id string) error {
	return s.repo.Delete(id)
}

func (s *AgentService) GetEnabled() ([]*models.Agent, error) {
	return s.repo.GetEnabled()
}
