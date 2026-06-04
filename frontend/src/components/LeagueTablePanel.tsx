import { useSnapshot } from '../context/SnapshotContext';
import { useRouteSelection } from '../context/RouteSelectionContext';

function delayColour(mins: number): string {
  return mins > 5 ? '#ef4444' : '#f59e0b';
}

export function LeagueTablePanel() {
  const { snapshot } = useSnapshot();
  const { selectedRouteId, selectRoute } = useRouteSelection();
  const routes = snapshot?.worstRoutes ?? [];
  const maxDelay = routes.length > 0 ? Math.max(...routes.map(r => r.avgDelayMinutes)) : 1;

  return (
    <section style={{ padding: '0.25rem 1rem 0.85rem' }}>
      {routes.length === 0 ? (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {snapshot ? 'All routes running on time' : 'Loading…'}
        </p>
      ) : (
        <ol className="space-y-2">
          {routes.map((r, i) => {
            const pct = (r.avgDelayMinutes / maxDelay) * 100;
            const colour = delayColour(r.avgDelayMinutes);
            const isSelected = r.routeId === selectedRouteId;
            return (
              <li
                key={r.routeId}
                className="relative flex items-center gap-2"
                onClick={() => selectRoute(isSelected ? null : r.routeId)}
                style={{
                  fontSize: '0.78rem',
                  paddingTop: 2,
                  paddingBottom: 2,
                  cursor: 'pointer',
                  borderRadius: 4,
                  outline: isSelected ? `1px solid ${colour}` : 'none',
                }}
              >
                <div
                  className="absolute inset-0 rounded"
                  style={{
                    width: `${pct}%`,
                    background: `${colour}33`,
                    borderLeft: `2px solid ${colour}99`,
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
