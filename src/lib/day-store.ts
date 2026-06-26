import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DayGrund, DayPlan } from "./types";
import { DAY_GRUND_CONFIG } from "./types";

const LEGACY_STORAGE_KEY = "juris-day-types";

type LegacyDayTyp = "lerntag" | "halb" | "ag" | "urlaub" | "krank" | "privat" | "klausur";

const LEGACY_MIGRATION: Record<LegacyDayTyp, DayPlan> = {
  lerntag: { grund: "sonstiges", hours: 8 },
  halb: { grund: "sonstiges", hours: 4 },
  ag: { grund: "ag", hours: 2 },
  urlaub: { grund: "urlaub", hours: 0 },
  krank: { grund: "krank", hours: 0 },
  privat: { grund: "privat", hours: 6 },
  klausur: { grund: "examensklausur", hours: 1 },
};

function buildDefaultGrundDefaults(): Record<DayGrund, number> {
  return Object.fromEntries(
    Object.entries(DAY_GRUND_CONFIG).map(([grund, cfg]) => [grund, cfg.defaultHours])
  ) as Record<DayGrund, number>;
}

function migrateLegacyDayTypes(): Record<string, DayPlan> {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const legacy = parsed?.state?.dayTypes ?? parsed?.dayTypes;
    if (!legacy || typeof legacy !== "object") return {};

    const dayPlans: Record<string, DayPlan> = {};
    for (const [dateStr, typ] of Object.entries(legacy)) {
      const plan = LEGACY_MIGRATION[typ as LegacyDayTyp];
      if (plan) dayPlans[dateStr] = plan;
    }
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return dayPlans;
  } catch {
    return {};
  }
}

interface DayStoreState {
  dayPlans: Record<string, DayPlan>;
  grundDefaults: Record<DayGrund, number>;
  setDayPlan: (dateStr: string, plan: DayPlan) => void;
  removeDayPlan: (dateStr: string) => void;
  setGrundDefault: (grund: DayGrund, hours: number) => void;
  getGrundDefault: (grund: DayGrund) => number;
  clearAll: () => void;
}

export const useDayStore = create<DayStoreState>()(
  persist(
    (set, get) => ({
      dayPlans: migrateLegacyDayTypes(),
      grundDefaults: buildDefaultGrundDefaults(),
      setDayPlan: (dateStr, plan) =>
        set((s) => ({ dayPlans: { ...s.dayPlans, [dateStr]: plan } })),
      removeDayPlan: (dateStr) =>
        set((s) => {
          const next = { ...s.dayPlans };
          delete next[dateStr];
          return { dayPlans: next };
        }),
      setGrundDefault: (grund, hours) =>
        set((s) => ({
          grundDefaults: { ...s.grundDefaults, [grund]: hours },
        })),
      getGrundDefault: (grund) => get().grundDefaults[grund] ?? DAY_GRUND_CONFIG[grund].defaultHours,
      clearAll: () => set({ dayPlans: {} }),
    }),
    {
      name: "juris-day-plans",
      merge: (persisted, current) => {
        const p = persisted as Partial<DayStoreState> | undefined;
        return {
          ...current,
          ...p,
          dayPlans: { ...migrateLegacyDayTypes(), ...(p?.dayPlans ?? {}) },
          grundDefaults: {
            ...buildDefaultGrundDefaults(),
            ...(p?.grundDefaults ?? {}),
          },
        };
      },
    }
  )
);
