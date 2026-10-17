package stream

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"os/exec"
	"strings"
	"sync"
	"time"

	"rtsp-stream-viewer-backend/internal/config"
)

type StreamSummary struct {
	ID        string      `json:"id"`
	URL       string      `json:"url"`
	Stats     StreamStats `json:"stats"`
	CreatedAt time.Time   `json:"created_at"`
}

type Manager struct {
	cfg     *config.Config
	mu      sync.RWMutex
	streams map[string]*Stream
}

func NewManager(cfg *config.Config) *Manager {
	return &Manager{
		cfg:     cfg,
		streams: make(map[string]*Stream),
	}
}

// GenerateStreamID produces a deterministic hash ID based on the RTSP URL
func GenerateStreamID(url string) string {
	h := sha256.New()
	h.Write([]byte(strings.TrimSpace(url)))
	return hex.EncodeToString(h.Sum(nil))[:12]
}

// GetOrCreateStream returns an existing stream or boots a new one
func (m *Manager) GetOrCreateStream(url string, customID string) (*Stream, error) {
	cleanURL := strings.TrimSpace(url)
	if cleanURL == "" {
		return nil, fmt.Errorf("stream URL cannot be empty")
	}

	streamID := customID
	if streamID == "" {
		streamID = GenerateStreamID(cleanURL)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	if s, exists := m.streams[streamID]; exists {
		return s, nil
	}

	s := NewStream(streamID, cleanURL, m.cfg.FFmpegPath, m.cfg.IdleTimeout, func(id string) {
		m.RemoveStream(id)
	})

	m.streams[streamID] = s
	s.Start()
	log.Printf("[Manager] Registered new stream %s for %s", streamID, cleanURL)
	return s, nil
}

func (m *Manager) GetStream(id string) (*Stream, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	s, ok := m.streams[id]
	return s, ok
}

func (m *Manager) RemoveStream(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if s, exists := m.streams[id]; exists {
		s.Stop()
		delete(m.streams, id)
		log.Printf("[Manager] Removed stream %s", id)
	}
}

func (m *Manager) ListStreams() []StreamSummary {
	m.mu.RLock()
	defer m.mu.RUnlock()

	summaries := make([]StreamSummary, 0, len(m.streams))
	for _, s := range m.streams {
		summaries = append(summaries, StreamSummary{
			ID:        s.ID,
			URL:       s.URL,
			Stats:     s.GetStats(),
			CreatedAt: s.startedAt,
		})
	}
	return summaries
}

// ProbeRTSP tests if an RTSP endpoint or test URL is reachable
func (m *Manager) ProbeRTSP(url string) (bool, string, error) {
	cleanURL := strings.TrimSpace(url)
	if strings.HasPrefix(cleanURL, "synthetic://") || strings.HasPrefix(cleanURL, "test://") {
		return true, "Synthetic source verified", nil
	}

	// Run quick probe with ffprobe/ffmpeg (2 second timeout)
	args := []string{
		"-loglevel", "error",
		"-rtsp_transport", "tcp",
		"-timeout", "2000000",
		"-i", cleanURL,
		"-t", "1",
		"-f", "null",
		"-",
	}

	cmd := exec.Command(m.cfg.FFmpegPath, args...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return false, string(out), fmt.Errorf("probe failed: %v, detail: %s", err, string(out))
	}

	return true, "Stream probe successful", nil
}
