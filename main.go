package main

import (
	"embed"
	"log"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"

	"xAssistant/internal/config"
	"xAssistant/internal/crypto"
	"xAssistant/internal/dao"
	"xAssistant/internal/database"
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
	environmentService := services.NewEnvironmentService()
	modelStatService := services.NewModelStatService(dao.NewModelStatDAO(db.DB))
	skillService := services.NewSkillService(dao.NewSkillDAO(db.DB), filepath.Join(cfg.AppDir, "skills"))
	optionService := services.NewOptionService(dao.NewOptionDAO(db.DB), cfg)
	conversationService := services.NewConversationService(dao.NewConversationDAO(db.DB))
	messageService := services.NewMessageService(dao.NewMessageDAO(db.DB))
	messageBlockService := services.NewMessageBlockService(dao.NewMessageBlockDAO(db.DB))

	if err := optionService.InitDefaults(); err != nil {
		log.Fatal(err)
	}

	app := application.New(application.Options{
		Name:        "xAssistant",
		Description: "AI Assistant",
		Services: []application.Service{
			application.NewService(modelService),
			application.NewService(agentService),
			application.NewService(environmentService),
			application.NewService(modelStatService),
			application.NewService(skillService),
			application.NewService(optionService),
			application.NewService(conversationService),
			application.NewService(messageService),
			application.NewService(messageBlockService),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	width, height := getScreenSize()
	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:            "xAssistant",
		BackgroundColour: application.NewRGB(255, 255, 255),
		URL:              "/",
		Width:            width,
		Height:           height,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
	})

	log.Fatal(app.Run())
}

func getScreenSize() (int, int) {
	out, err := exec.Command("system_profiler", "SPDisplaysDataType", "-json").Output()
	if err != nil {
		return 1280, 800
	}
	s := string(out)

	// 提取屏幕分辨率
	parts := strings.Split(s, "\"Width\":")
	if len(parts) < 2 {
		return 1280, 800
	}
	wStr := strings.TrimSpace(strings.Split(parts[1], ",")[0])
	w, err := strconv.Atoi(wStr)
	if err != nil {
		return 1280, 800
	}

	parts = strings.Split(s, "\"Height\":")
	if len(parts) < 2 {
		return 1280, 800
	}
	hStr := strings.TrimSpace(strings.Split(parts[1], "}")[0])
	h, err := strconv.Atoi(hStr)
	if err != nil {
		return 1280, 800
	}

	return int(float64(w) * 0.8), int(float64(h) * 0.8)
}
