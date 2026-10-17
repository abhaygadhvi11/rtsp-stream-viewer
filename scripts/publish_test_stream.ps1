<#
.SYNOPSIS
Publishes a synthetic RTSP surveillance camera test feed to a local MediaMTX server.
#>

param(
    [string]$TargetRtspUrl = "rtsp://localhost:8554/live/cam1",
    [string]$CameraLabel = "CCTV-CAM-01"
)

Write-Host "Starting FFmpeg RTSP publisher to: $TargetRtspUrl" -ForegroundColor Cyan

# Locate ffmpeg
$ffmpeg = (Get-Command ffmpeg -ErrorAction SilentlyContinue).Source
if (-not $ffmpeg) {
    $wingetFfmpeg = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\*FFmpeg*" -Filter "ffmpeg.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
    if ($wingetFfmpeg) { $ffmpeg = $wingetFfmpeg } else { $ffmpeg = "ffmpeg" }
}

Write-Host "Using FFmpeg at: $ffmpeg" -ForegroundColor Green

& $ffmpeg `
  -re `
  -f lavfi -i "testsrc=size=1280x720:rate=30,drawtext=text='$CameraLabel %{localtime}':fontcolor=white:fontsize=28:box=1:boxcolor=black@0.6:x=20:y=20" `
  -c:v libx264 -preset ultrafast -tune zerolatency -b:v 1500k `
  -f rtsp -rtsp_transport tcp $TargetRtspUrl
