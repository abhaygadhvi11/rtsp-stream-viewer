export type StreamStatus = 'CONNECTING' | 'LIVE' | 'RECONNECTING' | 'ERROR' | 'PAUSED';

export type GridLayout = '1x1' | '2x2' | '3x3' | 'auto';

export interface StreamItem {
  id: string;
  name: string;
  url: string;
  createdAt: number;
  isPaused?: boolean;
}

export interface StreamStats {
  status: StreamStatus;
  fps: number;
  bitrateKbps: number;
  viewers: number;
  uptimeSeconds: number;
  lastError?: string;
}

export interface SnapshotItem {
  id: string;
  streamId: string;
  streamName: string;
  dataUrl: string;
  timestamp: number;
}
