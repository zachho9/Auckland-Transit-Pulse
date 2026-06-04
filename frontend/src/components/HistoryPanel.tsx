import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { DailyStats } from 'shared/types';

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

const CHART_COLOURS = { bus: '#22c55e', train: '#f59e0b', ferry: '#60a5fa' };
const DELAY_COLOUR = '#ef4444';

function chartLabel(date: string): string {
  return date.slice(5); // "MM-DD"
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

  const onTimeData = history.map(d => ({
    date: chartLabel(d.date),
    bus:   d.onTimePercent.bus,
    train: d.onTimePercent.train,
    ferry: d.onTimePercent.ferry,
  }));

  const delayData = history.map(d => ({
    date:  chartLabel(d.date),
    delay: Math.round(d.avgDelayMinutes * 10) / 10,
  }));

  // Aggregate worst offenders across all days
  const offenderTotals = new Map<string, { name: string; total: number }>();
  for (const day of history) {
    for (const o of day.worstOffenders) {
      const prev = offenderTotals.get(o.routeId);
      offenderTotals.set(o.routeId, { name: o.name, total: (prev?.total ?? 0) + o.count });
    }
  }
  const topOffenders = Array.from(offenderTotals.entries())
    .map(([routeId, { name, total }]) => ({ routeId, name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const tooltipStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-col)',
    borderRadius: 4,
    fontSize: '0.7rem',
    color: 'var(--text-primary)',
  };

  return (
    <div style={{ padding: '0.5rem 0.75rem 0.75rem' }}>
      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
        On-time % by mode
      </p>
      <ResponsiveContainer width="100%" height={90}>
        <LineChart data={onTimeData} margin={{ top: 2, right: 8, left: -28, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '0.65rem', paddingTop: 2 }} />
          <Line type="monotone" dataKey="bus"   stroke={CHART_COLOURS.bus}   dot={false} strokeWidth={1.5} />
          <Line type="monotone" dataKey="train" stroke={CHART_COLOURS.train} dot={false} strokeWidth={1.5} />
          <Line type="monotone" dataKey="ferry" stroke={CHART_COLOURS.ferry} dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>

      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: '0.6rem 0 0.4rem' }}>
        Network avg delay (min)
      </p>
      <ResponsiveContainer width="100%" height={70}>
        <LineChart data={delayData} margin={{ top: 2, right: 8, left: -28, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} />
          <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="delay" stroke={DELAY_COLOUR} dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>

      {topOffenders.length > 0 && (
        <>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: '0.6rem 0 0.4rem' }}>
            Chronic worst routes (7-day)
          </p>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {topOffenders.map((o, i) => (
              <li key={o.routeId} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                <span style={{ color: 'var(--text-muted)', width: '1rem', textAlign: 'right' }}>{i + 1}.</span>
                <span style={{ color: 'var(--text-primary)', flex: 1 }}>{o.name}</span>
                <span style={{ color: '#f59e0b', fontSize: '0.68rem' }}>{o.total}× in top 10</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
