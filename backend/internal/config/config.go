package config

import (
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

type Config struct {
	Port           string
	AllowedOrigins []string
	FFmpegPath     string
	IdleTimeout    time.Duration
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	ffmpegPath := os.Getenv("FFMPEG_PATH")
	if ffmpegPath == "" {
		if path, err := exec.LookPath("ffmpeg"); err == nil {
			ffmpegPath = path
		} else {
			// Check common WinGet install locations on Windows
			localApp := os.Getenv("LOCALAPPDATA")
			wingetPattern := filepath.Join(localApp, "Microsoft", "WinGet", "Packages", "*FFmpeg*", "*", "bin", "ffmpeg.exe")
			if matches, _ := filepath.Glob(wingetPattern); len(matches) > 0 {
				ffmpegPath = matches[0]
			} else {
				ffmpegPath = "ffmpeg"
			}
		}
	}

	return &Config{
		Port:           port,
		AllowedOrigins: []string{"*"},
		FFmpegPath:     ffmpegPath,
		IdleTimeout:    5 * time.Second,
	}
}
