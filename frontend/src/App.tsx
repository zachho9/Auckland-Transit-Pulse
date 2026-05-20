import { SnapshotProvider } from './context/SnapshotContext';
import { Header } from './components/Header';
import { MapPanel } from './components/MapPanel';
import { ScorecardPanel } from './components/ScorecardPanel';
import { LeagueTablePanel } from './components/LeagueTablePanel';
import { AlertsPanel } from './components/AlertsPanel';

export function App() {
  return (
    <SnapshotProvider>
      <div className="flex flex-col h-screen bg-gray-900 text-white min-w-[1280px] overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-[62] overflow-hidden">
            <MapPanel />
          </main>
          <aside className="flex-[38] border-l border-gray-700 flex flex-col overflow-hidden">
            <ScorecardPanel />
            <LeagueTablePanel />
            <AlertsPanel />
          </aside>
        </div>
      </div>
    </SnapshotProvider>
  );
}
