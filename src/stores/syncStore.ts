import { create } from 'zustand';
import type { SyncState, SyncStatus } from '@/types/models';

interface SyncStore extends SyncState {
  setOnline: (online: boolean) => void;
  setStatus: (status: SyncStatus) => void;
  setPendingCount: (count: number) => void;
  setLastSyncedAt: (value: string | null) => void;
  setError: (value: string | null) => void;
  reset: () => void;
}

const initialState: SyncState = {
  status: 'idle',
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  pendingCount: 0,
  lastSyncedAt: null,
  error: null,
};

export const useSyncStore = create<SyncStore>((set) => ({
  ...initialState,
  setOnline: (online) => set({ online }),
  setStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialState }),
}));
