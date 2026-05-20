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
    // Buses scattered across greater Auckland
    { id: 'v1',  lat: -36.850, lng: 174.765, delaySeverity: 'green', mode: 'bus' },
    { id: 'v2',  lat: -36.862, lng: 174.771, delaySeverity: 'amber', mode: 'bus' },
    { id: 'v3',  lat: -36.870, lng: 174.760, delaySeverity: 'red',   mode: 'bus' },
    { id: 'v4',  lat: -36.855, lng: 174.755, delaySeverity: 'green', mode: 'bus' },
    { id: 'v5',  lat: -36.878, lng: 174.778, delaySeverity: 'none',  mode: 'bus' },
    { id: 'v6',  lat: -36.840, lng: 174.740, delaySeverity: 'green', mode: 'bus' },
    { id: 'v7',  lat: -36.900, lng: 174.790, delaySeverity: 'amber', mode: 'bus' },
    { id: 'v8',  lat: -36.820, lng: 174.730, delaySeverity: 'green', mode: 'bus' },
    { id: 'v14', lat: -36.935, lng: 174.856, delaySeverity: 'green', mode: 'bus' },
    { id: 'v15', lat: -36.915, lng: 174.832, delaySeverity: 'red',   mode: 'bus' },
    // Trains on Western and Eastern lines
    { id: 'v9',  lat: -36.880, lng: 174.752, delaySeverity: 'amber', mode: 'train' },
    { id: 'v10', lat: -36.895, lng: 174.769, delaySeverity: 'green', mode: 'train' },
    { id: 'v11', lat: -36.860, lng: 174.735, delaySeverity: 'red',   mode: 'train' },
    { id: 'v16', lat: -36.872, lng: 174.800, delaySeverity: 'green', mode: 'train' },
    // Ferries in the Waitemata Harbour
    { id: 'v12', lat: -36.843, lng: 174.769, delaySeverity: 'green', mode: 'ferry' },
    { id: 'v13', lat: -36.830, lng: 174.785, delaySeverity: 'none',  mode: 'ferry' },
  ],
};
