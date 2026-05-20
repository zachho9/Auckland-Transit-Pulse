import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Snapshot } from 'shared/types';
import { MOCK_SNAPSHOT } from './mockSnapshot';

interface SnapshotState {
  snapshot: Snapshot | null;
  isStale: boolean;
  isLoading: boolean;
  hasError: boolean;
}

const SnapshotContext = createContext<SnapshotState>({
  snapshot: null,
  isStale: false,
  isLoading: true,
  hasError: false,
});

const isMock = import.meta.env.VITE_MOCK === 'true';
const API_URL = `${((import.meta.env.VITE_API_URL as string) ?? '').replace(/\/$/, '')}/snapshot`;
const POLL_INTERVAL_MS = 30_000;
const STALE_THRESHOLD_MS = 60_000;

export function SnapshotProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(isMock ? MOCK_SNAPSHOT : null);
  const [isLoading, setIsLoading] = useState(!isMock);
  const [hasError, setHasError] = useState(false);
  const [isStale, setIsStale] = useState(false);

  async function fetchSnapshot() {
    try {
      const res = await fetch(API_URL);
      if (res.status === 204) return; // poller hasn't run yet, keep existing state
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Snapshot = await res.json();
      setSnapshot(data);
      setHasError(false);
      setIsStale(Date.now() - new Date(data.updatedAt).getTime() > STALE_THRESHOLD_MS);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isMock) return; // skip network calls entirely in mock mode
    void fetchSnapshot();
    const id = setInterval(() => void fetchSnapshot(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <SnapshotContext.Provider value={{ snapshot, isStale, isLoading, hasError }}>
      {children}
    </SnapshotContext.Provider>
  );
}

export function useSnapshot(): SnapshotState {
  return useContext(SnapshotContext);
}
