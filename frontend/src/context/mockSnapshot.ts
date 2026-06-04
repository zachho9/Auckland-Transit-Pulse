import type { Snapshot } from 'shared/types';

export const MOCK_SNAPSHOT: Snapshot = {
  updatedAt: new Date().toISOString(),
  scorecard: {
    bus:   { active: 312, percentOnTime: 87 },
    train: { active: 24,  percentOnTime: 79 },
    ferry: { active: 8,   percentOnTime: 97 },
  },
  worstRoutes: [
    { routeId: 'route-274', name: '274',  avgDelayMinutes: 8 },
    { routeId: 'route-380', name: '380',  avgDelayMinutes: 6 },
    { routeId: 'route-NX1', name: 'NX1',  avgDelayMinutes: 5 },
    { routeId: 'route-NEX', name: 'NEX',  avgDelayMinutes: 4 },
    { routeId: 'route-321', name: '321',  avgDelayMinutes: 3 },
  ],
  alerts: [
    {
      id: 'alert-1',
      header: 'Northern Busway — signal fault',
      description: 'Buses on Northern Busway experiencing delays due to signal fault at Albany. Expect 15–20 min delays.',
    },
  ],
  vehicles: [
    // Buses
    { id: 'v1',  lat: -36.850, lng: 174.765, delaySeverity: 'green', mode: 'bus',   routeShortName: '25B',       routeId: 'route-25B' },
    { id: 'v2',  lat: -36.862, lng: 174.771, delaySeverity: 'amber', mode: 'bus',   routeShortName: '70',        routeId: 'route-70' },
    { id: 'v3',  lat: -36.870, lng: 174.760, delaySeverity: 'red',   mode: 'bus',   routeShortName: '274',       routeId: 'route-274' },
    { id: 'v4',  lat: -36.855, lng: 174.755, delaySeverity: 'green', mode: 'bus',   routeShortName: 'NX1',       routeId: 'route-NX1' },
    { id: 'v5',  lat: -36.878, lng: 174.778, delaySeverity: 'none',  mode: 'bus',   routeShortName: '321',       routeId: 'route-321' },
    { id: 'v6',  lat: -36.840, lng: 174.740, delaySeverity: 'green', mode: 'bus',   routeShortName: '33',        routeId: 'route-33' },
    { id: 'v7',  lat: -36.900, lng: 174.790, delaySeverity: 'amber', mode: 'bus',   routeShortName: '380',       routeId: 'route-380' },
    { id: 'v8',  lat: -36.820, lng: 174.730, delaySeverity: 'green', mode: 'bus',   routeShortName: 'NEX',       routeId: 'route-NEX' },
    { id: 'v14', lat: -36.935, lng: 174.856, delaySeverity: 'green', mode: 'bus',   routeShortName: '75',        routeId: 'route-75' },
    { id: 'v15', lat: -36.915, lng: 174.832, delaySeverity: 'red',   mode: 'bus',   routeShortName: '50',        routeId: 'route-50' },
    // Trains
    { id: 'v9',  lat: -36.880, lng: 174.752, delaySeverity: 'amber', mode: 'train', routeShortName: 'WEST',      routeId: 'route-WEST' },
    { id: 'v10', lat: -36.895, lng: 174.769, delaySeverity: 'green', mode: 'train', routeShortName: 'EAST',      routeId: 'route-EAST' },
    { id: 'v11', lat: -36.860, lng: 174.735, delaySeverity: 'red',   mode: 'train', routeShortName: 'SOUTH',     routeId: 'route-SOUTH' },
    { id: 'v16', lat: -36.872, lng: 174.800, delaySeverity: 'green', mode: 'train', routeShortName: 'ONE',       routeId: 'route-ONE' },
    // Ferries
    { id: 'v12', lat: -36.843, lng: 174.769, delaySeverity: 'green', mode: 'ferry', routeShortName: 'DEVONPORT', routeId: 'route-DEVONPORT' },
    { id: 'v13', lat: -36.830, lng: 174.785, delaySeverity: 'none',  mode: 'ferry', routeShortName: 'WAIHEKE',   routeId: 'route-WAIHEKE' },
  ],
};
