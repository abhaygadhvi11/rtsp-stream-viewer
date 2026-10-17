package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"rtsp-stream-viewer-backend/internal/stream"
)

type Handlers struct {
	mgr       *stream.Manager
	startTime time.Time
}

func NewHandlers(mgr *stream.Manager) *Handlers {
	return &Handlers{
		mgr:       mgr,
		startTime: time.Now(),
	}
}

func (h *Handlers) Health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	streams := h.mgr.ListStreams()

	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":         "ok",
		"uptime_seconds": int64(time.Since(h.startTime).Seconds()),
		"active_streams": len(streams),
		"service":        "Skylark RTSP Stream Gateway",
		"timestamp":      time.Now(),
	})
}

func (h *Handlers) ListStreams(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	streams := h.mgr.ListStreams()
	_ = json.NewEncoder(w).Encode(streams)
}

type AddStreamRequest struct {
	URL string `json:"url"`
	ID  string `json:"id,omitempty"`
}

func (h *Handlers) AddStream(w http.ResponseWriter, r *http.Request) {
	var req AddStreamRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	s, err := h.mgr.GetOrCreateStream(req.URL, req.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"id":    s.ID,
		"url":   s.URL,
		"stats": s.GetStats(),
	})
}

type ProbeRequest struct {
	URL string `json:"url"`
}

func (h *Handlers) ProbeStream(w http.ResponseWriter, r *http.Request) {
	var req ProbeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	ok, details, err := h.mgr.ProbeRTSP(req.URL)
	w.Header().Set("Content-Type", "application/json")
	if !ok {
		w.WriteHeader(http.StatusBadGateway)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"reachable": false,
			"error":     err.Error(),
			"details":   details,
		})
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"reachable": true,
		"details":   details,
	})
}

func (h *Handlers) DeleteStream(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Stream ID required", http.StatusBadRequest)
		return
	}

	h.mgr.RemoveStream(id)
	w.WriteHeader(http.StatusNoContent)
}
