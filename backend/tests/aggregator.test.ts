import {
  aggregateLeagueTable,
  aggregateScorecard,
  buildTripDelayMap,
  classifyDelay,
  modeFromRouteType,
  parseAlerts,
  parseVehicles,
  calculateNetworkAvgDelaySeconds,
  buildDailyStats,
} from '../src/poller/aggregator';
import type { AtEntity } from '../src/poller/atTypes';
import type { Scorecard, DailyStats, WorstRoute } from '../../shared/types';

jest.mock('../src/poller/gtfsData', () => ({
  routeMap: {
    'route-bus': { shortName: '274', routeType: 3 },
    'route-train': { shortName: 'EAST', routeType: 2 },
    'route-ferry': { shortName: 'FERRY1', routeType: 4 },
    'route-unknown-type': { shortName: 'X', routeType: 9 },
  },
}));

describe('classifyDelay', () => {
  it('returns green for 0 seconds', () => expect(classifyDelay(0)).toBe('green'));
  it('returns green for exactly 120 seconds', () => expect(classifyDelay(120)).toBe('green'));
  it('returns green for negative delay (vehicle is early)', () => expect(classifyDelay(-60)).toBe('green'));
  it('returns amber for 121 seconds', () => expect(classifyDelay(121)).toBe('amber'));
  it('returns amber for exactly 300 seconds', () => expect(classifyDelay(300)).toBe('amber'));
  it('returns red for 301 seconds', () => expect(classifyDelay(301)).toBe('red'));
  it('returns none for null', () => expect(classifyDelay(null)).toBe('none'));
  it('returns none for undefined', () => expect(classifyDelay(undefined)).toBe('none'));
});

describe('modeFromRouteType', () => {
  it('returns train for route type 2', () => expect(modeFromRouteType(2)).toBe('train'));
  it('returns bus for route type 3', () => expect(modeFromRouteType(3)).toBe('bus'));
  it('returns ferry for route type 4', () => expect(modeFromRouteType(4)).toBe('ferry'));
  it('returns null for unsupported route type', () => expect(modeFromRouteType(9)).toBeNull());
});

describe('buildTripDelayMap', () => {
  it('maps trip_id to delay from trip_update entities', () => {
    const entities: AtEntity[] = [
      { id: '1', trip_update: { trip: { trip_id: 'trip-1', route_id: 'route-bus' }, delay: 180 } },
      { id: '2', trip_update: { trip: { trip_id: 'trip-2', route_id: 'route-bus' }, delay: 60 } },
      { id: '3', vehicle: { trip: { trip_id: 'trip-1' }, position: { latitude: -36.8, longitude: 174.7 } } },
    ];
    const map = buildTripDelayMap(entities);
    expect(map.get('trip-1')).toBe(180);
    expect(map.get('trip-2')).toBe(60);
    expect(map.size).toBe(2);
  });

  it('skips trip_update entities without trip_id', () => {
    const entities: AtEntity[] = [
      { id: '1', trip_update: { trip: { route_id: 'route-bus' }, delay: 60 } },
    ];
    expect(buildTripDelayMap(entities).size).toBe(0);
  });

  it('skips trip_update entities without delay', () => {
    const entities: AtEntity[] = [
      { id: '1', trip_update: { trip: { trip_id: 'trip-1' } } },
    ];
    expect(buildTripDelayMap(entities).size).toBe(0);
  });
});

describe('parseVehicles', () => {
  const tripDelayMap = new Map([['trip-1', 180], ['trip-2', 600]]);

  it('returns vehicle snapshot with correct mode and severity', () => {
    const entities: AtEntity[] = [{
      id: 'v1',
      vehicle: {
        trip: { trip_id: 'trip-1', route_id: 'route-bus' },
        position: { latitude: -36.8, longitude: 174.7 },
      },
    }];
    const result = parseVehicles(entities, tripDelayMap);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 'v1', lat: -36.8, lng: 174.7, delaySeverity: 'amber', mode: 'bus', routeShortName: '274', routeId: 'route-bus' });
  });

  it('assigns red severity for delay > 300 seconds', () => {
    const entities: AtEntity[] = [{
      id: 'v2',
      vehicle: {
        trip: { trip_id: 'trip-2', route_id: 'route-train' },
        position: { latitude: -36.9, longitude: 174.8 },
      },
    }];
    expect(parseVehicles(entities, tripDelayMap)[0].delaySeverity).toBe('red');
    expect(parseVehicles(entities, tripDelayMap)[0].routeShortName).toBe('EAST');
    expect(parseVehicles(entities, tripDelayMap)[0].routeId).toBe('route-train');
  });

  it('assigns none severity when no trip delay data exists for the vehicle', () => {
    const entities: AtEntity[] = [{
      id: 'v3',
      vehicle: {
        trip: { trip_id: 'trip-no-update', route_id: 'route-ferry' },
        position: { latitude: -36.9, longitude: 174.8 },
      },
    }];
    expect(parseVehicles(entities, tripDelayMap)[0].delaySeverity).toBe('none');
    expect(parseVehicles(entities, tripDelayMap)[0].mode).toBe('ferry');
    expect(parseVehicles(entities, tripDelayMap)[0].routeShortName).toBe('FERRY1');
    expect(parseVehicles(entities, tripDelayMap)[0].routeId).toBe('route-ferry');
  });

  it('skips vehicles with no position', () => {
    const entities: AtEntity[] = [{ id: 'v4', vehicle: { trip: { route_id: 'route-bus' } } }];
    expect(parseVehicles(entities, tripDelayMap)).toHaveLength(0);
  });

  it('skips vehicles with no route_id', () => {
    const entities: AtEntity[] = [{
      id: 'v5',
      vehicle: { position: { latitude: -36.8, longitude: 174.7 } },
    }];
    expect(parseVehicles(entities, tripDelayMap)).toHaveLength(0);
  });

  it('skips vehicles whose route_id is not in routeMap', () => {
    const entities: AtEntity[] = [{
      id: 'v6',
      vehicle: {
        trip: { route_id: 'route-nonexistent' },
        position: { latitude: -36.8, longitude: 174.7 },
      },
    }];
    expect(parseVehicles(entities, tripDelayMap)).toHaveLength(0);
  });

  it('skips vehicles whose route type is unsupported', () => {
    const entities: AtEntity[] = [{
      id: 'v7',
      vehicle: {
        trip: { route_id: 'route-unknown-type' },
        position: { latitude: -36.8, longitude: 174.7 },
      },
    }];
    expect(parseVehicles(entities, tripDelayMap)).toHaveLength(0);
  });
});

describe('parseAlerts', () => {
  it('extracts header and description from alert entities', () => {
    const entities: AtEntity[] = [{
      id: 'a1',
      alert: {
        header_text: { translation: [{ text: 'Northern busway disruption', language: 'en' }] },
        description_text: { translation: [{ text: 'Signal fault on Northern busway', language: 'en' }] },
      },
    }];
    expect(parseAlerts(entities)).toEqual([{
      id: 'a1',
      header: 'Northern busway disruption',
      description: 'Signal fault on Northern busway',
    }]);
  });

  it('returns empty strings when text fields are missing', () => {
    const entities: AtEntity[] = [{ id: 'a2', alert: {} }];
    const result = parseAlerts(entities);
    expect(result[0].header).toBe('');
    expect(result[0].description).toBe('');
  });

  it('ignores non-alert entities', () => {
    const entities: AtEntity[] = [
      { id: '1', trip_update: { trip: { route_id: 'route-bus' }, delay: 60 } },
      { id: '2', vehicle: { position: { latitude: -36.8, longitude: 174.7 } } },
    ];
    expect(parseAlerts(entities)).toHaveLength(0);
  });
});

describe('aggregateScorecard', () => {
  it('calculates per-mode active count and on-time percentage', () => {
    const vehicles = [
      { id: '1', lat: 0, lng: 0, delaySeverity: 'green' as const, mode: 'bus' as const, routeShortName: 'TEST', routeId: 'test-route' },
      { id: '2', lat: 0, lng: 0, delaySeverity: 'red' as const, mode: 'bus' as const, routeShortName: 'TEST', routeId: 'test-route' },
      { id: '3', lat: 0, lng: 0, delaySeverity: 'green' as const, mode: 'train' as const, routeShortName: 'TEST', routeId: 'test-route' },
    ];
    const result = aggregateScorecard(vehicles);
    expect(result.bus).toEqual({ active: 2, percentOnTime: 50 });
    expect(result.train).toEqual({ active: 1, percentOnTime: 100 });
    expect(result.ferry).toEqual({ active: 0, percentOnTime: 0 });
  });

  it('excludes none-severity vehicles from percentage (they count as active but not in pct)', () => {
    const vehicles = [
      { id: '1', lat: 0, lng: 0, delaySeverity: 'green' as const, mode: 'bus' as const, routeShortName: 'TEST', routeId: 'test-route' },
      { id: '2', lat: 0, lng: 0, delaySeverity: 'none' as const, mode: 'bus' as const, routeShortName: 'TEST', routeId: 'test-route' },
    ];
    const result = aggregateScorecard(vehicles);
    expect(result.bus.active).toBe(2);
    expect(result.bus.percentOnTime).toBe(100); // only 1 has delay data, it's green
  });

  it('returns 0% on time when all vehicles have none severity', () => {
    const vehicles = [
      { id: '1', lat: 0, lng: 0, delaySeverity: 'none' as const, mode: 'bus' as const, routeShortName: 'TEST', routeId: 'test-route' },
    ];
    expect(aggregateScorecard(vehicles).bus.percentOnTime).toBe(0);
  });
});

describe('aggregateLeagueTable', () => {
  it('returns routes sorted by descending average delay in minutes', () => {
    const entities: AtEntity[] = [
      { id: '1', trip_update: { trip: { route_id: 'route-bus' }, delay: 600 } },   // 10 min
      { id: '2', trip_update: { trip: { route_id: 'route-bus' }, delay: 300 } },   // 5 min → avg 7.5 → 8 min
      { id: '3', trip_update: { trip: { route_id: 'route-train' }, delay: 360 } }, // 6 min
    ];
    const result = aggregateLeagueTable(entities);
    expect(result[0]).toEqual({ routeId: 'route-bus', name: '274', avgDelayMinutes: 8 });
    expect(result[1]).toEqual({ routeId: 'route-train', name: 'EAST', avgDelayMinutes: 6 });
  });

  it('excludes routes with zero or negative average delay', () => {
    const entities: AtEntity[] = [
      { id: '1', trip_update: { trip: { route_id: 'route-bus' }, delay: -60 } },
    ];
    expect(aggregateLeagueTable(entities)).toHaveLength(0);
  });

  it('uses route_id as name fallback when route not in routeMap', () => {
    const entities: AtEntity[] = [
      { id: '1', trip_update: { trip: { route_id: 'unknown-route-999' }, delay: 400 } },
    ];
    const result = aggregateLeagueTable(entities);
    expect(result[0].name).toBe('unknown-route-999');
  });

  it('limits results to 10', () => {
    const entities: AtEntity[] = Array.from({ length: 15 }, (_, i) => ({
      id: `${i}`,
      trip_update: { trip: { route_id: `route-${i}` }, delay: (i + 1) * 200 },
    }));
    expect(aggregateLeagueTable(entities).length).toBeLessThanOrEqual(10);
  });
});

describe('calculateNetworkAvgDelaySeconds', () => {
  it('returns average of positive delays only', () => {
    const map = new Map([['t1', 300], ['t2', 600], ['t3', -60]]);
    // -60 excluded (early), average of 300+600 = 450
    expect(calculateNetworkAvgDelaySeconds(map)).toBe(450);
  });

  it('returns 0 when no trips have positive delay', () => {
    const map = new Map([['t1', -120], ['t2', 0]]);
    expect(calculateNetworkAvgDelaySeconds(map)).toBe(0);
  });

  it('returns 0 for an empty map', () => {
    expect(calculateNetworkAvgDelaySeconds(new Map())).toBe(0);
  });
});

describe('buildDailyStats', () => {
  const scorecard: Scorecard = {
    bus:   { active: 10, percentOnTime: 80 },
    train: { active: 5,  percentOnTime: 60 },
    ferry: { active: 2,  percentOnTime: 100 },
  };
  const tripDelayMap = new Map([['t1', 300], ['t2', 600]]); // avg = 450s = 7.5 min
  const worstRoutes: WorstRoute[] = [
    { routeId: 'route-bus', name: '274', avgDelayMinutes: 8 },
  ];

  it('creates a first-run stats item with sampleCount 1', () => {
    const result = buildDailyStats(scorecard, tripDelayMap, worstRoutes, null, '2026-06-04');
    expect(result.sampleCount).toBe(1);
    expect(result.date).toBe('2026-06-04');
    expect(result.onTimePercent.bus).toBe(80);
    expect(result.onTimePercent.train).toBe(60);
    expect(result.onTimePercent.ferry).toBe(100);
    expect(result.avgDelayMinutes).toBeCloseTo(7.5, 1);
    expect(result.worstOffenders).toEqual([{ routeId: 'route-bus', name: '274', count: 1 }]);
  });

  it('applies incremental average on second run', () => {
    const existing: DailyStats = {
      date: '2026-06-04',
      sampleCount: 1,
      onTimePercent: { bus: 80, train: 60, ferry: 100 },
      avgDelayMinutes: 7.5,
      worstOffenders: [{ routeId: 'route-bus', name: '274', count: 1 }],
    };
    // second run: bus is now 60% on time → rolling avg = (80*1 + 60) / 2 = 70
    const scorecard2: Scorecard = {
      bus:   { active: 10, percentOnTime: 60 },
      train: { active: 5,  percentOnTime: 60 },
      ferry: { active: 2,  percentOnTime: 100 },
    };
    const result = buildDailyStats(scorecard2, tripDelayMap, worstRoutes, existing, '2026-06-04');
    expect(result.sampleCount).toBe(2);
    expect(result.onTimePercent.bus).toBe(70);
    expect(result.worstOffenders[0].count).toBe(2);
  });

  it('accumulates worst offenders across multiple runs', () => {
    const existing: DailyStats = {
      date: '2026-06-04',
      sampleCount: 1,
      onTimePercent: { bus: 80, train: 60, ferry: 100 },
      avgDelayMinutes: 7.5,
      worstOffenders: [{ routeId: 'route-bus', name: '274', count: 3 }],
    };
    const newWorst: WorstRoute[] = [
      { routeId: 'route-train', name: 'EAST', avgDelayMinutes: 5 },
    ];
    const result = buildDailyStats(scorecard, tripDelayMap, newWorst, existing, '2026-06-04');
    const offenderMap = Object.fromEntries(result.worstOffenders.map(o => [o.routeId, o.count]));
    expect(offenderMap['route-bus']).toBe(3);   // not in this run, count unchanged
    expect(offenderMap['route-train']).toBe(1); // new entrant
  });

  it('sorts worst offenders by count descending', () => {
    const existing: DailyStats = {
      date: '2026-06-04',
      sampleCount: 5,
      onTimePercent: { bus: 80, train: 60, ferry: 100 },
      avgDelayMinutes: 5,
      worstOffenders: [
        { routeId: 'route-a', name: 'A', count: 2 },
        { routeId: 'route-b', name: 'B', count: 5 },
      ],
    };
    const result = buildDailyStats(scorecard, new Map(), [], existing, '2026-06-04');
    expect(result.worstOffenders[0].routeId).toBe('route-b');
    expect(result.worstOffenders[1].routeId).toBe('route-a');
  });
});
