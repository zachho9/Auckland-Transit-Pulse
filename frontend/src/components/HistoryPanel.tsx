import { useEffect, useState, type ReactNode } from 'react';
import type { DailyStats } from 'shared/types';
import { ModeIcon, MODE_LABELS, pctColour } from './ScorecardPanel';
import { delayMinutesToColour } from './MapPanel';

const isMock = import.meta.env.VITE_MOCK === 'true';
const HISTORY_URL = `${((import.meta.env.VITE_API_URL as string) ?? '').replace(/\/$/, '')}/history`;

const MOCK_HISTORY: DailyStats[] = [
  { date: '2026-05-29', sampleCount: 1440, onTimePercent: { bus: 85, train: 72, ferry: 96 }, avgDelayMinutes: 4.2, worstOffenders: [{ routeId: 'r1', name: '274', count: 12 }] },
  { date: '2026-05-30', sampleCount: 1440, onTimePercent: { bus: 82, train: 68, ferry: 98 }, avgDelayMinutes: 5.1, worstOffenders: [{ routeId: 'r1', name: '274', count: 10 }] },
  { date: '2026-05-31', sampleCount: 1440, onTimePercent: { bus: 88, train: 75, ferry: 95 }, avgDelayMinutes: 3.8, worstOffenders: [{ routeId: 'r2', name: '380', count: 8 }] },
  { date: '2026-06-01', sampleCount: 1440, onTimePercent: { bus: 79, train: 65, ferry: 97 }, avgDelayMinutes: 6.3, worstOffenders: [{ routeId: 'r1', name: '274', count: 14 }] },
  { date: '2026-06-02', sampleCount: 1440, onTimePercent: { bus: 83, train: 70, ferry: 94 }, avgDelayMinutes: 4.9, worstOffenders: [{ routeId: 'r2', name: '380', count: 9 }] },
  { date: '2026-06-03', sampleCount: 1440, onTimePercent: { bus: 86, train: 73, ferry: 99 }, avgDelayMinutes: 3.5, worstOffenders: [{ routeId: 'r1', name: '274', count: 11 }] },
  { date: '2026-06-04', sampleCount: 720,  onTimePercent: { bus: 84, train: 71, ferry: 97 }, avgDelayMinutes: 4.0, worstOffenders: [{ routeId: 'r1', name: '274', count: 6 }] },
];

const DELAY_COLOUR = '#ef4444';
const GOOD_COLOUR = '#22c55e';

type Trend = { symbol: string; label: string; colour: string };

function getTrend(current: number, previous: number | undefined, higherIsBetter: boolean): Trend {
  if (previous === undefined) {
    return { symbol: '▬', label: '', colour: 'var(--text-muted)' };
  }
  const delta = Math.round((current - previous) * 10) / 10;
  if (delta === 0) {
    return { symbol: '▬', label: '0', colour: 'var(--text-muted)' };
  }
  const isGood = higherIsBetter ? delta > 0 : delta < 0;
  return {
    symbol: delta > 0 ? '▲' : '▼',
    label: delta > 0 ? `+${delta}` : `${delta}`,
    colour: isGood ? GOOD_COLOUR : DELAY_COLOUR,
  };
}

function TrendBarRow({ icon, label, value, barPct, barColour, trend }: {
  icon: ReactNode;
  label: string;
  value: string;
  barPct: number;
  barColour: string;
  trend: Trend;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '3.5rem', flexShrink: 0, color: 'var(--text-secondary)' }}>
        <span style={{ display: 'inline-flex', width: 11, justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
        <span style={{ fontSize: '0.7rem' }}>{label}</span>
      </div>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--border-col)', overflow: 'hidden' }}>
        <div style={{ width: `${barPct}%`, height: '100%', borderRadius: 3, background: barColour, transition: 'width 0.7s ease' }} />
      </div>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.86rem', color: barColour, lineHeight: 1, minWidth: '3rem', textAlign: 'right' }}>
        {value}
      </span>
      <span style={{ fontSize: '0.64rem', color: trend.colour, minWidth: '2.6rem', textAlign: 'right', flexShrink: 0 }}>
        {trend.symbol} {trend.label}
      </span>
    </div>
  );
}

export function HistoryPanel() {
  const [history, setHistory] = useState<DailyStats[] | null>(isMock ? MOCK_HISTORY : null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (isMock) return;
    fetch(HISTORY_URL)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: DailyStats[]) => setHistory(data))
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <div style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Trends unavailable
      </div>
    );
  }

  if (!history) {
    return (
      <div style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        No historical data yet
      </div>
    );
  }

  const latest = history[history.length - 1];
  const previousDay = history.length > 1 ? history[history.length - 2] : undefined;

  const delayValue = Math.round(latest.avgDelayMinutes * 10) / 10;
  const delayTrend = getTrend(latest.avgDelayMinutes, previousDay?.avgDelayMinutes, false);
  const maxDelay = Math.max(...history.map(d => d.avgDelayMinutes));

  return (
    <div style={{ padding: '0.5rem 0.75rem 0.75rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {(['bus', 'train', 'ferry'] as const).map(mode => {
          const pct = latest.onTimePercent[mode];
          return (
            <TrendBarRow
              key={mode}
              icon={<ModeIcon mode={mode} />}
              label={MODE_LABELS[mode]}
              value={`${pct}%`}
              barPct={pct}
              barColour={pctColour(pct)}
              trend={getTrend(pct, previousDay?.onTimePercent[mode], true)}
            />
          );
        })}
        <TrendBarRow
          icon={null}
          label="Delay"
          value={`${delayValue} min`}
          barPct={maxDelay > 0 ? (delayValue / maxDelay) * 100 : 0}
          barColour={delayMinutesToColour(delayValue)}
          trend={delayTrend}
        />
      </div>
    </div>
  );
}
