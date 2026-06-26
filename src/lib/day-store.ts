import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CustomDayGrund, DayPlan } from "./types";
import { DAY_GRUND_CONFIG } from "./types";
import {
  createCustomGrundId,
  defaultHoursForGrund,
  paletteForIndex,
} from "./day-grund";

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

function buildDefaultGrundDefaults(): Record<string, number> {
  return Object.fromEntries(
    Object.entries(DAY_GRUND_CONFIG).map(([grund, cfg]) => [grund, cfg.defaultHours])
  );
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
  grundDefaults: Record<string, number>;
  customGrunds: CustomDayGrund[];
  setDayPlan: (dateStr: string, plan: DayPlan) => void;
  removeDayPlan: (dateStr: string) => void;
  setGrundDefault: (grundId: string, hours: number) => void;
  getGrundDefault: (grundId: string) => number;
  addCustomGrund: (input: { label: string; emoji: string; defaultHours: number }) => string;
  removeCustomGrund: (id: string) => void;
  clearAll: () => void;
}

export const useDayStore = create<DayStoreState>()(
  persist(
    (set, get) => ({
      dayPlans: migrateLegacyDayTypes(),
      grundDefaults: buildDefaultGrundDefaults(),
      customGrunds: [],
      setDayPlan: (dateStr, plan) =>
        set((s) => ({ dayPlans: { ...s.dayPlans, [dateStr]: plan } })),
      removeDayPlan: (dateStr) =>
        set((s) => {
          const next = { ...s.dayPlans };
          delete next[dateStr];
          return { dayPlans: next };
        }),
      setGrundDefault: (grundId, hours) =>
        set((s) => ({
          grundDefaults: { ...s.grundDefaults, [grundId]: hours },
        })),
      getGrundDefault: (grundId) =>
        defaultHoursForGrund(grundId, get().customGrunds, get().grundDefaults),
      addCustomGrund: ({ label, emoji, defaultHours }) => {
        const id = createCustomGrundId();
        const palette = paletteForIndex(get().customGrunds.length);
        const entry: CustomDayGrund = {
          id,
          label: label.trim() || "Eigene Kategorie",
          emoji: emoji.trim() || "📌",
          defaultHours,
          ...palette,
        };
        set((s) => ({
          customGrunds: [...s.customGrunds, entry],
          grundDefaults: { ...s.grundDefaults, [id]: defaultHours },
        }));
        return id;
      },
      removeCustomGrund: (id) =>
        set((s) => {
          const dayPlans = { ...s.dayPlans };
          for (const [dateStr, plan] of Object.entries(dayPlans)) {
            if (plan.grund === id) delete dayPlans[dateStr];
          }
          const grundDefaults = { ...s.grundDefaults };
          delete grundDefaults[id];
          return {
            customGrunds: s.customGrunds.filter((c) => c.id !== id),
            dayPlans,
            grundDefaults,
          };
        }),
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
          customGrunds: p?.customGrunds ?? [],
        };
      },
    }
  )
);
