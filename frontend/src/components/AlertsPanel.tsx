import { useSnapshot } from '../context/SnapshotContext';

export function AlertsPanel() {
  const { snapshot } = useSnapshot();
  const alerts = snapshot?.alerts ?? [];

  return (
    <section className="flex-[3] p-4 overflow-y-auto">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
        Service Alerts
      </h2>
      {alerts.length === 0 ? (
        <p className="text-sm text-gray-600">
          {snapshot ? 'No active alerts' : 'Loading…'}
        </p>
      ) : (
        <ul className="space-y-3">
          {alerts.map(a => (
            <li key={a.id} className="flex items-start gap-2 text-sm">
              <span className="text-amber-400 mt-0.5 shrink-0">⚠</span>
              <div>
                <div className="text-gray-200 font-medium leading-snug">{a.header}</div>
                {a.description && (
                  <div className="text-gray-400 text-xs mt-0.5 leading-snug">{a.description}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
