import { useSnapshot } from '../context/SnapshotContext';
import type { TransitMode } from 'shared/types';

const MODE_LABELS: Record<TransitMode, string> = {
  bus: 'Bus',
  train: 'Train',
  ferry: 'Ferry',
};

function ModeIcon({ mode }: { mode: TransitMode }) {
  if (mode === 'bus') {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
        <circle cx="5" cy="5" r="4.5" fillOpacity={0.8} />
      </svg>
    );
  }
  if (mode === 'train') {
    return (
      <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
        <rect x="0.5" y="0.5" width="10" height="10" rx="2" fillOpacity={0.8} />
      </svg>
    );
  }
  return (
    <svg width="11" height="10" viewBox="0 0 11 10" fill="currentColor">
      <polygon points="5.5,0.5 10.5,9.5 0.5,9.5" fillOpacity={0.8} />
    </svg>
  );
}

function ArcGauge({ pct, colour }: { pct: number; colour: string }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <svg viewBox="0 0 80 80" style={{ width: '100%', height: '100%' }}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--border-col)" strokeWidth="5" />
      <circle
        cx="40" cy="40" r={r}
        fill="none"
        stroke={colour}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 40 40)"
        style={{ transition: 'stroke-dashoffset 0.9s ease' }}
      />
    </svg>
  );
}

function pctColour(pct: number): string {
  if (pct >= 90) return '#22c55e';
  if (pct >= 75) return '#f59e0b';
  return '#ef4444';
}

export function ScorecardPanel() {
  const { snapshot } = useSnapshot();
  const modes: TransitMode[] = ['bus', 'train', 'ferry'];

  return (
    <section className="shrink-0 p-4" style={{ borderBottom: '1px solid var(--border-col)' }}>
      <h2 style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
        Network Scorecard
      </h2>
      <div className="flex justify-between gap-2">
        {modes.map(mode => {
          const stats = snapshot?.scorecard[mode];
          const pct = stats?.percentOnTime ?? 0;
          const colour = stats ? pctColour(pct) : 'var(--text-muted)';
          return (
            <div key={mode} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="relative" style={{ width: 72, height: 72 }}>
                <ArcGauge pct={stats ? pct : 0} colour={colour} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.05rem', fontWeight: 700, color: colour, lineHeight: 1 }}>
                    {stats ? `${pct}%` : '—'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)', fontSize: '0.68rem' }}>
                <ModeIcon mode={mode} />
                <span>{MODE_LABELS[mode]}</span>
              </div>
              {stats && (
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                  {stats.active} active
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
