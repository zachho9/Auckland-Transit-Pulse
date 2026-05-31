import { useState } from 'react';
import { SnapshotProvider } from './context/SnapshotContext';
import { Header } from './components/Header';
import { MapPanel } from './components/MapPanel';
import { ScorecardPanel } from './components/ScorecardPanel';
import { LeagueTablePanel } from './components/LeagueTablePanel';
import { AlertsPanel } from './components/AlertsPanel';

export type Theme = 'dark' | 'light';

export function App() {
  const [theme, setTheme] = useState<Theme>('dark');

  function toggleTheme() {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
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
          <main className="flex-[62] overflow-hidden">
            <MapPanel theme={theme} />
          </main>
          <aside
            className="flex-[38] flex flex-col overflow-hidden"
            style={{ borderLeft: '1px solid var(--border-col)', background: 'var(--bg-surface)' }}
          >
            <ScorecardPanel />
            <LeagueTablePanel />
            <AlertsPanel />
          </aside>
        </div>
      </div>
    </SnapshotProvider>
  );
}
