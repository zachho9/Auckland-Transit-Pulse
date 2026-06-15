import { SnapshotProvider } from './context/SnapshotContext';
import { RouteSelectionProvider } from './context/RouteSelectionContext';
import { Header } from './components/Header';
import { MapPanel } from './components/MapPanel';
import { ScorecardPanel } from './components/ScorecardPanel';
import { LeagueTablePanel } from './components/LeagueTablePanel';
import { HistoryPanel } from './components/HistoryPanel';
import { HourlyPanel } from './components/HourlyPanel';
import { AlertsPanel } from './components/AlertsPanel';
import { CollapsibleSection } from './components/CollapsibleSection';
import { useState } from 'react';

export type Theme = 'dark' | 'light';

export function App() {
  const [theme, setTheme] = useState<Theme>('light');

  return (
    <SnapshotProvider>
      <RouteSelectionProvider>
        <div
          data-theme={theme}
          className="flex flex-col h-screen text-white min-w-[1280px] overflow-hidden"
          style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
        >
          <Header theme={theme} onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />
          <div className="flex flex-1 overflow-hidden">
            <main className="flex-[62] overflow-hidden min-w-0">
              <MapPanel theme={theme} />
            </main>
            <aside
              className="flex-[38] flex flex-col overflow-hidden min-w-0"
              style={{ borderLeft: '1px solid var(--border-col)', background: 'var(--bg-surface)' }}
            >
              <ScorecardPanel />
              <div className="flex-1 overflow-y-auto">
                <CollapsibleSection title="Worst Routes">
                  <LeagueTablePanel />
                </CollapsibleSection>
                <CollapsibleSection title="Hourly On-Time">
                  <HourlyPanel />
                </CollapsibleSection>
                <CollapsibleSection title="7-Day On-time">
                  <HistoryPanel />
                </CollapsibleSection>
                <CollapsibleSection title="Service Alerts">
                  <AlertsPanel />
                </CollapsibleSection>
              </div>
            </aside>
          </div>
        </div>
      </RouteSelectionProvider>
    </SnapshotProvider>
  );
}
