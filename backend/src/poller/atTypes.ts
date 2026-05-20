export interface AtTranslation {
  text: string;
  language?: string;
}

export interface AtTripDescriptor {
  trip_id?: string;
  route_id?: string;
  direction_id?: number;
  start_time?: string;
  start_date?: string;
}

export interface AtPosition {
  latitude: number;
  longitude: number;
  bearing?: number;
}

export interface AtTripUpdate {
  trip: AtTripDescriptor;
  delay?: number;
  timestamp?: number;
  stop_time_update?: Array<{
    stop_sequence?: number;
    stop_id?: string;
    arrival?: { delay?: number; time?: number };
    departure?: { delay?: number; time?: number };
  }>;
}

export interface AtVehiclePosition {
  trip?: AtTripDescriptor;
  vehicle?: { id?: string; label?: string; license_plate?: string };
  position?: AtPosition;
  timestamp?: number;
}

export interface AtAlert {
  header_text?: { translation: AtTranslation[] };
  description_text?: { translation: AtTranslation[] };
  informed_entity?: Array<{ route_id?: string; stop_id?: string }>;
  cause?: number;
  effect?: number;
}

export interface AtEntity {
  id: string;
  is_deleted?: boolean;
  trip_update?: AtTripUpdate;
  vehicle?: AtVehiclePosition;
  alert?: AtAlert;
}

export interface AtFeedResponse {
  status: string;
  response: {
    header: {
      gtfs_realtime_version: string;
      incrementality?: number;
      timestamp: number;
    };
    entity: AtEntity[];
  };
  error?: unknown;
}
