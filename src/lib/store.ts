import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clientJSONStorage } from "./client-storage";
import type {
  CalendarView,
  CalendarVisibility,
  ActiveFilters,
  LernSession,
  Klausur,
  Todo,
  Fach,
  TodoKategorie,
} from "./types";

interface AppState {
  // View
  calendarView: CalendarView;
  setCalendarView: (view: CalendarView) => void;

  // Calendar visibility
  visibility: CalendarVisibility;
  toggleLernplan: () => void;
  toggleKlausuren: () => void;
  toggleTodos: () => void;
  toggleGCal: (calendarId: string) => void;
  setGCalCalendars: (ids: string[]) => void;

  // Active filters
  filters: ActiveFilters;
  toggleFach: (fach: Fach) => void;
  toggleTodoKategorie: (kat: TodoKategorie) => void;

  // Selected session (sidepanel)
  selectedSessionId: string | null;
  setSelectedSessionId: (id: string | null) => void;

  // Google Calendar auth
  gcalAccessToken: string | null;
  setGCalAccessToken: (token: string | null) => void;

  // AI call counter (dev mode)
  aiCallCount: number;
  incrementAiCallCount: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
  calendarView: "timeGridWeek",
  setCalendarView: (view) => set({ calendarView: view }),

  visibility: {
    lernplan: true,
    klausuren: true,
    todos: true,
    gcal: {},
  },
  toggleLernplan: () =>
    set((s) => ({ visibility: { ...s.visibility, lernplan: !s.visibility.lernplan } })),
  toggleKlausuren: () =>
    set((s) => ({ visibility: { ...s.visibility, klausuren: !s.visibility.klausuren } })),
  toggleTodos: () =>
    set((s) => ({ visibility: { ...s.visibility, todos: !s.visibility.todos } })),
  toggleGCal: (calendarId) =>
    set((s) => ({
      visibility: {
        ...s.visibility,
        gcal: {
          ...s.visibility.gcal,
          [calendarId]: !s.visibility.gcal[calendarId],
        },
      },
    })),
  setGCalCalendars: (ids) =>
    set((s) => ({
      visibility: {
        ...s.visibility,
        // default: hidden (false) — user must explicitly enable each calendar
        gcal: Object.fromEntries(ids.map((id) => [id, s.visibility.gcal[id] ?? false])),
      },
    })),

  filters: {
    faecher: [],
    todoKategorien: [],
  },
  toggleFach: (fach) =>
    set((s) => ({
      filters: {
        ...s.filters,
        faecher: s.filters.faecher.includes(fach)
          ? s.filters.faecher.filter((f) => f !== fach)
          : [...s.filters.faecher, fach],
      },
    })),
  toggleTodoKategorie: (kat) =>
    set((s) => ({
      filters: {
        ...s.filters,
        todoKategorien: s.filters.todoKategorien.includes(kat)
          ? s.filters.todoKategorien.filter((k) => k !== kat)
          : [...s.filters.todoKategorien, kat],
      },
    })),

  selectedSessionId: null,
  setSelectedSessionId: (id) => set({ selectedSessionId: id }),

  gcalAccessToken: null,
  setGCalAccessToken: (token) => set({ gcalAccessToken: token }),

  aiCallCount: 0,
  incrementAiCallCount: () => set((s) => ({ aiCallCount: s.aiCallCount + 1 })),
    }),
    {
      name: "juris-app",
      storage: clientJSONStorage,
      skipHydration: true,
      partialize: (s) => ({
        calendarView: s.calendarView,
        visibility: s.visibility,
        filters: s.filters,
      }),
    }
  )
);
