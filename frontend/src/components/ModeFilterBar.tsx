import type { TransitMode } from 'shared/types';

const MODES: TransitMode[] = ['bus', 'train', 'ferry'];

const MODE_LABELS: Record<TransitMode, string> = {
  bus: 'Bus',
  train: 'Train',
  ferry: 'Ferry',
};

interface Props {
  activeModes: Set<TransitMode>;
  onToggle: (mode: TransitMode) => void;
}

function ModeIcon({ mode }: { mode: TransitMode }) {
  if (mode === 'bus') {
    return (
      <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
        <circle cx="4" cy="4" r="3.5" />
      </svg>
    );
  }
  if (mode === 'train') {
    return (
      <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor">
        <rect x="0.5" y="0.5" width="8" height="8" rx="1.5" />
      </svg>
    );
  }
  return (
    <svg width="9" height="8" viewBox="0 0 9 8" fill="currentColor">
      <polygon points="4.5,0.5 8.5,7.5 0.5,7.5" />
    </svg>
  );
}

export function ModeFilterBar({ activeModes, onToggle }: Props) {
  return (
    <div
      className="flex gap-0.5"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-col)',
        borderRadius: '6px',
        padding: '4px 6px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      }}
    >
      {MODES.map(mode => {
        const isActive = activeModes.has(mode);
        return (
          <button
            key={mode}
            onClick={() => onToggle(mode)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.68rem',
              padding: '3px 9px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              background: isActive ? 'rgba(11,181,216,0.14)' : 'transparent',
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'background 0.15s, color 0.15s',
              fontFamily: "'Barlow', sans-serif",
              fontWeight: 500,
            }}
          >
            <ModeIcon mode={mode} />
            {MODE_LABELS[mode]}
          </button>
        );
      })}
    </div>
  );
}
