package services

import (
	"xAssistant/internal/models"
)

type Encrypter interface {
	Encrypt(plaintext string) (string, error)
	Decrypt(encrypted string) (string, error)
}

type ModelRepository interface {
	Create(model *models.Model) error
	GetByID(id string) (*models.Model, error)
	GetAll() ([]*models.Model, error)
	Update(model *models.Model) error
	Delete(id string) error
	GetEnabled() ([]*models.Model, error)
	GetDefault() (*models.Model, error)
	SetDefault(id string) error
}

type ModelService struct {
	repo   ModelRepository
	crypto Encrypter
}

func NewModelService(repo ModelRepository, crypto Encrypter) *ModelService {
	return &ModelService{
		repo:   repo,
		crypto: crypto,
	}
}

func (s *ModelService) Create(name, provider, modelID, baseURL, apiKey, description string, temperature float64, maxTokens int, topP float64, enabled bool, tags, metadata string) (*models.Model, error) {
	encryptedKey, err := s.crypto.Encrypt(apiKey)
	if err != nil {
		return nil, err
	}

	m := &models.Model{
		Name:        name,
		Provider:    provider,
		ModelID:     modelID,
		BaseURL:     baseURL,
		APIKey:      encryptedKey,
		Description: description,
		Temperature: temperature,
		MaxTokens:   maxTokens,
		TopP:        topP,
		Enabled:     enabled,
		Tags:        tags,
		Metadata:    metadata,
	}

	if err := s.repo.Create(m); err != nil {
		return nil, err
	}

	return m, nil
}

func (s *ModelService) GetByID(id string) (*models.Model, error) {
	return s.repo.GetByID(id)
}

func (s *ModelService) GetAll() ([]*models.Model, error) {
	return s.repo.GetAll()
}

func (s *ModelService) Update(id, name, provider, modelID, baseURL, apiKey, description string, temperature float64, maxTokens int, topP float64, enabled bool, tags, metadata string) error {
	m, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}

	m.Name = name
	m.Provider = provider
	m.ModelID = modelID
	m.BaseURL = baseURL
	m.Description = description
	m.Temperature = temperature
	m.MaxTokens = maxTokens
	m.TopP = topP
	m.Enabled = enabled
	m.Tags = tags
	m.Metadata = metadata

	if apiKey != "" {
		encryptedKey, err := s.crypto.Encrypt(apiKey)
		if err != nil {
			return err
		}
		m.APIKey = encryptedKey
	}

	return s.repo.Update(m)
}

func (s *ModelService) Delete(id string) error {
	return s.repo.Delete(id)
}

func (s *ModelService) GetDecryptedAPIKey(id string) (string, error) {
	m, err := s.repo.GetByID(id)
	if err != nil {
		return "", err
	}
	return s.crypto.Decrypt(m.APIKey)
}

func (s *ModelService) GetDefault() (*models.Model, error) {
	return s.repo.GetDefault()
}

func (s *ModelService) SetDefault(id string) error {
	return s.repo.SetDefault(id)
}
