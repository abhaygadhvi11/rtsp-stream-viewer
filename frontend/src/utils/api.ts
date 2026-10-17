/**
 * API & WebSocket helper for resolving backend gateway endpoints
 */

export const getBackendBaseUrl = (): string => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, '');
  }

  // Check if running in production (e.g. Vercel)
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocal) {
    // Default to the live Render deployment
    return 'https://rtsp-stream-viewer-z0dl.onrender.com';
  }

  const port = import.meta.env.VITE_BACKEND_PORT || '8080';
  return `http://${window.location.hostname}:${port}`;
};

export const getBackendWsUrl = (rtspUrl: string, streamId: string): string => {
  const baseUrl = getBackendBaseUrl();
  const wsBase = baseUrl.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://');
  return `${wsBase}/ws/stream?url=${encodeURIComponent(rtspUrl)}&id=${encodeURIComponent(streamId)}`;
};
