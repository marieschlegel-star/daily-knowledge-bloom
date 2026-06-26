import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LernblockMeta } from "./types";

interface LernblockStoreState {
  // Zusatz-Metadaten je Lernblock, key = sessionId
  meta: Record<string, LernblockMeta>;
  // Freitext-Notiz je Kalendertag, key = "YYYY-MM-DD"
  dayNotes: Record<string, string>;

  setMeta: (sessionId: string, patch: Partial<LernblockMeta>) => void;
  clearMeta: (sessionId: string) => void;
  setDayNote: (dateStr: string, note: string) => void;
}

export const useLernblockStore = create<LernblockStoreState>()(
  persist(
    (set) => ({
      meta: {},
      dayNotes: {},
      setMeta: (sessionId, patch) =>
        set((s) => ({
          meta: { ...s.meta, [sessionId]: { ...s.meta[sessionId], ...patch } },
        })),
      clearMeta: (sessionId) =>
        set((s) => {
          const next = { ...s.meta };
          delete next[sessionId];
          return { meta: next };
        }),
      setDayNote: (dateStr, note) =>
        set((s) => ({ dayNotes: { ...s.dayNotes, [dateStr]: note } })),
    }),
    { name: "juris-lernblock-meta" }
  )
);
