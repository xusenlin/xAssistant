# goAgent - Wails v3 Project

## Tech Stack
- Wails v3 + React + TypeScript (react-swc-ts template)
- Go 1.25+

## Key Commands
```bash
wails3 dev          # Development mode with hot reload
wails3 build        # Production build
wails3 init -l      # List available templates
```

## Project Structure
```
main.go             # Go application entry point
greetservice.go     # Sample Go service
frontend/           # React/Vite frontend
  bindings/         # Auto-generated Go<->TS bindings (don't edit)
build/              # Build configuration
Taskfile.yml        # Task runner shortcuts
```

## Common Issues
- **Bindings**: `frontend/bindings/` 是自动生成的，勿手动编辑

## Adding Go Services
1. 创建带导出方法的 Go struct
2. 在 `main.go` 的 `Services` 数组注册：`application.NewService(&YourService{})`
3. 运行 `wails3 dev` 自动生成 bindings

## Examples & Docs
- Examples: `git clone https://github.com/wailsapp/wails && cd wails/v3/examples/<example> && go mod tidy && go run .`
- Docs: https://v3alpha.wails.io/
- API Ref: https://v3alpha.wails.io/reference/application/
