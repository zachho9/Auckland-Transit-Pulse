import { useSnapshot } from '../context/SnapshotContext';

function delayColour(mins: number): string {
  return mins > 5 ? '#ef4444' : '#f59e0b';
}

export function LeagueTablePanel() {
  const { snapshot } = useSnapshot();
  const routes = snapshot?.worstRoutes ?? [];
  const maxDelay = routes.length > 0 ? Math.max(...routes.map(r => r.avgDelayMinutes)) : 1;

  return (
    <section className="flex-[4] p-4 overflow-y-auto" style={{ borderBottom: '1px solid var(--border-col)' }}>
      <h2 style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
        Worst Routes
      </h2>
      {routes.length === 0 ? (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {snapshot ? 'All routes running on time' : 'Loading…'}
        </p>
      ) : (
        <ol className="space-y-2">
          {routes.map((r, i) => {
            const pct = (r.avgDelayMinutes / maxDelay) * 100;
            const colour = delayColour(r.avgDelayMinutes);
            return (
              <li key={r.routeId} className="relative flex items-center gap-2" style={{ fontSize: '0.78rem', paddingTop: 2, paddingBottom: 2 }}>
                <div
                  className="absolute inset-0 rounded"
                  style={{
                    width: `${pct}%`,
                    background: `${colour}14`,
                    borderLeft: `2px solid ${colour}40`,
                    pointerEvents: 'none',
                  }}
                />
                <span style={{ color: 'var(--text-muted)', width: '1.1rem', textAlign: 'right', flexShrink: 0, position: 'relative' }}>
                  {i + 1}.
                </span>
                <span style={{ color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', position: 'relative' }}>
                  {r.name}
                </span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, flexShrink: 0, color: colour, fontSize: '0.82rem', position: 'relative' }}>
                  +{r.avgDelayMinutes} min
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
