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

	// DAO 实例
	modelDAO := dao.NewModelDAO(db.DB)
	agentDAO := dao.NewAgentDAO(db.DB)
	modelStatDAO := dao.NewModelStatDAO(db.DB)
	skillDAO := dao.NewSkillDAO(db.DB)
	optionDAO := dao.NewOptionDAO(db.DB)
	conversationDAO := dao.NewConversationDAO(db.DB)
	messageDAO := dao.NewMessageDAO(db.DB)
	messageBlockDAO := dao.NewMessageBlockDAO(db.DB)

	// Service 实例
	modelService := services.NewModelService(modelDAO, cryptoSvc)
	agentService := services.NewAgentService(agentDAO)
	environmentService := services.NewEnvironmentService()
	modelStatService := services.NewModelStatService(modelStatDAO)
	skillService := services.NewSkillService(skillDAO, filepath.Join(cfg.AppDir, "skills"))
	optionService := services.NewOptionService(optionDAO, cfg)
	conversationService := services.NewConversationService(conversationDAO)
	messageService := services.NewMessageService(messageDAO)
	messageBlockService := services.NewMessageBlockService(messageBlockDAO)
	chatService := services.NewChatService(conversationDAO, messageDAO, messageBlockDAO, modelService)

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
			application.NewService(chatService),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	// Set app reference for streaming events
	chatService.SetApp(app)

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
