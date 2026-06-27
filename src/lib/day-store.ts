import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CustomDayGrund, DayPlan } from "./types";
import { DAY_GRUND_CONFIG } from "./types";
import {
  createCustomGrundId,
  defaultHoursForGrund,
  paletteForIndex,
} from "./day-grund";
import { clientJSONStorage } from "./client-storage";

const STORAGE_KEY = "juris-day-plans";
const LEGACY_STORAGE_KEY = "juris-day-types";
const PERSIST_VERSION = 1;

type LegacyDayTyp = "lerntag" | "halb" | "ag" | "urlaub" | "krank" | "privat" | "klausur";

const LEGACY_TYP_TO_PLAN: Record<LegacyDayTyp, DayPlan> = {
  lerntag: { grund: "lerntag", hours: 8 },
  halb: { grund: "lerntag", hours: 4 },
  ag: { grund: "ag", hours: 2 },
  urlaub: { grund: "urlaub", hours: 0 },
  krank: { grund: "krank", hours: 0 },
  privat: { grund: "privat", hours: 6 },
  klausur: { grund: "examensklausur", hours: 1 },
};

export type PersistedDaySlice = {
  dayPlans: Record<string, DayPlan>;
  grundDefaults: Record<string, number>;
  customGrunds: CustomDayGrund[];
};

function buildDefaultGrundDefaults(): Record<string, number> {
  return Object.fromEntries(
    Object.entries(DAY_GRUND_CONFIG).map(([grund, cfg]) => [grund, cfg.defaultHours])
  );
}

function isDayPlan(value: unknown): value is DayPlan {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as DayPlan).grund === "string" &&
    typeof (value as DayPlan).hours === "number"
  );
}

function plansFromLegacyDayTypes(dayTypes: Record<string, unknown>): Record<string, DayPlan> {
  const dayPlans: Record<string, DayPlan> = {};
  for (const [dateStr, typ] of Object.entries(dayTypes)) {
    const plan = LEGACY_TYP_TO_PLAN[typ as LegacyDayTyp];
    if (plan) dayPlans[dateStr] = { ...plan };
  }
  return dayPlans;
}

/** Read and remove the old juris-day-types localStorage entry. */
function consumeLegacyStorageKey(): Record<string, DayPlan> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as {
      state?: { dayTypes?: Record<string, unknown> };
      dayTypes?: Record<string, unknown>;
    };
    const legacy = parsed?.state?.dayTypes ?? parsed?.dayTypes;
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    if (!legacy || typeof legacy !== "object") return {};
    return plansFromLegacyDayTypes(legacy);
  } catch {
    return {};
  }
}

/** Normalize any persisted blob (new or legacy shape) into dayPlans + defaults. */
export function normalizePersistedDayState(persisted: unknown): PersistedDaySlice {
  const dayPlans: Record<string, DayPlan> = { ...consumeLegacyStorageKey() };

  if (!persisted || typeof persisted !== "object") {
    return { dayPlans, grundDefaults: {}, customGrunds: [] };
  }

  const obj = persisted as Record<string, unknown>;

  if (obj.dayPlans && typeof obj.dayPlans === "object") {
    for (const [dateStr, plan] of Object.entries(obj.dayPlans as Record<string, unknown>)) {
      if (isDayPlan(plan)) dayPlans[dateStr] = plan;
    }
  } else if (obj.dayTypes && typeof obj.dayTypes === "object") {
    Object.assign(dayPlans, plansFromLegacyDayTypes(obj.dayTypes as Record<string, unknown>));
  }

  const grundDefaults =
    obj.grundDefaults && typeof obj.grundDefaults === "object"
      ? (obj.grundDefaults as Record<string, number>)
      : {};

  const customGrunds = Array.isArray(obj.customGrunds)
    ? (obj.customGrunds as CustomDayGrund[]).filter(
        (c) => c && typeof c.id === "string" && typeof c.label === "string"
      )
    : [];

  // Recover plans that were migrated from legacy "lerntag" → "sonstiges".
  for (const [dateStr, plan] of Object.entries(dayPlans)) {
    if (plan.grund !== "sonstiges") continue;
    if (plan.hours === 8) dayPlans[dateStr] = { grund: "lerntag", hours: 8 };
    else if (plan.hours === 4) dayPlans[dateStr] = { grund: "lerntag", hours: 4 };
  }

  return { dayPlans, grundDefaults, customGrunds };
}

interface DayStoreState extends PersistedDaySlice {
  setDayPlan: (dateStr: string, plan: DayPlan) => void;
  removeDayPlan: (dateStr: string) => void;
  setGrundDefault: (grundId: string, hours: number) => void;
  getGrundDefault: (grundId: string) => number;
  addCustomGrund: (input: { label: string; emoji: string; defaultHours: number }) => string;
  removeCustomGrund: (id: string) => void;
  clearAll: () => void;
}

const emptySlice: PersistedDaySlice = {
  dayPlans: {},
  grundDefaults: buildDefaultGrundDefaults(),
  customGrunds: [],
};

export const useDayStore = create<DayStoreState>()(
  persist(
    (set, get) => ({
      ...emptySlice,
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
      name: STORAGE_KEY,
      version: PERSIST_VERSION,
      storage: clientJSONStorage,
      skipHydration: true,
      partialize: (state) => ({
        dayPlans: state.dayPlans,
        grundDefaults: state.grundDefaults,
        customGrunds: state.customGrunds,
      }),
      migrate: (persisted) => normalizePersistedDayState(persisted),
      merge: (persisted, current) => {
        const normalized = normalizePersistedDayState(persisted);
        return {
          ...current,
          dayPlans: normalized.dayPlans,
          grundDefaults: {
            ...buildDefaultGrundDefaults(),
            ...normalized.grundDefaults,
          },
          customGrunds: normalized.customGrunds,
        };
      },
    }
  )
);
