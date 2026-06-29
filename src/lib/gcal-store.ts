import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GCalCalendar } from "./types";
import { clientJSONStorage } from "./client-storage";

interface GCalState {
  accessToken: string | null;
  expiresAt: number | null;
  calendars: GCalCalendar[];
  customColors: Record<string, string>;
  setAuth: (token: string, expiresAt: number) => void;
  clearAuth: () => void;
  setCalendars: (calendars: GCalCalendar[]) => void;
  setCalendarColor: (calendarId: string, color: string) => void;
}

export const useGCalStore = create<GCalState>()(
  persist(
    (set) => ({
      accessToken: null,
      expiresAt: null,
      calendars: [],
      customColors: {},
      setAuth: (token, expiresAt) => set({ accessToken: token, expiresAt }),
      clearAuth: () => set({ accessToken: null, expiresAt: null, calendars: [] }),
      setCalendars: (calendars) => set({ calendars }),
      setCalendarColor: (calendarId, color) =>
        set((s) => ({ customColors: { ...s.customColors, [calendarId]: color } })),
    }),
    {
      name: "juris-gcal",
      storage: clientJSONStorage,
      skipHydration: true,
      partialize: (s) => ({
        accessToken: s.accessToken,
        expiresAt: s.expiresAt,
        calendars: s.calendars,
        customColors: s.customColors,
      }),
    }
  )
);
