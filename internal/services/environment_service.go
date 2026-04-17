package services

import (
	"encoding/json"
	"os/exec"
	"strings"
)

type Tool struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	Path    string `json:"path"`
	Exists  bool   `json:"exists"`
}

type EnvironmentService struct{}

func NewEnvironmentService() *EnvironmentService {
	return &EnvironmentService{}
}

var tools = []struct {
	name         string
	versionCmd   string
	versionMatch func(string) string
}{
	{
		name:       "Node.js",
		versionCmd: "node --version",
		versionMatch: func(out string) string {
			return strings.TrimSpace(out)
		},
	},
	{
		name:       "npm",
		versionCmd: "npm --version",
		versionMatch: func(out string) string {
			return "v" + strings.TrimSpace(out)
		},
	},
	{
		name:       "pnpm",
		versionCmd: "pnpm --version",
		versionMatch: func(out string) string {
			return "v" + strings.TrimSpace(out)
		},
	},
	{
		name:       "yarn",
		versionCmd: "yarn --version",
		versionMatch: func(out string) string {
			return "v" + strings.TrimSpace(out)
		},
	},
	{
		name:       "git",
		versionCmd: "git --version",
		versionMatch: func(out string) string {
			return strings.TrimSpace(out)
		},
	},
	{
		name:       "python3",
		versionCmd: "python3 --version",
		versionMatch: func(out string) string {
			return strings.TrimSpace(out)
		},
	},
	{
		name:       "pip3",
		versionCmd: "pip3 --version",
		versionMatch: func(out string) string {
			parts := strings.Split(strings.TrimSpace(out), " ")
			if len(parts) >= 2 {
				return parts[1]
			}
			return strings.TrimSpace(out)
		},
	},
	{
		name:       "go",
		versionCmd: "go version",
		versionMatch: func(out string) string {
			return strings.TrimSpace(out)
		},
	},
	{
		name:       "Docker",
		versionCmd: "docker --version",
		versionMatch: func(out string) string {
			return strings.TrimSpace(out)
		},
	},
	{
		name:       "Claude",
		versionCmd: "claude --version 2>/dev/null || echo 'not found'",
		versionMatch: func(out string) string {
			out = strings.TrimSpace(out)
			if out == "not found" || out == "" {
				return ""
			}
			return out
		},
	},
}

func (s *EnvironmentService) GetTools() []Tool {
	results := make([]Tool, 0, len(tools))
	for _, t := range tools {
		tool := Tool{Name: t.name, Exists: false}

		cmd0 := exec.Command("which", strings.Fields(t.versionCmd)[0])
		pathOut, _ := cmd0.Output()
		if len(pathOut) > 0 {
			tool.Path = strings.TrimSpace(string(pathOut))
		}

		cmd := exec.Command("sh", "-c", t.versionCmd)
		out, err := cmd.Output()
		if err == nil {
			tool.Exists = true
			tool.Version = t.versionMatch(string(out))
		}

		results = append(results, tool)
	}
	return results
}

func (s *EnvironmentService) GetToolsJSON() string {
	tools := s.GetTools()
	data, _ := json.Marshal(tools)
	return string(data)
}
