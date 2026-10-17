package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"rtsp-stream-viewer-backend/internal/config"
	"rtsp-stream-viewer-backend/internal/stream"
)

func NewRouter(cfg *config.Config, mgr *stream.Manager) http.Handler {
	r := chi.NewRouter()

	// Standard middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Cross-Origin Resource Sharing (CORS)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	handlers := NewHandlers(mgr)

	// Public Health Endpoint
	r.Get("/health", handlers.Health)

	// REST APIs
	r.Route("/api", func(api chi.Router) {
		api.Get("/streams", handlers.ListStreams)
		api.Post("/streams", handlers.AddStream)
		api.Post("/streams/probe", handlers.ProbeStream)
		api.Delete("/streams/{id}", handlers.DeleteStream)
	})

	// WebSocket Stream Endpoint
	r.Get("/ws/stream", HandleWebSocket(mgr))

	return r
}
