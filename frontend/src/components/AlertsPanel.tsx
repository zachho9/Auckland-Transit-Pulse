import { useSnapshot } from '../context/SnapshotContext';

export function AlertsPanel() {
  const { snapshot } = useSnapshot();
  const alerts = snapshot?.alerts ?? [];

  return (
    <section className="h-full p-4 overflow-y-auto">
      <h2 style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
        Service Alerts
      </h2>
      {alerts.length === 0 ? (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {snapshot ? 'No active alerts' : 'Loading…'}
        </p>
      ) : (
        <ul className="space-y-3">
          {alerts.map(a => (
            <li
              key={a.id}
              className="pl-3 py-1"
              style={{ borderLeft: '2px solid #f59e0b', fontSize: '0.78rem' }}
            >
              <div style={{ color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.35 }}>
                {a.header}
              </div>
              {a.description && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: '0.2rem', lineHeight: 1.45 }}>
                  {a.description}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
