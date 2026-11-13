import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { primeAudio } from '@/lib/audio';

type RestStatus = 'idle' | 'running' | 'paused' | 'completed';

interface RestTimerState {
  status: RestStatus;
  durationSeconds: number;
  endsAt: number | null;
  remainingSeconds: number;
  label: string;
  startedAt: number | null;
  start: (seconds: number, label?: string) => void;
  pause: () => void;
  resume: () => void;
  addTime: (seconds: number) => void;
  complete: () => void;
  skip: () => void;
  restart: () => void;
  reset: () => void;
}

export const useRestTimerStore = create<RestTimerState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      durationSeconds: 90,
      endsAt: null,
      remainingSeconds: 0,
      label: '',
      startedAt: null,
      start: (seconds, label = '') => {
        primeAudio();
        const duration = Math.max(1, Math.round(seconds));
        set({
          status: 'running',
          durationSeconds: duration,
          endsAt: Date.now() + duration * 1000,
          remainingSeconds: duration,
          label,
          startedAt: Date.now(),
        });
      },
      pause: () => {
        const state = get();
        if (state.status !== 'running' || !state.endsAt) return;
        const remaining = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
        set({ status: 'paused', remainingSeconds: remaining, endsAt: null });
      },
      resume: () => {
        const state = get();
        if (state.status !== 'paused') return;
        const remaining = Math.max(1, state.remainingSeconds);
        set({
          status: 'running',
          endsAt: Date.now() + remaining * 1000,
          remainingSeconds: remaining,
          startedAt: Date.now(),
        });
      },
      addTime: (seconds) => {
        const state = get();
        if (state.status === 'running' && state.endsAt) {
          const nextEndsAt = Math.max(Date.now() + 1000, state.endsAt + seconds * 1000);
          set({
            endsAt: nextEndsAt,
            remainingSeconds: Math.max(1, Math.ceil((nextEndsAt - Date.now()) / 1000)),
            durationSeconds: Math.max(1, state.durationSeconds + seconds),
          });
        } else if (state.status === 'paused') {
          set({
            remainingSeconds: Math.max(1, state.remainingSeconds + seconds),
            durationSeconds: Math.max(1, state.durationSeconds + seconds),
          });
        }
      },
      complete: () => {
        set({ status: 'completed', endsAt: null, remainingSeconds: 0 });
      },
      skip: () => {
        set({ status: 'idle', endsAt: null, remainingSeconds: 0, label: '', startedAt: null });
      },
      restart: () => {
        const state = get();
        get().start(state.durationSeconds, state.label);
      },
      reset: () => {
        set({
          status: 'idle',
          durationSeconds: 90,
          endsAt: null,
          remainingSeconds: 0,
          label: '',
          startedAt: null,
        });
      },
    }),
    {
      name: 'hecofit:rest-timer',
      partialize: (state) => ({
        status: state.status,
        durationSeconds: state.durationSeconds,
        endsAt: state.endsAt,
        remainingSeconds: state.remainingSeconds,
        label: state.label,
        startedAt: state.startedAt,
      }),
    },
  ),
);
