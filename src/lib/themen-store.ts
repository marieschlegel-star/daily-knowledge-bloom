import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RechtsgebietGruppe } from "./types";
import { clientJSONStorage } from "./client-storage";

// 8 Rechtsgebiete als Gerüst — Unterthemen pflegt die Nutzerin selbst.
// Bewusst leere themen-Arrays: nichts wird vorgegeben/"ausgedacht".
const DEFAULT_GRUPPEN: RechtsgebietGruppe[] = [
  { id: "zivilrecht",      label: "Zivilrecht",       emoji: "⚖️", subject: "ZivR",   themen: [] },
  { id: "strafrecht",      label: "Strafrecht",       emoji: "🔨", subject: "StrafR", themen: [] },
  { id: "oeffentliches",   label: "Öffentliches Recht", emoji: "🏛️", subject: "VwR",  themen: [] },
  { id: "staatsrecht",     label: "Staatsrecht",      emoji: "📜", subject: "VwGO",   themen: [] },
  { id: "verwaltungsrecht", label: "Verwaltungsrecht", emoji: "🏢", subject: "VwR",  themen: [] },
  { id: "europarecht",     label: "Europarecht",      emoji: "🇪🇺", subject: "VwGO",  themen: [] },
  { id: "methodenlehre",   label: "Methodenlehre",    emoji: "🧭", subject: "ZivR",   themen: [] },
  { id: "wiederholung",    label: "Wiederholung",     emoji: "🔁", subject: "ZivR",   themen: [] },
];

interface ThemenStoreState {
  gruppen: RechtsgebietGruppe[];
  addThema: (gruppeId: string, thema: string) => void;
  removeThema: (gruppeId: string, thema: string) => void;
  renameThema: (gruppeId: string, oldThema: string, newThema: string) => void;
  resetGruppen: () => void;
}

export const useThemenStore = create<ThemenStoreState>()(
  persist(
    (set) => ({
      gruppen: DEFAULT_GRUPPEN,
      addThema: (gruppeId, thema) =>
        set((s) => ({
          gruppen: s.gruppen.map((g) =>
            g.id === gruppeId && thema.trim() && !g.themen.includes(thema.trim())
              ? { ...g, themen: [...g.themen, thema.trim()] }
              : g
          ),
        })),
      removeThema: (gruppeId, thema) =>
        set((s) => ({
          gruppen: s.gruppen.map((g) =>
            g.id === gruppeId ? { ...g, themen: g.themen.filter((t) => t !== thema) } : g
          ),
        })),
      renameThema: (gruppeId, oldThema, newThema) =>
        set((s) => ({
          gruppen: s.gruppen.map((g) =>
            g.id === gruppeId
              ? { ...g, themen: g.themen.map((t) => (t === oldThema ? newThema.trim() || t : t)) }
              : g
          ),
        })),
      resetGruppen: () => set({ gruppen: DEFAULT_GRUPPEN }),
    }),
    {
      name: "juris-themen",
      storage: clientJSONStorage,
      skipHydration: true,
    }
  )
);
