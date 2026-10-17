import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StreamGrid } from './components/StreamGrid';
import { AddStreamModal } from './components/AddStreamModal';
import { SnapshotModal } from './components/SnapshotModal';
import type { StreamItem, GridLayout, SnapshotItem } from './types/stream';
import { Shield, Eye, Cpu, Radio, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Toast {
  id: string;
  text: string;
  type: 'success' | 'info' | 'error';
}

const INITIAL_STREAMS: StreamItem[] = [
  {
    id: 'cam1-entrance',
    name: 'Camera 01 - Main Entrance',
    url: 'synthetic://cam1-entrance',
    createdAt: Date.now(),
    isPaused: false,
  },
  {
    id: 'cam2-motion',
    name: 'Camera 02 - Perimeter Motion',
    url: 'synthetic://cam2-motion',
    createdAt: Date.now(),
    isPaused: false,
  },
];

export const App: React.FC = () => {
  const [streams, setStreams] = useState<StreamItem[]>(() => {
    const saved = localStorage.getItem('skylark_streams');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_STREAMS;
  });

  const [layout, setLayout] = useState<GridLayout>('2x2');
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isAllPaused, setIsAllPaused] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Persist streams to localStorage
  useEffect(() => {
    localStorage.setItem('skylark_streams', JSON.stringify(streams));
  }, [streams]);

  // Health check polling
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const backendPort = import.meta.env.VITE_BACKEND_PORT || '8080';
        const res = await fetch(`http://localhost:${backendPort}/health`, { signal: AbortSignal.timeout(3000) });
        setBackendOnline(res.ok);
      } catch (e) {
        setBackendOnline(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  const addToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleAddStream = (url: string, name: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newStream: StreamItem = {
      id,
      name,
      url,
      createdAt: Date.now(),
      isPaused: false,
    };
    setStreams((prev) => [...prev, newStream]);
    addToast(`Added camera: ${name}`, 'success');
  };

  const handleRemoveStream = (id: string) => {
    const stream = streams.find((s) => s.id === id);
    setStreams((prev) => prev.filter((s) => s.id !== id));
    addToast(`Removed camera: ${stream ? stream.name : id}`, 'info');
  };

  const handleSnapshot = (snapshot: SnapshotItem) => {
    setSnapshots((prev) => [snapshot, ...prev]);
    addToast(`Captured snapshot from ${snapshot.streamName}`, 'success');
  };

  const handleToggleAllPause = () => {
    const nextState = !isAllPaused;
    setIsAllPaused(nextState);
    setStreams((prev) =>
      prev.map((s) => ({
        ...s,
        isPaused: nextState,
      }))
    );
    addToast(nextState ? 'Paused all video streams' : 'Resumed all video streams', 'info');
  };

  const handleDeleteSnapshot = (id: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleClearAllSnapshots = () => {
    setSnapshots([]);
    addToast('Cleared all snapshots', 'info');
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        streamCount={streams.length}
        layout={layout}
        onLayoutChange={setLayout}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenSnapshots={() => setIsSnapshotModalOpen(true)}
        snapshotCount={snapshots.length}
        isAllPaused={isAllPaused}
        onToggleAllPause={handleToggleAllPause}
        backendOnline={backendOnline}
      />

      {/* Sub-header status bar */}
      <div className="system-status-bar">
        <div className="system-metrics">
          <div className="metric-item">
            <Radio size={13} color="#06b6d4" />
            <span>Active Streams:</span>
            <span className="metric-value">{streams.length}</span>
          </div>

          <div className="metric-item">
            <Cpu size={13} color="#6366f1" />
            <span>Engine:</span>
            <span className="metric-value">Go + FFmpeg + WebSockets</span>
          </div>

          <div className="metric-item">
            <Eye size={13} color="#10b981" />
            <span>Transport Latency:</span>
            <span className="metric-value">&lt; 150ms</span>
          </div>
        </div>

        <div className="metric-item">
          <Shield size={13} color="#06b6d4" />
          <span style={{ fontFamily: 'var(--font-mono)' }}>VMS STATION #01</span>
        </div>
      </div>

      {/* Main Stream Grid Area */}
      <main className="main-content">
        <StreamGrid
          streams={streams}
          layout={layout}
          onRemove={handleRemoveStream}
          onSnapshot={handleSnapshot}
          onOpenAddModal={() => setIsAddModalOpen(true)}
        />
      </main>

      {/* Add Stream Modal */}
      <AddStreamModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddStream={handleAddStream}
      />

      {/* Snapshot Gallery Modal */}
      <SnapshotModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        snapshots={snapshots}
        onDeleteSnapshot={handleDeleteSnapshot}
        onClearAll={handleClearAllSnapshots}
      />

      {/* Toast Notification Stack */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === 'success' && <CheckCircle2 size={16} color="#10b981" />}
            {toast.type === 'info' && <Radio size={16} color="#06b6d4" />}
            {toast.type === 'error' && <AlertTriangle size={16} color="#ef4444" />}
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
