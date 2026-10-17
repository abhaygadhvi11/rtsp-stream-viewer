import React from 'react';
import { Video, Plus } from 'lucide-react';
import type { StreamItem, GridLayout, SnapshotItem } from '../types/stream';
import { StreamCard } from './StreamCard';

interface StreamGridProps {
  streams: StreamItem[];
  layout: GridLayout;
  onRemove: (id: string) => void;
  onSnapshot: (snapshot: SnapshotItem) => void;
  onOpenAddModal: () => void;
}

export const StreamGrid: React.FC<StreamGridProps> = ({
  streams,
  layout,
  onRemove,
  onSnapshot,
  onOpenAddModal,
}) => {
  if (streams.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon-wrap">
          <Video size={32} />
        </div>
        <h3 className="empty-title">No Active Streams</h3>
        <p className="empty-desc">
          Add an RTSP stream URL to begin monitoring live surveillance video feeds with sub-150ms latency.
        </p>
        <button className="btn btn-primary" onClick={onOpenAddModal}>
          <Plus size={16} />
          Add First Camera
        </button>
      </div>
    );
  }

  return (
    <div className={`stream-grid grid-${layout}`}>
      {streams.map((stream) => (
        <StreamCard
          key={stream.id}
          stream={stream}
          onRemove={onRemove}
          onSnapshot={onSnapshot}
        />
      ))}
    </div>
  );
};
