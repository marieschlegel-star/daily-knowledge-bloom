import type { GCalCalendar, GCalEvent } from "./types";

const GSI_SCRIPT = "https://accounts.google.com/gsi/client";
const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
};

type TokenClient = {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
          }) => TokenClient;
          revoke: (token: string, done: () => void) => void;
        };
      };
    };
  }
}

let gsiPromise: Promise<void> | null = null;
let clientIdCache: string | null = null;

async function loadGsiScript(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.google?.accounts?.oauth2) return;
  if (gsiPromise) return gsiPromise;

  gsiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Sign-In konnte nicht geladen werden.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = GSI_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Sign-In konnte nicht geladen werden."));
    document.head.appendChild(script);
  });

  return gsiPromise;
}

export async function fetchGoogleClientId(): Promise<string> {
  if (clientIdCache) return clientIdCache;
  const res = await fetch("/api/google/config", { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.clientId) {
    throw new Error(body?.error ?? "Google Calendar ist nicht konfiguriert (GOOGLE_CLIENT_ID fehlt).");
  }
  clientIdCache = body.clientId as string;
  return clientIdCache;
}

function requestAccessToken(clientId: string, prompt?: string): Promise<{ token: string; expiresAt: number }> {
  return new Promise((resolve, reject) => {
    const oauth = window.google?.accounts?.oauth2;
    if (!oauth) {
      reject(new Error("Google Sign-In ist nicht bereit."));
      return;
    }

    const client = oauth.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? "Google-Anmeldung abgebrochen."));
          return;
        }
        const expiresIn = response.expires_in ?? 3600;
        resolve({
          token: response.access_token,
          expiresAt: Date.now() + expiresIn * 1000 - 60_000,
        });
      },
    });

    client.requestAccessToken(prompt ? { prompt } : undefined);
  });
}

export async function signInToGoogle(prompt?: "consent"): Promise<{ token: string; expiresAt: number }> {
  await loadGsiScript();
  const clientId = await fetchGoogleClientId();
  return requestAccessToken(clientId, prompt);
}

export async function refreshGoogleTokenIfNeeded(
  token: string | null,
  expiresAt: number | null
): Promise<{ token: string; expiresAt: number } | null> {
  if (!token || !expiresAt) return null;
  if (Date.now() < expiresAt) return { token, expiresAt };

  try {
    await loadGsiScript();
    const clientId = await fetchGoogleClientId();
    return await requestAccessToken(clientId);
  } catch {
    return null;
  }
}

export function revokeGoogleToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    const oauth = window.google?.accounts?.oauth2;
    if (!oauth) {
      resolve();
      return;
    }
    oauth.revoke(token, () => resolve());
  });
}

async function googleFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Google Calendar API Fehler (${res.status})`);
  }
  return body as T;
}

export async function fetchGoogleCalendars(token: string): Promise<GCalCalendar[]> {
  const data = await googleFetch<{ items?: Array<{ id: string; summary: string; backgroundColor?: string }> }>(
    "/users/me/calendarList?minAccessRole=reader",
    token
  );

  return (data.items ?? []).map((cal) => ({
    id: cal.id,
    name: cal.summary,
    color: cal.backgroundColor ?? "#888780",
  }));
}

export async function fetchGoogleEvents(
  token: string,
  calendarIds: string[],
  timeMin: string,
  timeMax: string,
  calendarMeta: Record<string, GCalCalendar>
): Promise<GCalEvent[]> {
  if (calendarIds.length === 0) return [];

  const results = await Promise.all(
    calendarIds.map(async (calendarId) => {
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
      });
      const encodedId = encodeURIComponent(calendarId);
      const data = await googleFetch<{
        items?: Array<{
          id: string;
          summary?: string;
          start?: { dateTime?: string; date?: string };
          end?: { dateTime?: string; date?: string };
        }>;
      }>(`/calendars/${encodedId}/events?${params}`, token);

      const meta = calendarMeta[calendarId];
      return (data.items ?? [])
        .filter((item) => item.start)
        .map((item) => {
          const allDay = !!item.start?.date && !item.start?.dateTime;
          const start = item.start?.dateTime ?? (item.start?.date ? `${item.start.date}T00:00:00` : "");
          const end = item.end?.dateTime
            ?? (item.end?.date ? `${item.end.date}T00:00:00` : start);
          return {
            id: `${calendarId}:${item.id}`,
            title: item.summary ?? "(Ohne Titel)",
            start,
            end: allDay ? item.end?.date ?? item.start?.date ?? start : end,
            allDay,
            calendarId,
            calendarName: meta?.name ?? calendarId,
            color: meta?.color,
          } satisfies GCalEvent;
        });
    })
  );

  return results.flat();
}
