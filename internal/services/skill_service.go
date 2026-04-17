package services

import (
	"archive/zip"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"xAssistant/internal/models"

	"gopkg.in/yaml.v3"
)

type SkillRepository interface {
	Create(skill *models.Skill) error
	GetByID(id string) (*models.Skill, error)
	GetByName(name string) (*models.Skill, error)
	GetAll() ([]*models.Skill, error)
	Update(skill *models.Skill) error
	Delete(id string) error
}

type SkillService struct {
	repo    SkillRepository
	baseDir string
}

func NewSkillService(repo SkillRepository, baseDir string) *SkillService {
	os.MkdirAll(baseDir, 0755)
	return &SkillService{repo: repo, baseDir: baseDir}
}

type SkillFrontmatter struct {
	Name          string   `yaml:"name"`
	Version       string   `yaml:"version"`
	Description   string   `yaml:"description"`
	License       string   `yaml:"license"`
	Compatibility string   `yaml:"compatibility"`
	Category      string   `yaml:"category"`
	Tags          []string `yaml:"tags"`
	AllowedTools  []string `yaml:"allowed_tools"`
}

type SkillFileInfo struct {
	Path  string `json:"path"`
	Name  string `json:"name"`
	Size  int64  `json:"size"`
	IsDir bool   `json:"is_dir"`
}

func (s *SkillService) ImportSkill(zipData string) (*models.Skill, error) {
	decoded, err := base64.StdEncoding.DecodeString(zipData)
	if err != nil {
		return nil, fmt.Errorf("invalid base64 data: %w", err)
	}

	zr, err := zip.NewReader(bytes.NewReader(decoded), int64(len(decoded)))
	if err != nil {
		return nil, fmt.Errorf("invalid ZIP file: %w", err)
	}

	skillMDContent := ""

	for _, f := range zr.File {
		if f.FileInfo().IsDir() {
			continue
		}
		if filepath.Base(f.Name) == "SKILL.md" {
			rc, err := f.Open()
			if err != nil {
				return nil, fmt.Errorf("failed to read SKILL.md: %w", err)
			}
			data, err := io.ReadAll(rc)
			rc.Close()
			if err != nil {
				return nil, fmt.Errorf("failed to read SKILL.md: %w", err)
			}
			skillMDContent = string(data)
			break
		}
	}

	if skillMDContent == "" {
		return nil, fmt.Errorf("SKILL.md not found in ZIP")
	}

	fm, err := parseFrontmatter(skillMDContent)
	if err != nil {
		return nil, fmt.Errorf("failed to parse frontmatter, check YAML format (indentation, spaces after colon, special chars)：%w", err)
	}

	if fm.Name == "" {
		return nil, fmt.Errorf("frontmatter missing .name. field, ensure SKILL.md contains .name: xxx")
	}

	if err := validateSkillName(fm.Name); err != nil {
		return nil, err
	}

	existing, _ := s.repo.GetByName(fm.Name)
	if existing != nil {
		return nil, fmt.Errorf("skill %q already exists, use a different name", fm.Name)
	}

	extractDir := filepath.Join(s.baseDir, fm.Name)
	if err := os.RemoveAll(extractDir); err != nil {
		return nil, fmt.Errorf("failed to clean old directory: %w", err)
	}

	tmpDir := filepath.Join(s.baseDir, "tmp-skill-import")
	if err := os.RemoveAll(tmpDir); err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %w", err)
	}

	if err := extractZipToDir(zr, tmpDir); err != nil {
		os.RemoveAll(tmpDir)
		return nil, fmt.Errorf("failed to extract: %w", err)
	}

	if err := os.Rename(tmpDir, extractDir); err != nil {
		os.RemoveAll(tmpDir)
		return nil, fmt.Errorf("failed to rename directory: %w", err)
	}

	skill := &models.Skill{
		Name:          fm.Name,
		Description:   fm.Description,
		License:       fm.License,
		Compatibility: fm.Compatibility,
		Metadata:      buildMetadata(fm),
		AllowedTools:  buildAllowedToolsJSON(fm.AllowedTools),
		Content:       decoded,
	}

	if err := s.repo.Create(skill); err != nil {
		os.RemoveAll(extractDir)
		return nil, fmt.Errorf("failed to save: %w", err)
	}

	return skill, nil
}

func (s *SkillService) GetAll() ([]*models.Skill, error) {
	return s.repo.GetAll()
}

func (s *SkillService) GetByID(id string) (*models.Skill, error) {
	return s.repo.GetByID(id)
}

func (s *SkillService) GetExportContent(id string) (string, error) {
	skill, err := s.repo.GetByID(id)
	if err != nil {
		return "", err
	}
	if len(skill.Content) == 0 {
		return "", fmt.Errorf("skill has no content")
	}
	return base64.StdEncoding.EncodeToString(skill.Content), nil
}

func (s *SkillService) SaveSkillZip(id, filePath string) error {
	skill, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}
	if len(skill.Content) == 0 {
		return fmt.Errorf("skill has no content")
	}
	return os.WriteFile(filePath, skill.Content, 0644)
}

func (s *SkillService) EnsureExtracted(id string) (string, error) {
	skill, err := s.repo.GetByID(id)
	if err != nil {
		return "", err
	}

	extractDir := filepath.Join(s.baseDir, skill.Name)
	if info, err := os.Stat(extractDir); err == nil && info.IsDir() {
		return extractDir, nil
	}

	if len(skill.Content) == 0 {
		return "", fmt.Errorf("skill has no content")
	}

	zr, err := zip.NewReader(bytes.NewReader(skill.Content), int64(len(skill.Content)))
	if err != nil {
		return "", fmt.Errorf("invalid ZIP content: %w", err)
	}

	if err := extractZip(zr, s.baseDir); err != nil {
		return "", fmt.Errorf("failed to extract: %w", err)
	}

	return extractDir, nil
}

func (s *SkillService) GetSkillFiles(id string) ([]SkillFileInfo, error) {
	dir, err := s.EnsureExtracted(id)
	if err != nil {
		return nil, err
	}

	var files []SkillFileInfo
	if err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(dir, path)
		if rel == "." {
			return nil
		}
		name := info.Name()
		if name == ".DS_Store" || strings.HasPrefix(name, "._") {
			return nil
		}
		files = append(files, SkillFileInfo{
			Path:  rel,
			Name:  name,
			Size:  info.Size(),
			IsDir: info.IsDir(),
		})
		return nil
	}); err != nil {
		return nil, err
	}

	return files, nil
}

func (s *SkillService) GetFileContent(id, filePath string) (string, error) {
	dir, err := s.EnsureExtracted(id)
	if err != nil {
		return "", err
	}

	fullPath := filepath.Join(dir, filepath.FromSlash(filePath))
	data, err := os.ReadFile(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	return string(data), nil
}

func (s *SkillService) SaveFileContent(id, filePath, content string) error {
	dir, err := s.EnsureExtracted(id)
	if err != nil {
		return err
	}

	fullPath := filepath.Join(dir, filepath.FromSlash(filePath))
	if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	return s.repackAndSync(id)
}

func (s *SkillService) Delete(id string) error {
	skill, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}

	if err := s.repo.Delete(id); err != nil {
		return fmt.Errorf("failed to delete record: %w", err)
	}

	extractDir := filepath.Join(s.baseDir, skill.Name)
	os.RemoveAll(extractDir)

	return nil
}

func (s *SkillService) repackAndSync(id string) error {
	skill, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}

	extractDir := filepath.Join(s.baseDir, skill.Name)

	zipData, err := repackDir(extractDir)
	if err != nil {
		return fmt.Errorf("failed to repack: %w", err)
	}

	skill.Content = zipData

	skillMDPath := filepath.Join(extractDir, "SKILL.md")
	if data, err := os.ReadFile(skillMDPath); err == nil {
		if fm, err := parseFrontmatter(string(data)); err == nil {
			skill.Description = fm.Description
			skill.License = fm.License
			skill.Compatibility = fm.Compatibility
			skill.Metadata = buildMetadata(fm)
			skill.AllowedTools = buildAllowedToolsJSON(fm.AllowedTools)
		}
	}

	return s.repo.Update(skill)
}

func parseFrontmatter(content string) (*SkillFrontmatter, error) {
	lines := strings.Split(content, "\n")
	var fmLines []string
	started := false

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "---" {
			if !started {
				started = true
				continue
			}
			break
		}
		if started {
			fmLines = append(fmLines, line)
		}
	}

	if len(fmLines) == 0 {
		return &SkillFrontmatter{}, nil
	}

	var fm SkillFrontmatter
	if err := yaml.Unmarshal([]byte(strings.Join(fmLines, "\n")), &fm); err != nil {
		return nil, err
	}

	return &fm, nil
}
func validateSkillName(name string) error {
	if name == "" {
		return fmt.Errorf("cannot be empty")
	}
	if len(name) > 64 {
		return fmt.Errorf("exceeds 64 characters (current: %d)", len(name))
	}
	if name[0] == '-' || name[len(name)-1] == '-' {
		return fmt.Errorf("cannot start or end with hyphen")
	}
	if strings.Contains(name, "--") {
		return fmt.Errorf("cannot contain consecutive hyphens")
	}
	for _, c := range name {
		if !((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-') {
			return fmt.Errorf("only lowercase letters (a-z), digits (0-9) and hyphens allowed, invalid char %q", string(c))
		}
	}
	return nil
}

func buildMetadata(fm *SkillFrontmatter) string {
	m := map[string]interface{}{
		"category": fm.Category,
		"tags":     fm.Tags,
		"version":  fm.Version,
	}
	data, _ := json.Marshal(m)
	return string(data)
}

func isMetaFile(name string) bool {
	base := filepath.Base(name)
	return strings.HasPrefix(name, "__MACOSX/") || strings.HasPrefix(base, "._")
}

func buildAllowedToolsJSON(tools []string) string {
	if len(tools) == 0 {
		return "[]"
	}
	data, _ := json.Marshal(tools)
	return string(data)
}

func extractZip(zr *zip.Reader, destDir string) error {
	// 用 filepath.Dir(f.Name) 检测顶层目录，直接处理原始 ZIP entry name
	// 关键：filepath.Dir("nurse-community-copywriter/") = "."，filepath.Dir("nurse-community-copywriter/SKILL.md") = "nurse-community-copywriter"
	var topDir string
	for _, f := range zr.File {
		if isMetaFile(f.Name) {
			continue
		}
		if topDir == "" {
			topDir = filepath.Dir(f.Name)
			break
		}
	}
	if topDir == "." {
		topDir = ""
	}

	for _, f := range zr.File {
		if isMetaFile(f.Name) {
			continue
		}

		name := filepath.FromSlash(f.Name)
		if topDir != "" {
			name = strings.TrimPrefix(name, topDir+"/")
		}

		if name == "" || strings.HasSuffix(f.Name, "/") {
			continue // 空路径或目录 entry，跳过
		}

		path := filepath.Join(destDir, name)
		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			return err
		}
		out, err := os.Create(path)
		if err != nil {
			rc.Close()
			return err
		}
		_, err = io.Copy(out, rc)
		rc.Close()
		out.Close()
		if err != nil {
			return err
		}
	}
	return nil
}

// extractZipToDir extracts ZIP to dest dir, strips top-level directory prefix
func extractZipToDir(zr *zip.Reader, destDir string) error {
	// 找出顶层目录名，跳过 __MACOSX 元数据文件
	var topDir string
	for _, f := range zr.File {
		if isMetaFile(f.Name) {
			continue
		}
		if topDir == "" {
			topDir = filepath.Dir(f.Name)
			break
		}
	}
	if topDir == "." {
		topDir = ""
	}

	for _, f := range zr.File {
		if isMetaFile(f.Name) {
			continue
		}

		name := filepath.FromSlash(f.Name)
		if topDir != "" {
			name = strings.TrimPrefix(name, topDir+"/")
		}

		if name == "" || strings.HasSuffix(f.Name, "/") {
			continue
		}

		path := filepath.Join(destDir, name)
		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			return err
		}
		out, err := os.Create(path)
		if err != nil {
			rc.Close()
			return err
		}
		_, err = io.Copy(out, rc)
		rc.Close()
		out.Close()
		if err != nil {
			return err
		}
	}
	return nil
}

func repackDir(dir string) ([]byte, error) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)

	absDir, _ := filepath.Abs(dir)
	if err := filepath.Walk(absDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(absDir, path)
		if rel == "." || rel == "" {
			return nil
		}
		if info.IsDir() {
			return nil
		}

		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}
		header.Name = rel
		header.Method = zip.Deflate

		w, err := zw.CreateHeader(header)
		if err != nil {
			return err
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		_, err = w.Write(data)
		return err
	}); err != nil {
		return nil, err
	}

	if err := zw.Close(); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}
