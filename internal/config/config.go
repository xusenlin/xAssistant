package config

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"xAssistant/internal/crypto"
)

const (
	AppDirName   = ".xAssistant"
	ConfigFile   = "config.json"
	DatabaseFile = "data.db"
)

type Config struct {
	EncryptionKey string `json:"encryption_key"` // Base64 编码的 AES-256 密钥
	EncryptionSalt string `json:"encryption_salt"` // 盐值
	Version       int    `json:"version"`         // 配置版本
}

type Manager struct {
	AppDir string
	DBPath string
	cfg    *Config
}

func NewManager() (*Manager, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("获取用户目录失败: %w", err)
	}

	appDir := filepath.Join(homeDir, AppDirName)
	dbPath := filepath.Join(appDir, DatabaseFile)

	m := &Manager{
		AppDir: appDir,
		DBPath: dbPath,
		cfg:    &Config{Version: 1},
	}

	return m, nil
}

func (m *Manager) Init() error {
	if err := os.MkdirAll(m.AppDir, 0755); err != nil {
		return fmt.Errorf("创建应用目录失败: %w", err)
	}

	if err := m.load(); err != nil {
		if !os.IsNotExist(err) {
			return fmt.Errorf("加载配置失败: %w", err)
		}
	}

	if !m.IsConfigured() {
		salt, err := crypto.GenerateSalt()
		if err != nil {
			return fmt.Errorf("生成盐值失败: %w", err)
		}
		key, err := crypto.GenerateKey()
		if err != nil {
			return fmt.Errorf("生成密钥失败: %w", err)
		}
		m.cfg.EncryptionKey = base64.StdEncoding.EncodeToString(key)
		m.cfg.EncryptionSalt = base64.StdEncoding.EncodeToString(salt)
	}

	if err := m.Save(); err != nil {
		return fmt.Errorf("保存配置失败: %w", err)
	}

	return nil
}

func (m *Manager) load() error {
	configPath := filepath.Join(m.AppDir, ConfigFile)
	data, err := os.ReadFile(configPath)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, m.cfg)
}

func (m *Manager) Save() error {
	configPath := filepath.Join(m.AppDir, ConfigFile)
	data, err := json.MarshalIndent(m.cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("序列化配置失败: %w", err)
	}
	return os.WriteFile(configPath, data, 0600)
}

func (m *Manager) Get() *Config {
	return m.cfg
}

func (m *Manager) IsConfigured() bool {
	return m.cfg.EncryptionKey != "" && m.cfg.EncryptionSalt != ""
}
