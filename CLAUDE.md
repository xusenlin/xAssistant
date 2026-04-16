# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development mode with hot reload
wails dev

# Production build
wails build

# Go backend only build
go build ./...

# Frontend TypeScript check
cd frontend && npx tsc --noEmit
```

## Architecture

### Stack
- **Wails v3** — desktop app framework binding Go backend + React frontend
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Radix UI + Zustand + React Router v7
- **Backend**: Go with GORM v1 + SQLite, AES-256-GCM encryption
- **Frontend bindings**: Wails auto-generates TypeScript bindings from Go service structs at dev time (in `frontend/bindings/`). **Do not edit bindings manually** — regenerate by running `wails dev`.

### Backend Layer Architecture
```
main.go
  |-- config.Manager       (app config, ~/.xAssistant/)
  |   |-- config.json     (encrypted key + salt)
  |-- database.Database   (GORM + SQLite, AutoMigrate)
  |-- crypto.Crypto       (AES-256-GCM, Encrypter interface)
  +-- services.*Service   (business logic)
       +-- dao.*DAO       (data access, implements Repository interface)
            +-- models.*  (GORM struct, table via TableName())
```

Each domain has its own model/dao/service triplet. Service methods are registered in `main.go` via `application.NewService()`. Wails exposes them to the frontend as typed API calls.

### Adding a New Backend Module
1. Create `internal/models/<name>.go` — GORM struct with `TableName()` returning the table name
2. Create `internal/dao/<name>_dao.go` — DAO implementing the `Repository` interface from services
3. Create `internal/services/<name>_service.go` — Service with business logic, registered in `main.go`
4. Add model to `database/database.go` `AutoMigrate`
5. Instantiate DAO + Service in `main.go` and register via `application.NewService()`

### Data Storage
- `~/.xAssistant/config.json` — encrypted key, salt, app settings
- `~/.xAssistant/data.db` — SQLite database (auto-created on first run)

### Window
Window size defaults to 80% of primary screen resolution (fallback 1280x800). Configured in `main.go` via `getScreenSize()`.

### Frontend Patterns
- All API calls go through Wails auto-generated bindings (`import { XxxService } from "../../../bindings/xAssistant/internal/services/index"`)
- UI components live in `src/components/ui/` (shadcn-style)
- Pages live in `src/pages/`
- Form dialogs use Radix Dialog, tabs use Radix Tabs
- Scrollbar hidden via ` [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`
