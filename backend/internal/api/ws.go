package api

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
	"rtsp-stream-viewer-backend/internal/stream"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 16384,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow cross-origin WebSocket connections
	},
}

func HandleWebSocket(mgr *stream.Manager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		streamURL := r.URL.Query().Get("url")
		streamID := r.URL.Query().Get("id")

		if streamURL == "" && streamID == "" {
			http.Error(w, "Query parameter 'url' or 'id' is required", http.StatusBadRequest)
			return
		}

		var s *stream.Stream
		var err error

		if streamURL != "" {
			s, err = mgr.GetOrCreateStream(streamURL, streamID)
			if err != nil {
				http.Error(w, "Failed to initialize stream: "+err.Error(), http.StatusInternalServerError)
				return
			}
		} else {
			var ok bool
			s, ok = mgr.GetStream(streamID)
			if !ok {
				http.Error(w, "Stream ID not found", http.StatusNotFound)
				return
			}
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("[WebSocket Upgrade Error] %v", err)
			return
		}

		clientIDBytes := make([]byte, 4)
		_, _ = rand.Read(clientIDBytes)
		clientID := hex.EncodeToString(clientIDBytes)

		client := stream.NewClient(clientID, s, conn)
		s.RegisterClient(client)

		go client.WritePump()
		go client.ReadPump()
	}
}
