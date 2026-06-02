import { useRef, useState } from 'react';
import { SnapshotProvider } from './context/SnapshotContext';
import { Header } from './components/Header';
import { MapPanel } from './components/MapPanel';
import { ScorecardPanel } from './components/ScorecardPanel';
import { LeagueTablePanel } from './components/LeagueTablePanel';
import { AlertsPanel } from './components/AlertsPanel';

export type Theme = 'dark' | 'light';

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: 8,
        flexShrink: 0,
        cursor: 'row-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: hovered ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        borderTop: '1px solid var(--border-col)',
        borderBottom: '1px solid var(--border-col)',
        transition: 'background 0.12s',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 3,
          opacity: hovered ? 0.9 : 0.4,
          transition: 'opacity 0.12s',
        }}
      >
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: hovered ? 'var(--accent)' : 'var(--text-secondary)',
              transition: 'background 0.12s',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function App() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [rightSplit, setRightSplit] = useState(55);
  const bottomRef = useRef<HTMLDivElement>(null);

  function toggleTheme() {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }

  function onHandleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    const container = bottomRef.current;
    if (!container) return;

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    function onMouseMove(ev: MouseEvent) {
      const rect = container!.getBoundingClientRect();
      const pct = Math.min(Math.max(((ev.clientY - rect.top) / rect.height) * 100, 20), 80);
      setRightSplit(pct);
    }

    function onMouseUp() {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  return (
    <SnapshotProvider>
      <div
        data-theme={theme}
        className="flex flex-col h-screen text-white min-w-[1280px] overflow-hidden"
        style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
      >
        <Header theme={theme} onToggleTheme={toggleTheme} />
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-[62] overflow-hidden min-w-0">
            <MapPanel theme={theme} />
          </main>
          <aside
            className="flex-[38] flex flex-col overflow-hidden min-w-0"
            style={{ borderLeft: '1px solid var(--border-col)', background: 'var(--bg-surface)' }}
          >
            <ScorecardPanel />
            <div ref={bottomRef} className="flex flex-col flex-1 overflow-hidden">
              <div style={{ flex: `0 0 ${rightSplit}%`, overflow: 'hidden', minHeight: 80 }}>
                <LeagueTablePanel />
              </div>
              <ResizeHandle onMouseDown={onHandleMouseDown} />
              <div style={{ flex: 1, overflow: 'hidden', minHeight: 60 }}>
                <AlertsPanel />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </SnapshotProvider>
  );
}
