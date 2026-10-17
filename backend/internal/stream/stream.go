package stream

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log"
	"os/exec"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type StreamStatus string

const (
	StatusConnecting   StreamStatus = "CONNECTING"
	StatusLive         StreamStatus = "LIVE"
	StatusReconnecting StreamStatus = "RECONNECTING"
	StatusError        StreamStatus = "ERROR"
	StatusStopped      StreamStatus = "STOPPED"
)

type StreamStats struct {
	Status        StreamStatus `json:"status"`
	Viewers       int          `json:"viewers"`
	BitrateKbps   int64        `json:"bitrate_kbps"`
	FPS           float64      `json:"fps"`
	StartedAt     time.Time    `json:"started_at"`
	UptimeSeconds int64        `json:"uptime_seconds"`
	LastError     string       `json:"last_error,omitempty"`
}

type Stream struct {
	ID          string
	URL         string
	ffmpegPath  string
	idleTimeout time.Duration

	mu      sync.RWMutex
	clients map[*Client]bool

	register   chan *Client
	unregister chan *Client

	ctx    context.Context
	cancel context.CancelFunc

	status      StreamStatus
	lastError   string
	startedAt   time.Time
	bytesRead   atomic.Int64
	bitrateKbps atomic.Int64

	onEmpty func(streamID string)
}

func NewStream(id, url, ffmpegPath string, idleTimeout time.Duration, onEmpty func(string)) *Stream {
	ctx, cancel := context.WithCancel(context.Background())
	return &Stream{
		ID:          id,
		URL:         url,
		ffmpegPath:  ffmpegPath,
		idleTimeout: idleTimeout,
		clients:     make(map[*Client]bool),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		ctx:         ctx,
		cancel:      cancel,
		status:      StatusConnecting,
		startedAt:   time.Now(),
		onEmpty:     onEmpty,
	}
}

func (s *Stream) RegisterClient(c *Client) {
	s.register <- c
}

func (s *Stream) UnregisterClient(c *Client) {
	s.unregister <- c
}

func (s *Stream) GetStats() StreamStats {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var uptime int64
	if !s.startedAt.IsZero() && s.status == StatusLive {
		uptime = int64(time.Since(s.startedAt).Seconds())
	}

	return StreamStats{
		Status:        s.status,
		Viewers:       len(s.clients),
		BitrateKbps:   s.bitrateKbps.Load(),
		FPS:           30.0,
		StartedAt:     s.startedAt,
		UptimeSeconds: uptime,
		LastError:     s.lastError,
	}
}

func (s *Stream) Start() {
	go s.runHub()
	go s.runWorker()
	go s.runBitrateCalculator()
}

func (s *Stream) Stop() {
	s.cancel()
}

func (s *Stream) runHub() {
	var idleTimer *time.Timer
	var idleChan <-chan time.Time

	resetIdleTimer := func() {
		if idleTimer != nil {
			idleTimer.Stop()
		}
		idleTimer = time.NewTimer(s.idleTimeout)
		idleChan = idleTimer.C
	}

	stopIdleTimer := func() {
		if idleTimer != nil {
			idleTimer.Stop()
			idleTimer = nil
			idleChan = nil
		}
	}

	for {
		select {
		case <-s.ctx.Done():
			stopIdleTimer()
			s.mu.Lock()
			s.status = StatusStopped
			for client := range s.clients {
				close(client.Send)
				delete(s.clients, client)
			}
			s.mu.Unlock()
			return

		case client := <-s.register:
			stopIdleTimer()
			s.mu.Lock()
			s.clients[client] = true
			log.Printf("[Stream %s] Client registered (total: %d)", s.ID, len(s.clients))
			s.mu.Unlock()

		case client := <-s.unregister:
			s.mu.Lock()
			if _, ok := s.clients[client]; ok {
				delete(s.clients, client)
				close(client.Send)
				log.Printf("[Stream %s] Client unregistered (remaining: %d)", s.ID, len(s.clients))
			}
			empty := len(s.clients) == 0
			s.mu.Unlock()

			if empty {
				log.Printf("[Stream %s] No active viewers, starting idle timer (%v)", s.ID, s.idleTimeout)
				resetIdleTimer()
			}

		case <-idleChan:
			s.mu.RLock()
			clientCount := len(s.clients)
			s.mu.RUnlock()

			if clientCount == 0 {
				log.Printf("[Stream %s] Idle timeout expired with 0 clients. Terminating stream.", s.ID)
				s.Stop()
				if s.onEmpty != nil {
					s.onEmpty(s.ID)
				}
				return
			}
		}
	}
}

func (s *Stream) runBitrateCalculator() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-s.ctx.Done():
			return
		case <-ticker.C:
			bytes := s.bytesRead.Swap(0)
			kbps := (bytes * 8) / 1000
			s.bitrateKbps.Store(kbps)
		}
	}
}

func (s *Stream) broadcastFrame(frame []byte) {
	s.bytesRead.Add(int64(len(frame)))

	s.mu.RLock()
	defer s.mu.RUnlock()

	for client := range s.clients {
		select {
		case client.Send <- frame:
		default:
			// Buffer full: drop frame for slow client to prevent stalling others
		}
	}
}

func (s *Stream) buildFFmpegArgs() []string {
	isSynthetic := strings.HasPrefix(s.URL, "synthetic://") || strings.HasPrefix(s.URL, "test://")

	if isSynthetic {
		// Generate an ultra-smooth high-definition surveillance test card with live clock
		var testFilter string
		if strings.Contains(s.URL, "motion") {
			testFilter = "testsrc=size=1280x720:rate=30,drawtext=text='CAM-02-MOTION %{localtime}':fontcolor=white:fontsize=28:box=1:boxcolor=black@0.6:x=20:y=20"
		} else if strings.Contains(s.URL, "gate") {
			testFilter = "smptebars=size=1280x720:rate=30,drawtext=text='CAM-03-GATE %{localtime}':fontcolor=white:fontsize=28:box=1:boxcolor=black@0.6:x=20:y=20"
		} else {
			testFilter = "testsrc=size=1280x720:rate=30,drawtext=text='SKYLARK-CAM-01 %{localtime}':fontcolor=white:fontsize=28:box=1:boxcolor=black@0.6:x=20:y=20"
		}

		return []string{
			"-loglevel", "warning",
			"-re",
			"-f", "lavfi",
			"-i", testFilter,
			"-f", "mpegts",
			"-codec:v", "mpeg1video",
			"-s", "1280x720",
			"-b:v", "1500k",
			"-maxrate", "2000k",
			"-bufsize", "3000k",
			"-r", "30",
			"-bf", "0",
			"-an",
			"-",
		}
	}

	// Real RTSP Stream: optimized for ultra-low latency & fast reconnect
	return []string{
		"-loglevel", "warning",
		"-rtsp_transport", "tcp",
		"-reorder_queue_size", "0",
		"-buffer_size", "1024000",
		"-max_delay", "500000",
		"-i", s.URL,
		"-f", "mpegts",
		"-codec:v", "mpeg1video",
		"-s", "1280x720",
		"-b:v", "1500k",
		"-maxrate", "2500k",
		"-bufsize", "3000k",
		"-r", "30",
		"-bf", "0",
		"-an",
		"-",
	}
}

func (s *Stream) runWorker() {
	backoff := 1 * time.Second
	const maxBackoff = 8 * time.Second

	for {
		select {
		case <-s.ctx.Done():
			return
		default:
		}

		s.mu.Lock()
		s.status = StatusConnecting
		s.mu.Unlock()

		args := s.buildFFmpegArgs()
		log.Printf("[Stream %s] Starting FFmpeg with target: %s", s.ID, s.URL)

		cmd := exec.CommandContext(s.ctx, s.ffmpegPath, args...)

		stdout, err := cmd.StdoutPipe()
		if err != nil {
			s.handleError(fmt.Sprintf("Failed to get stdout: %v", err))
			time.Sleep(backoff)
			continue
		}

		stderr, err := cmd.StderrPipe()
		if err == nil {
			go func() {
				scanner := bufio.NewScanner(stderr)
				for scanner.Scan() {
					txt := scanner.Text()
					if strings.Contains(txt, "Error") || strings.Contains(txt, "Connection refused") {
						log.Printf("[FFmpeg %s stderr] %s", s.ID, txt)
					}
				}
			}()
		}

		if err := cmd.Start(); err != nil {
			s.handleError(fmt.Sprintf("Failed to start FFmpeg: %v", err))
			backoff = min(backoff*2, maxBackoff)
			time.Sleep(backoff)
			continue
		}

		s.mu.Lock()
		s.status = StatusLive
		s.startedAt = time.Now()
		s.lastError = ""
		s.mu.Unlock()
		backoff = 1 * time.Second // Reset backoff on successful connect

		// Read chunks from stdout and broadcast to clients
		buf := make([]byte, 16384)
		for {
			n, err := stdout.Read(buf)
			if n > 0 {
				chunk := make([]byte, n)
				copy(chunk, buf[:n])
				s.broadcastFrame(chunk)
			}
			if err != nil {
				if err != io.EOF && !strings.Contains(err.Error(), "file already closed") {
					log.Printf("[Stream %s] Read finished: %v", s.ID, err)
				}
				break
			}
		}

		_ = cmd.Wait()

		select {
		case <-s.ctx.Done():
			return
		default:
			s.mu.Lock()
			s.status = StatusReconnecting
			s.lastError = "Connection dropped. Reconnecting..."
			s.mu.Unlock()
			log.Printf("[Stream %s] Reconnecting in %v...", s.ID, backoff)
			time.Sleep(backoff)
			backoff = min(backoff*2, maxBackoff)
		}
	}
}

func (s *Stream) handleError(msg string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.status = StatusError
	s.lastError = msg
	log.Printf("[Stream %s] %s", s.ID, msg)
}

func min(a, b time.Duration) time.Duration {
	if a < b {
		return a
	}
	return b
}
