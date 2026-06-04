export type DelaySeverity = "green" | "amber" | "red" | "none";
export type TransitMode = "bus" | "train" | "ferry";

export interface VehicleSnapshot {
  id: string;
  lat: number;
  lng: number;
  delaySeverity: DelaySeverity;
  mode: TransitMode;
  routeShortName: string;
  routeId: string;
}

export interface ModeStats {
  active: number;
  percentOnTime: number;
}

export interface Scorecard {
  bus: ModeStats;
  train: ModeStats;
  ferry: ModeStats;
}

export interface WorstRoute {
  routeId: string;
  name: string;
  avgDelayMinutes: number;
}

export interface ServiceAlert {
  id: string;
  header: string;
  description: string;
}

export interface Snapshot {
  updatedAt: string;
  scorecard: Scorecard;
  worstRoutes: WorstRoute[];
  alerts: ServiceAlert[];
  vehicles: VehicleSnapshot[];
}

export interface DailyStats {
  date: string;
  sampleCount: number;
  onTimePercent: { bus: number; train: number; ferry: number };
  avgDelayMinutes: number;
  worstOffenders: Array<{ routeId: string; name: string; count: number }>;
}

export interface ShapeDirection {
  directionId: number;
  points: Array<[number, number]>;
}

export interface RouteShape {
  routeId: string;
  directions: ShapeDirection[];
}
