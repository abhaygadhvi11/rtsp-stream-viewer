import React, { useState } from 'react';
import { X, Plus, Video, Radio, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface AddStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStream: (url: string, name: string) => void;
}

interface PresetOption {
  name: string;
  url: string;
  desc: string;
}

const PRESETS: PresetOption[] = [
  {
    name: 'Camera 01 - Main Entrance (Pattern)',
    url: 'synthetic://cam1-entrance',
    desc: 'High-FPS test pattern with live clock',
  },
  {
    name: 'Camera 02 - Perimeter Motion',
    url: 'synthetic://cam2-motion',
    desc: 'Synthetic motion sensor camera',
  },
  {
    name: 'Camera 03 - Security Gate (SMPTE)',
    url: 'synthetic://cam3-gate',
    desc: 'Color bars with timecode overlay',
  },
  {
    name: 'Local MediaMTX Cam 1',
    url: 'rtsp://localhost:8554/live/cam1',
    desc: 'MediaMTX local test stream',
  },
  {
    name: 'Local MediaMTX Cam 2',
    url: 'rtsp://localhost:8554/live/cam2',
    desc: 'MediaMTX secondary feed',
  },
  {
    name: 'Public Demo RTSP Stream',
    url: 'rtsp://rtspstream.com/sample',
    desc: 'Internet public sample RTSP feed',
  },
];

export const AddStreamModal: React.FC<AddStreamModalProps> = ({
  isOpen,
  onClose,
  onAddStream,
}) => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: PresetOption) => {
    setUrl(preset.url);
    setName(preset.name);
    setProbeResult(null);
  };

  const handleProbe = async () => {
    if (!url.trim()) return;
    setProbing(true);
    setProbeResult(null);

    try {
      const backendPort = import.meta.env.VITE_BACKEND_PORT || '8080';
      const res = await fetch(`http://localhost:${backendPort}/api/streams/probe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.reachable) {
        setProbeResult({ ok: true, message: data.details || 'Connection verified successfully!' });
      } else {
        setProbeResult({ ok: false, message: data.error || 'Unable to reach RTSP endpoint.' });
      }
    } catch (err: any) {
      setProbeResult({ ok: false, message: err.message || 'Network error reaching backend server.' });
    } finally {
      setProbing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const streamName = name.trim() || `Camera ${Math.floor(100 + Math.random() * 900)}`;
    onAddStream(url.trim(), streamName);
    setUrl('');
    setName('');
    setProbeResult(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Video size={20} color="#06b6d4" />
            <h2 className="modal-title">Add RTSP Stream</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">RTSP Stream URL</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="rtsp://192.168.1.100:554/live or synthetic://cam1"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setProbeResult(null);
                  }}
                  required
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                  onClick={handleProbe}
                  disabled={probing || !url.trim()}
                >
                  {probing ? <Loader2 size={14} className="animate-spin" /> : 'Probe'}
                </button>
              </div>

              {probeResult && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  marginTop: '4px',
                  color: probeResult.ok ? '#34d399' : '#f87171'
                }}>
                  {probeResult.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  <span>{probeResult.message}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Camera Name / Label (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Front Gate Camera"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <span className="preset-pills-label">Quick Test Presets (One-Click Setup):</span>
              <div className="preset-grid">
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="preset-card"
                    onClick={() => handleSelectPreset(p)}
                  >
                    <div className="preset-name">
                      <Radio size={12} color="#06b6d4" />
                      <span>{p.name}</span>
                    </div>
                    <div className="preset-url">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!url.trim()}>
              <Plus size={16} />
              Add Stream
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
