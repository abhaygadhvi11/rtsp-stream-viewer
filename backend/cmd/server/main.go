package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"rtsp-stream-viewer-backend/internal/api"
	"rtsp-stream-viewer-backend/internal/config"
	"rtsp-stream-viewer-backend/internal/stream"
)

func main() {
	cfg := config.Load()
	streamMgr := stream.NewManager(cfg)
	router := api.NewRouter(cfg, streamMgr)

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Channel to listen for interrupt signals for graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("==================================================")
		log.Printf(" Skylark RTSP Stream Gateway Starting on :%s", cfg.Port)
		log.Printf(" FFmpeg Path: %s", cfg.FFmpegPath)
		log.Printf(" WebSocket Endpoint: ws://localhost:%s/ws/stream", cfg.Port)
		log.Printf(" Health Check: http://localhost:%s/health", cfg.Port)
		log.Printf("==================================================")

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	<-stop
	log.Println("Shutting down RTSP Stream Gateway...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server forced shutdown: %v", err)
	}

	log.Println("Server exited cleanly.")
}
