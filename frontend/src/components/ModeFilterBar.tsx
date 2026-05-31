import type { TransitMode } from 'shared/types';

const MODES: TransitMode[] = ['bus', 'train', 'ferry'];

const MODE_LABELS: Record<TransitMode, string> = {
  bus: 'Bus',
  train: 'Train',
  ferry: 'Ferry',
};

interface Props {
  activeModes: Set<TransitMode>;
  onToggle: (mode: TransitMode) => void;
}

export function ModeFilterBar({ activeModes, onToggle }: Props) {
  return (
    <div className="flex gap-1.5 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 shadow-lg">
      {MODES.map(mode => (
        <button
          key={mode}
          onClick={() => onToggle(mode)}
          className={`text-xs px-2 py-0.5 rounded transition-opacity ${
            activeModes.has(mode)
              ? 'text-white opacity-100'
              : 'text-gray-500 opacity-40'
          }`}
        >
          {MODE_LABELS[mode]}
        </button>
      ))}
    </div>
  );
}
