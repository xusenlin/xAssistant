# goAssistant

A desktop AI assistant application built with Wails v3, Go, and React.

## Tech Stack

- **Framework**: [Wails v3](https://wails.io/) - Build desktop apps with Go + modern web tech
- **Frontend**: React 18 + TypeScript + Tailwind CSS v4
- **Backend**: Go

## Getting Started

```bash
# Development mode with hot reload
wails3 dev

# Production build
wails3 build
```

## Project Structure

```
goAgent/
├── main.go              # Go application entry point
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   ├── lib/         # Utilities
│   │   └── App.tsx      # Main app component
│   └── dist/            # Built assets
└── build/               # Build configuration
```

## Frontend Design Reference

The frontend design is inspired by [QwenPaw](https://github.com/agentscope-ai/QwenPaw).

## Documentation

- [Wails v3 Documentation](https://v3alpha.wails.io/)
- [Wails Examples](https://github.com/wailsapp/wails/tree/v3-alpha/v3/examples)
