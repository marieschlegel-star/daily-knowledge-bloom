import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInDays, parseISO, isValid, format } from "date-fns";
import type { Fach, DayPlan, CustomDayGrund } from "./types";
import { FACH_COLORS, DEFAULT_DAY_HOURS } from "./types";
import { resolveGrundConfig } from "./day-grund";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFachColors(fach: Fach | string | null) {
  if (!fach) return FACH_COLORS.default;
  return FACH_COLORS[fach as Fach] ?? FACH_COLORS.default;
}

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return null;
    return differenceInDays(date, new Date());
  } catch {
    return null;
  }
}

export function countdownLabel(days: number | null): { label: string; color: string } {
  if (days === null) return { label: "–", color: "text-muted-foreground" };
  if (days < 0) return { label: `${Math.abs(days)}d überfällig`, color: "text-red-600" };
  if (days === 0) return { label: "Heute", color: "text-red-600" };
  if (days <= 7) return { label: `${days} Tage`, color: "text-red-500" };
  if (days <= 21) return { label: `${days} Tage`, color: "text-amber-500" };
  return { label: `${days} Tage`, color: "text-green-600" };
}

export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  if (hours % 1 === 0) return `${hours}h`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}min`;
}

/** Local datetime string without UTC shift (Notion + FullCalendar). */
export function toLocalISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

export function toDateOnly(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Snap event length to N-minute steps (default 5 min, min 5 min). */
export function durationHoursFromRange(start: Date, end: Date, stepMin = 5): number {
  const stepMs = stepMin * 60_000;
  const ms = Math.max(stepMs, end.getTime() - start.getTime());
  return Math.round(ms / stepMs) * stepMin / 60;
}

export function priorityColor(priority: string | null): string {
  switch (priority) {
    case "High": return "text-red-500";
    case "Medium": return "text-amber-500";
    case "Low": return "text-green-500";
    default: return "text-muted-foreground";
  }
}

export function formatDayPlanLabel(
  grundId: string,
  hours: number,
  customGrunds: CustomDayGrund[] = [],
  workHours?: number
): string {
  const cfg = resolveGrundConfig(grundId, customGrunds);
  if (!cfg) return hours > 0 ? `${hours} h` : "Geplant";
  if (grundId === "arbeit") {
    const wh = workHours ?? 8;
    return hours > 0
      ? `${cfg.emoji} ${wh}h Arbeit · ${hours}h Lernen`
      : `${cfg.emoji} ${wh}h Arbeit`;
  }
  if (hours > 0) return `${cfg.emoji} ${cfg.label} · ${hours} h`;
  return `${cfg.emoji} ${cfg.label}`;
}

export function formatDayPlanHoursLabel(hours: number, grundId?: string): string {
  if (grundId === "arbeit") {
    if (hours === 0) return "Keine Lernzeit eingeplant";
    if (hours === 1) return "1 h Lernzeit neben der Arbeit";
    return `${hours} h Lernzeit neben der Arbeit`;
  }
  if (hours === 1) return "1 Stunde Lernen";
  return `${hours} Stunden Lernen`;
}

function dayLearningHours(dayPlans: Record<string, DayPlan>, dateKey: string): number {
  const plan = dayPlans[dateKey];
  return plan ? plan.hours : DEFAULT_DAY_HOURS;
}

/** Berechnet Kalender-, effektive Lerntage und Nicht-Lerntage zwischen zwei Daten. */
export function calcEffektiveLerntage(
  dayPlans: Record<string, DayPlan>,
  from: Date,
  to: Date
): { kalender: number; effektiv: number; nichtLerntage: number } {
  let kalender = 0;
  let effektiv = 0;
  let nichtLerntage = 0;

  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    kalender++;
    const key = format(cursor, "yyyy-MM-dd");
    const hours = dayLearningHours(dayPlans, key);
    if (hours > 0) {
      effektiv += hours / DEFAULT_DAY_HOURS;
    } else {
      nichtLerntage++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { kalender, effektiv: Math.round(effektiv * 2) / 2, nichtLerntage };
}

export function priorityDot(priority: string | null): string {
  switch (priority) {
    case "High": return "bg-red-500";
    case "Medium": return "bg-amber-400";
    case "Low": return "bg-green-500";
    default: return "bg-muted";
  }
}
