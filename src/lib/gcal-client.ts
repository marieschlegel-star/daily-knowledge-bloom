import type { GCalCalendar, GCalEvent } from "./types";

// Google Calendar läuft über den Lovable Connector Gateway (server-seitig).
// Kein clientseitiges OAuth nötig – die App nutzt den verknüpften Workspace-Account.

const CONNECTED_TOKEN = "connector";
const FAR_FUTURE = Number.MAX_SAFE_INTEGER;

export async function signInToGoogle(
  _prompt?: "consent"
): Promise<{ token: string; expiresAt: number }> {
  // Verbindung wird über den Connector hergestellt – wir prüfen sie mit einem Call.
  const res = await fetch("/api/google/calendars", { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Google Calendar Verbindung fehlgeschlagen (${res.status})`);
  }
  return { token: CONNECTED_TOKEN, expiresAt: FAR_FUTURE };
}

export async function refreshGoogleTokenIfNeeded(
  token: string | null,
  expiresAt: number | null
): Promise<{ token: string; expiresAt: number } | null> {
  if (!token) return null;
  return { token, expiresAt: expiresAt ?? FAR_FUTURE };
}

export async function revokeGoogleToken(_token: string): Promise<void> {
  // Trennung erfolgt clientseitig durch Leeren des Stores; Connector bleibt verknüpft.
}

export async function fetchGoogleCalendars(_token: string): Promise<GCalCalendar[]> {
  const res = await fetch("/api/google/calendars", { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Google Calendar API Fehler (${res.status})`);
  return body as GCalCalendar[];
}

export async function fetchGoogleEvents(
  _token: string,
  calendarIds: string[],
  timeMin: string,
  timeMax: string,
  calendarMeta: Record<string, GCalCalendar>
): Promise<GCalEvent[]> {
  if (calendarIds.length === 0) return [];
  const params = new URLSearchParams({
    calendarIds: calendarIds.join(","),
    timeMin,
    timeMax,
  });
  const res = await fetch(`/api/google/events?${params}`, { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Google Calendar API Fehler (${res.status})`);
  return (body as Array<Omit<GCalEvent, "calendarName" | "color">>).map((ev) => {
    const meta = calendarMeta[ev.calendarId];
    return { ...ev, calendarName: meta?.name ?? ev.calendarId, color: meta?.color } as GCalEvent;
  });
}
