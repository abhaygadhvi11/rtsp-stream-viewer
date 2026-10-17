import React from 'react';
import { X, Download, Trash2, Camera, Calendar } from 'lucide-react';
import type { SnapshotItem } from '../types/stream';

interface SnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: SnapshotItem[];
  onDeleteSnapshot: (id: string) => void;
  onClearAll: () => void;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({
  isOpen,
  onClose,
  snapshots,
  onDeleteSnapshot,
  onClearAll,
}) => {
  if (!isOpen) return null;

  const downloadSnapshot = (s: SnapshotItem) => {
    const a = document.createElement('a');
    a.href = s.dataUrl;
    a.download = `${s.streamName.toLowerCase().replace(/\s+/g, '_')}_${s.timestamp}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '840px' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={20} color="#06b6d4" />
            <h2 className="modal-title">Snapshot Gallery ({snapshots.length})</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {snapshots.length > 0 && (
              <button 
                className="btn btn-danger" 
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                onClick={onClearAll}
              >
                Clear All
              </button>
            )}
            <button className="modal-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {snapshots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
              <Camera size={40} style={{ opacity: 0.4, margin: '0 auto 12px' }} />
              <p>No snapshots captured yet.</p>
              <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                Hover over any live stream card and click the camera icon to capture high-res frames.
              </p>
            </div>
          ) : (
            <div className="snapshot-grid">
              {snapshots.map((s) => (
                <div key={s.id} className="snapshot-item">
                  <img src={s.dataUrl} alt={s.streamName} className="snapshot-img" />
                  <div className="snapshot-info">
                    <div>
                      <div className="snapshot-name">{s.streamName}</div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Calendar size={10} />
                        {new Date(s.timestamp).toLocaleTimeString()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        className="ctrl-btn" 
                        style={{ width: '28px', height: '28px' }}
                        title="Download JPG"
                        onClick={() => downloadSnapshot(s)}
                      >
                        <Download size={13} />
                      </button>
                      <button 
                        className="ctrl-btn ctrl-btn-danger" 
                        style={{ width: '28px', height: '28px' }}
                        title="Delete"
                        onClick={() => onDeleteSnapshot(s.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
