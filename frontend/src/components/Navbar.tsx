import React from 'react';
import { 
  Cctv, 
  Plus, 
  Grid2X2, 
  Grid3X3, 
  Square, 
  LayoutGrid, 
  Camera, 
  Pause, 
  Play, 
  Server
} from 'lucide-react';
import type { GridLayout } from '../types/stream';

interface NavbarProps {
  streamCount: number;
  layout: GridLayout;
  onLayoutChange: (layout: GridLayout) => void;
  onOpenAddModal: () => void;
  onOpenSnapshots: () => void;
  snapshotCount: number;
  isAllPaused: boolean;
  onToggleAllPause: () => void;
  backendOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  streamCount,
  layout,
  onLayoutChange,
  onOpenAddModal,
  onOpenSnapshots,
  snapshotCount,
  isAllPaused,
  onToggleAllPause,
  backendOnline,
}) => {
  return (
    <header className="navbar">
      {/* Brand Section */}
      <div className="brand-section">
        <div className="brand-logo">
          <Cctv size={22} />
        </div>
        <div className="brand-title">
          <span className="brand-name">SKYLARK VMS</span>
          <span className="brand-subtitle">
            <span className="status-indicator-dot" />
            RTSP Stream Viewer
          </span>
        </div>
      </div>

      {/* Center Layout Picker */}
      <div className="layout-picker">
        <button
          className={`layout-btn ${layout === '1x1' ? 'active' : ''}`}
          onClick={() => onLayoutChange('1x1')}
          title="Single Camera Focus (1x1)"
        >
          <Square size={13} />
          <span>1×1</span>
        </button>
        <button
          className={`layout-btn ${layout === '2x2' ? 'active' : ''}`}
          onClick={() => onLayoutChange('2x2')}
          title="Quad View (2x2)"
        >
          <Grid2X2 size={13} />
          <span>2×2</span>
        </button>
        <button
          className={`layout-btn ${layout === '3x3' ? 'active' : ''}`}
          onClick={() => onLayoutChange('3x3')}
          title="Nine-Split Grid (3x3)"
        >
          <Grid3X3 size={13} />
          <span>3×3</span>
        </button>
        <button
          className={`layout-btn ${layout === 'auto' ? 'active' : ''}`}
          onClick={() => onLayoutChange('auto')}
          title="Auto Responsive Grid"
        >
          <LayoutGrid size={13} />
          <span>Auto</span>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="nav-actions">
        {/* Backend Status Indicator */}
        <div 
          className="metric-item" 
          style={{ 
            fontSize: '0.75rem', 
            marginRight: '8px', 
            color: backendOnline ? '#34d399' : '#f87171' 
          }}
          title={backendOnline ? "Go Gateway Online" : "Go Gateway Offline"}
        >
          <Server size={14} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
            {backendOnline ? 'GATEWAY UP' : 'OFFLINE'}
          </span>
        </div>

        {streamCount > 0 && (
          <button 
            className="btn btn-secondary" 
            onClick={onToggleAllPause}
            title={isAllPaused ? "Play all streams" : "Pause all streams"}
          >
            {isAllPaused ? <Play size={14} /> : <Pause size={14} />}
            <span>{isAllPaused ? 'Play All' : 'Pause All'}</span>
          </button>
        )}

        <button 
          className="btn btn-secondary" 
          onClick={onOpenSnapshots}
          title="View Snapshots Gallery"
        >
          <Camera size={14} />
          <span>Snapshots ({snapshotCount})</span>
        </button>

        <button 
          className="btn btn-primary" 
          onClick={onOpenAddModal}
        >
          <Plus size={16} />
          <span>Add Camera</span>
        </button>
      </div>
    </header>
  );
};
