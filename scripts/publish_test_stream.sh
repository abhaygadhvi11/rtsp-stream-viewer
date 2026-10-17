#!/usr/bin/env bash
# Publishes a synthetic surveillance test feed to a MediaMTX RTSP server
set -e

TARGET_URL="${1:-rtsp://localhost:8554/live/cam1}"
LABEL="${2:-CCTV-CAM-01}"

echo "Publishing synthetic RTSP feed to $TARGET_URL (Label: $LABEL)..."

ffmpeg -re \
  -f lavfi -i "testsrc=size=1280x720:rate=30,drawtext=text='$LABEL %{localtime}':fontcolor=white:fontsize=28:box=1:boxcolor=black@0.6:x=20:y=20" \
  -c:v libx264 -preset ultrafast -tune zerolatency -b:v 1500k \
  -f rtsp -rtsp_transport tcp "$TARGET_URL"
