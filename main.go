package main

import (
	"embed"
	"log"

	"xAssistant/internal/config"
	"xAssistant/internal/crypto"
	"xAssistant/internal/database"
	"xAssistant/internal/dao"
	"xAssistant/internal/services"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	cfg, err := config.NewManager()
	if err != nil {
		log.Fatal(err)
	}
	if err := cfg.Init(); err != nil {
		log.Fatal(err)
	}

	db, err := database.New(cfg.DBPath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	if err := db.Init(); err != nil {
		log.Fatal(err)
	}

	cryptoSvc, _ := crypto.NewCrypto(cfg.Get().EncryptionKey, cfg.Get().EncryptionSalt)
	modelService := services.NewModelService(dao.NewModelDAO(db.DB), cryptoSvc)
	agentService := services.NewAgentService(dao.NewAgentDAO(db.DB))

	app := application.New(application.Options{
		Name:        "xAssistant",
		Description: "AI Assistant",
		Services: []application.Service{
			application.NewService(modelService),
			application.NewService(agentService),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:           "xAssistant",
		BackgroundColour: application.NewRGB(255, 255, 255),
		URL:             "/",
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
	})

	log.Fatal(app.Run())
}
