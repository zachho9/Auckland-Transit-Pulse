import type { DelaySeverity, Scorecard, ServiceAlert, TransitMode, VehicleSnapshot, WorstRoute } from '../../../shared/types';
import type { AtEntity } from './atTypes';
import { routeMap } from './gtfsData';

export function classifyDelay(delaySeconds: number | null | undefined): DelaySeverity {
  if (delaySeconds == null) return 'none';
  if (delaySeconds <= 120) return 'green';
  if (delaySeconds <= 300) return 'amber';
  return 'red';
}

export function modeFromRouteType(routeType: number): TransitMode | null {
  if (routeType === 2) return 'train';
  if (routeType === 3) return 'bus';
  if (routeType === 4) return 'ferry';
  return null;
}

export function buildTripDelayMap(entities: AtEntity[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of entities) {
    if (e.trip_update?.trip.trip_id != null && e.trip_update.delay != null) {
      map.set(e.trip_update.trip.trip_id, e.trip_update.delay);
    }
  }
  return map;
}

export function parseVehicles(
  entities: AtEntity[],
  tripDelayMap: Map<string, number>,
): VehicleSnapshot[] {
  const result: VehicleSnapshot[] = [];
  for (const e of entities) {
    const v = e.vehicle;
    if (!v?.position || !v.trip?.route_id) continue;
    const routeInfo = routeMap[v.trip.route_id];
    if (!routeInfo) continue;
    const mode = modeFromRouteType(routeInfo.routeType);
    if (!mode) continue;
    const delay = v.trip.trip_id != null ? tripDelayMap.get(v.trip.trip_id) : undefined;
    result.push({
      id: e.id,
      lat: v.position.latitude,
      lng: v.position.longitude,
      delaySeverity: classifyDelay(delay),
      mode,
    });
  }
  return result;
}

export function parseAlerts(entities: AtEntity[]): ServiceAlert[] {
  return entities
    .filter(e => e.alert)
    .map(e => ({
      id: e.id,
      header: e.alert!.header_text?.translation[0]?.text ?? '',
      description: e.alert!.description_text?.translation[0]?.text ?? '',
    }));
}

export function aggregateScorecard(vehicles: VehicleSnapshot[]): Scorecard {
  const modes: TransitMode[] = ['bus', 'train', 'ferry'];
  const scorecard = {} as Scorecard;
  for (const mode of modes) {
    const group = vehicles.filter(v => v.mode === mode);
    const withDelay = group.filter(v => v.delaySeverity !== 'none');
    const onTime = withDelay.filter(v => v.delaySeverity === 'green').length;
    scorecard[mode] = {
      active: group.length,
      percentOnTime: withDelay.length === 0 ? 0 : Math.round((onTime / withDelay.length) * 100),
    };
  }
  return scorecard;
}

export function aggregateLeagueTable(entities: AtEntity[]): WorstRoute[] {
  const routeDelays = new Map<string, number[]>();
  for (const e of entities) {
    if (!e.trip_update?.trip.route_id || e.trip_update.delay == null) continue;
    const routeId = e.trip_update.trip.route_id;
    if (!routeDelays.has(routeId)) routeDelays.set(routeId, []);
    routeDelays.get(routeId)!.push(e.trip_update.delay);
  }
  return Array.from(routeDelays.entries())
    .map(([routeId, delays]) => {
      const avgSeconds = delays.reduce((a, b) => a + b, 0) / delays.length;
      return {
        routeId,
        name: routeMap[routeId]?.shortName ?? routeId,
        avgDelayMinutes: Math.round(avgSeconds / 60),
      };
    })
    .filter(r => r.avgDelayMinutes > 0)
    .sort((a, b) => b.avgDelayMinutes - a.avgDelayMinutes)
    .slice(0, 10);
}
