import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GCalCalendar } from "./types";
import { clientJSONStorage } from "./client-storage";

interface GCalState {
  accessToken: string | null;
  expiresAt: number | null;
  calendars: GCalCalendar[];
  setAuth: (token: string, expiresAt: number) => void;
  clearAuth: () => void;
  setCalendars: (calendars: GCalCalendar[]) => void;
}

export const useGCalStore = create<GCalState>()(
  persist(
    (set) => ({
      accessToken: null,
      expiresAt: null,
      calendars: [],
      setAuth: (token, expiresAt) => set({ accessToken: token, expiresAt }),
      clearAuth: () => set({ accessToken: null, expiresAt: null, calendars: [] }),
      setCalendars: (calendars) => set({ calendars }),
    }),
    {
      name: "juris-gcal",
      storage: clientJSONStorage,
      skipHydration: true,
      partialize: (s) => ({
        accessToken: s.accessToken,
        expiresAt: s.expiresAt,
        calendars: s.calendars,
      }),
    }
  )
);
