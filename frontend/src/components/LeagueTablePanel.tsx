import { useSnapshot } from '../context/SnapshotContext';

function delayColour(mins: number): string {
  return mins > 5 ? 'text-red-400' : 'text-amber-400';
}

export function LeagueTablePanel() {
  const { snapshot } = useSnapshot();
  const routes = snapshot?.worstRoutes ?? [];

  return (
    <section className="flex-[4] p-4 border-b border-gray-700 overflow-y-auto">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
        Worst Routes
      </h2>
      {routes.length === 0 ? (
        <p className="text-sm text-gray-600">
          {snapshot ? 'All routes running on time' : 'Loading…'}
        </p>
      ) : (
        <ol className="space-y-1.5">
          {routes.map((r, i) => (
            <li key={r.routeId} className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 w-4 text-right shrink-0">{i + 1}.</span>
              <span className="text-gray-200 flex-1 truncate">{r.name}</span>
              <span className={`font-mono shrink-0 ${delayColour(r.avgDelayMinutes)}`}>
                +{r.avgDelayMinutes} min
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
