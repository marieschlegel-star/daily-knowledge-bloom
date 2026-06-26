// ─── Fach (Subject) ────────────────────────────────────────────────
export type Fach = "ZPO" | "ZivR" | "ZPO III" | "StrafR" | "StPO" | "VwR" | "VwGO";

export const FACH_COLORS: Record<Fach | "default", { bg: string; text: string; border: string }> = {
  ZPO:    { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" },
  "ZPO III": { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" },
  ZivR:   { bg: "#EAF3DE", text: "#3B6D11", border: "#BBF7D0" },
  StrafR: { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" },
  StPO:   { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" },
  VwR:    { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },
  VwGO:   { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },
  default: { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0" },
};

export const FACH_CALENDAR_COLORS: Record<string, string> = {
  ZPO:    "#1E40AF",
  "ZPO III": "#1E40AF",
  ZivR:   "#3B6D11",
  StrafR: "#5B21B6",
  StPO:   "#5B21B6",
  VwR:    "#065F46",
  VwGO:   "#065F46",
};

// ─── Lernplan (Learning Session) ───────────────────────────────────
export type LernStatus = "Skript geschrieben" | "Hemmer" | "Ankis" | "AG" | "offen";
export type Priority = "High" | "Medium" | "Low";

// Einfacher Planungsstatus eines Lernblocks (zusätzlich zu den Lern-Tags)
export type PlanStatus = "geplant" | "begonnen" | "erledigt";

export const PLAN_STATUS_CONFIG: Record<PlanStatus, { label: string; emoji: string; color: string; bg: string }> = {
  geplant:  { label: "Geplant",  emoji: "○", color: "#64748B", bg: "#F1F5F9" },
  begonnen: { label: "Begonnen", emoji: "◐", color: "#B45309", bg: "#FEF3C7" },
  erledigt: { label: "Erledigt", emoji: "●", color: "#15803D", bg: "#DCFCE7" },
};

// Lokale Zusatz-Metadaten je Lernblock (Browser-localStorage, nicht in Notion)
export interface LernblockMeta {
  unterthema?: string;
  lernziel?: string;
  notizen?: string;
  planStatus?: PlanStatus;
  farbe?: string; // Hex-Override, sonst Fach-Farbe
}

// ─── Themenleiste (Rechtsgebiete) ──────────────────────────────────
export interface RechtsgebietGruppe {
  id: string;
  label: string;
  emoji: string;
  subject: Fach;        // welches Fach beim Drop gesetzt wird
  themen: string[];     // selbst gepflegte Unterthemen
}

export interface LernSession {
  id: string;
  title: string;
  subject: Fach;
  date: string | null;
  duration: number; // hours
  status: LernStatus[];
  priority: Priority;
  examensrelevanz: number[];
  completed: boolean;
  wiederholungen: number;
  klausurenIds: string[];
  pomodoroIds: string[];
  todoIds: string[];
  parentId: string | null;
  subIds: string[];
  unterlagen: string[];
  lernTodos: string; // rich text
  // Lokale Zusatzfelder (aus lernblock-store überlagert, optional)
  unterthema?: string;
  lernziel?: string;
  notizen?: string;
  planStatus?: PlanStatus;
  farbe?: string;
}

// ─── Klausuren ─────────────────────────────────────────────────────
export type KlausurStatus =
  | "offen"
  | "zu schreiben"
  | "geschrieben"
  | "nachzuarbeiten"
  | "Benotet"
  | "nachgearbeitet";

export type KlausurOrt = "Hemmer" | "AG" | "AssK" | "Uni" | string;

export interface Klausur {
  id: string;
  title: string;
  fach: Fach;
  ort: KlausurOrt;
  status: KlausurStatus;
  ausgabeDatum: string | null;
  schreibDatum: string | null;
  abgabeDatum: string | null;
  nachbesprechung: string | null;
  nachbearbeiten: string | null;
  note: string;
  problemuebersicht: string;
  lernplanIds: string[];
}

// ─── To-Do ─────────────────────────────────────────────────────────
export type TodoKategorie = "Lernen" | "KK" | "AssK" | "AG";

export interface Todo {
  id: string;
  name: string;
  date: string | null;
  completed: boolean;
  kategorie: TodoKategorie | null;
  kat: string | null;
  lernplanIds: string[];
}

// ─── Time Tracker ──────────────────────────────────────────────────
export type PomodoroTyp = "Pomodoro" | "Short Break" | "Long Break";

export interface PomodoroSession {
  id: string;
  title: string;
  start: string;
  ende: string;
  dauerMin: number;
  typ: PomodoroTyp;
  lerneinheitId: string | null;
}

// ─── Google Calendar ───────────────────────────────────────────────
export interface GCalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  calendarId: string;
  calendarName: string;
  color?: string;
}

export interface GCalCalendar {
  id: string;
  name: string;
  color: string;
}

// ─── Tagesplanung ──────────────────────────────────────────────────
export type DayGrund =
  | "arbeit"
  | "ag"
  | "examensklausur"
  | "privat"
  | "urlaub"
  | "krank"
  | "reise"
  | "feiertag"
  | "sonstiges";

export interface DayPlan {
  grund: string;
  hours: number;
}

export interface CustomDayGrund {
  id: string;
  label: string;
  emoji: string;
  defaultHours: number;
  bg: string;
  color: string;
}

export interface DayGrundDisplay {
  label: string;
  emoji: string;
  defaultHours: number;
  bg: string;
  color: string;
}

export const DAY_GRUND_ORDER: DayGrund[] = [
  "arbeit",
  "ag",
  "examensklausur",
  "privat",
  "urlaub",
  "krank",
  "reise",
  "feiertag",
  "sonstiges",
];

export const DAY_GRUND_CONFIG: Record<DayGrund, {
  label: string;
  emoji: string;
  defaultHours: number;
  bg: string;
  color: string;
}> = {
  arbeit:          { label: "Arbeit",          emoji: "🏛", defaultHours: 3, bg: "rgba(219,234,254,0.35)", color: "#1E40AF" },
  ag:              { label: "AG",              emoji: "📚", defaultHours: 2, bg: "rgba(209,250,229,0.45)", color: "#065F46" },
  examensklausur:  { label: "Examensklausur",  emoji: "⚖", defaultHours: 1, bg: "rgba(254,240,138,0.55)", color: "#854D0E" },
  privat:          { label: "Privat",          emoji: "🏠", defaultHours: 6, bg: "rgba(237,233,254,0.45)", color: "#7C3AED" },
  urlaub:          { label: "Urlaub",          emoji: "🏖", defaultHours: 0, bg: "rgba(254,215,170,0.45)", color: "#C2410C" },
  krank:           { label: "Krank",           emoji: "🤒", defaultHours: 0, bg: "rgba(254,202,202,0.45)", color: "#B91C1C" },
  reise:           { label: "Reise",           emoji: "✈", defaultHours: 0, bg: "rgba(224,242,254,0.45)", color: "#0369A1" },
  feiertag:        { label: "Feiertag",        emoji: "🎉", defaultHours: 0, bg: "rgba(254,226,226,0.45)", color: "#BE123C" },
  sonstiges:       { label: "Sonstiges",       emoji: "➕", defaultHours: 4, bg: "rgba(241,245,249,0.55)", color: "#475569" },
};

/** Ungeplante Tage zählen als voller Lerntag (8h). */
export const DEFAULT_DAY_HOURS = 8;

// ─── UI State ──────────────────────────────────────────────────────
export type CalendarView = "timeGridDay" | "timeGridWeek" | "dayGridMonth" | "listWeek";

export interface CalendarVisibility {
  lernplan: boolean;
  klausuren: boolean;
  todos: boolean;
  gcal: { [calendarId: string]: boolean };
}

export interface ActiveFilters {
  faecher: Fach[];
  todoKategorien: TodoKategorie[];
}

// ─── AI ────────────────────────────────────────────────────────────
export type AIAction =
  | "erklaeren"
  | "testen"
  | "lernfragen"
  | "karteikarten"
  | "klausur"
  | "optimieren";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}
