import { createContext, useContext, useState, type ReactNode } from 'react';

interface RouteSelectionState {
  selectedRouteId: string | null;
  selectRoute: (routeId: string | null) => void;
}

const RouteSelectionContext = createContext<RouteSelectionState>({
  selectedRouteId: null,
  selectRoute: () => {},
});

export function RouteSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  return (
    <RouteSelectionContext.Provider value={{ selectedRouteId, selectRoute: setSelectedRouteId }}>
      {children}
    </RouteSelectionContext.Provider>
  );
}

export function useRouteSelection(): RouteSelectionState {
  return useContext(RouteSelectionContext);
}
