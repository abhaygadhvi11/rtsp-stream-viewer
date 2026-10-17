# Stage 1: Build Go binary from repository root context
FROM golang:1.22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

# Copy Go module manifests from backend directory
COPY backend/go.mod backend/go.sum* ./
RUN go mod download

# Copy backend source code
COPY backend/ ./

# Compile statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server ./cmd/server

# Stage 2: Minimal runtime image with FFmpeg
FROM alpine:3.19

WORKDIR /app

RUN apk add --no-cache ffmpeg ca-certificates tzdata

COPY --from=builder /app/server /app/server

ENV PORT=8080
ENV FFMPEG_PATH=/usr/bin/ffmpeg

EXPOSE 8080

CMD ["/app/server"]
