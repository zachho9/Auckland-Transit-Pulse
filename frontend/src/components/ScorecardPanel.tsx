import { useSnapshot } from '../context/SnapshotContext';
import type { TransitMode } from 'shared/types';

const MODE_LABELS: Record<TransitMode, string> = {
  bus: 'Bus',
  train: 'Train',
  ferry: 'Ferry',
};

function pctColour(pct: number): string {
  if (pct >= 90) return 'text-green-400';
  if (pct >= 75) return 'text-amber-400';
  return 'text-red-400';
}

export function ScorecardPanel() {
  const { snapshot } = useSnapshot();
  const modes: TransitMode[] = ['bus', 'train', 'ferry'];

  return (
    <section className="flex-[3] flex flex-col justify-center p-4 border-b border-gray-700">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
        Network Scorecard
      </h2>
      <div className="flex justify-between gap-2">
        {modes.map(mode => {
          const stats = snapshot?.scorecard[mode];
          const pct = stats?.percentOnTime ?? 0;
          return (
            <div key={mode} className="flex-1 text-center">
              <div className={`text-[clamp(1.5rem,5vh,5rem)] font-bold ${stats ? pctColour(pct) : 'text-gray-500'}`}>
                {stats ? `${pct}%` : '—'}
              </div>
              <div className="text-xs text-gray-400 mt-1">{MODE_LABELS[mode]}</div>
              {stats && (
                <div className="text-xs text-gray-500">{stats.active} active</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
