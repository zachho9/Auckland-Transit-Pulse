import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { HourlyStats, TransitMode } from 'shared/types';
import { ModeIcon, MODE_LABELS } from './ScorecardPanel';

const isMock = import.meta.env.VITE_MOCK === 'true';
const HOURLY_URL = `${((import.meta.env.VITE_API_URL as string) ?? '').replace(/\/$/, '')}/hourly`;

const MODE_COLOURS: Record<TransitMode, string> = {
  bus: '#3b82f6',
  train: '#a855f7',
  ferry: '#14b8a6',
};

const MOCK_HOURLY: HourlyStats[] = [
  { hour: 6,  sampleCount: 60, onTimePercent: { bus: 92, train: 88, ferry: 97 } },
  { hour: 7,  sampleCount: 60, onTimePercent: { bus: 85, train: 76, ferry: 96 } },
  { hour: 8,  sampleCount: 60, onTimePercent: { bus: 78, train: 65, ferry: 94 } },
  { hour: 9,  sampleCount: 60, onTimePercent: { bus: 83, train: 72, ferry: 95 } },
  { hour: 10, sampleCount: 60, onTimePercent: { bus: 88, train: 80, ferry: 98 } },
  { hour: 11, sampleCount: 60, onTimePercent: { bus: 89, train: 82, ferry: 97 } },
  { hour: 12, sampleCount: 60, onTimePercent: { bus: 84, train: 75, ferry: 96 } },
  { hour: 13, sampleCount: 60, onTimePercent: { bus: 80, train: 70, ferry: 95 } },
];

function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

function HourlyTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: number;
}) {
  if (!active || !payload || payload.length === 0 || label === undefined) return null;
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-col)',
      borderRadius: 4,
      padding: '0.4rem 0.6rem',
      fontSize: '0.7rem',
    }}>
      <div style={{ fontWeight: 600, marginBottom: '0.2rem', color: 'var(--text-primary)' }}>
        {formatHour(label)}
      </div>
      {payload.map(entry => (
        <div key={entry.dataKey} style={{ color: entry.color }}>
          {MODE_LABELS[entry.dataKey as TransitMode]}: {entry.value}%
        </div>
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
      {text}
    </div>
  );
}

export function HourlyPanel() {
  const [hourly, setHourly] = useState<HourlyStats[] | null>(isMock ? MOCK_HOURLY : null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (isMock) return;
    fetch(HOURLY_URL)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: HourlyStats[]) => setHourly(data))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <Empty text="Hourly data unavailable" />;
  if (!hourly) return <Empty text="Loading…" />;
  if (hourly.length < 2) return <Empty text="Not enough data yet" />;

  const data = hourly.map(h => ({
    hour: h.hour,
    bus: h.onTimePercent.bus,
    train: h.onTimePercent.train,
    ferry: h.onTimePercent.ferry,
  }));

  const modes: TransitMode[] = ['bus', 'train', 'ferry'];

  return (
    <div style={{ padding: '0.5rem 0.75rem 0.85rem' }}>
      <div style={{ height: 130 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: 8 }}>
            <XAxis dataKey="hour" hide />
            <YAxis domain={[0, 100]} hide />
            <Tooltip content={<HourlyTooltip />} />
            {modes.map(mode => (
              <Line
                key={mode}
                type="monotone"
                dataKey={mode}
                stroke={MODE_COLOURS[mode]}
                strokeWidth={2}
                dot={{ r: 3, fill: MODE_COLOURS[mode] }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.4rem' }}>
        {modes.map(mode => (
          <div key={mode} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: MODE_COLOURS[mode], display: 'inline-block', flexShrink: 0 }} />
            <ModeIcon mode={mode} />
            <span>{MODE_LABELS[mode]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
