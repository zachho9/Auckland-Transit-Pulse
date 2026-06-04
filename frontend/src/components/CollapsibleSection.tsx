import { useState, type ReactNode } from 'react';

interface Props {
  title: string;
  defaultExpanded?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({ title, defaultExpanded = true, children }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div style={{ borderBottom: '1px solid var(--border-col)' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.55rem 1rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{
          fontSize: '0.62rem',
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
        }}>
          {title}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>
      {expanded && <div>{children}</div>}
    </div>
  );
}
