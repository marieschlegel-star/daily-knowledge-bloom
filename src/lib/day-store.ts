import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DayTyp } from "./types";

interface DayStoreState {
  dayTypes: Record<string, DayTyp>; // key: "YYYY-MM-DD"
  setDayType: (dateStr: string, typ: DayTyp) => void;
  removeDayType: (dateStr: string) => void;
  clearAll: () => void;
}

export const useDayStore = create<DayStoreState>()(
  persist(
    (set) => ({
      dayTypes: {},
      setDayType: (dateStr, typ) =>
        set((s) => ({ dayTypes: { ...s.dayTypes, [dateStr]: typ } })),
      removeDayType: (dateStr) =>
        set((s) => {
          const next = { ...s.dayTypes };
          delete next[dateStr];
          return { dayTypes: next };
        }),
      clearAll: () => set({ dayTypes: {} }),
    }),
    { name: "juris-day-types" }
  )
);
