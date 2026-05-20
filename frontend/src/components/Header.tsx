import { useSnapshot } from '../context/SnapshotContext';

export function Header() {
  const { snapshot, isStale, hasError, isLoading } = useSnapshot();

  const lastUpdated = snapshot
    ? new Date(snapshot.updatedAt).toLocaleTimeString('en-NZ')
    : isLoading
    ? 'Loading…'
    : '—';

  return (
    <header className="shrink-0 border-b border-gray-700">
      <div className="flex items-center justify-between px-6 py-3">
        <h1 className="text-lg font-semibold text-white tracking-wide">
          Auckland Transit Pulse
        </h1>
        <span className="text-sm text-gray-400">Last updated: {lastUpdated}</span>
      </div>
      {hasError && (
        <div className="bg-red-900/50 text-red-300 text-sm px-6 py-1">
          Connection lost — retrying
        </div>
      )}
      {!hasError && isStale && (
        <div className="bg-amber-900/50 text-amber-300 text-sm px-6 py-1">
          Data may be stale
        </div>
      )}
    </header>
  );
}
