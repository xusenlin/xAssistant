package dao

import (
	"fmt"

	"xAssistant/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SkillDAO struct {
	db *gorm.DB
}

func NewSkillDAO(db *gorm.DB) *SkillDAO {
	return &SkillDAO{db: db}
}

func (r *SkillDAO) Create(skill *models.Skill) error {
	skill.ID = uuid.New().String()
	return r.db.Create(skill).Error
}

func (r *SkillDAO) GetByID(id string) (*models.Skill, error) {
	var s models.Skill
	if err := r.db.First(&s, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("skill 不存在: %s", id)
		}
		return nil, err
	}
	return &s, nil
}

func (r *SkillDAO) GetByName(name string) (*models.Skill, error) {
	var s models.Skill
	if err := r.db.Where("name = ?", name).First(&s).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("skill 不存在: %s", name)
		}
		return nil, err
	}
	return &s, nil
}

func (r *SkillDAO) GetAll() ([]*models.Skill, error) {
	var skills []*models.Skill
	if err := r.db.Order("created_at DESC").Find(&skills).Error; err != nil {
		return nil, err
	}
	return skills, nil
}

func (r *SkillDAO) Update(skill *models.Skill) error {
	return r.db.Save(skill).Error
}

func (r *SkillDAO) Delete(id string) error {
	return r.db.Delete(&models.Skill{}, "id = ?", id).Error
}
