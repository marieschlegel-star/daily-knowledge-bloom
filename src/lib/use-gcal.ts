import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchGoogleCalendars,
  fetchGoogleEvents,
  refreshGoogleTokenIfNeeded,
  revokeGoogleToken,
  signInToGoogle,
} from "./gcal-client";
import { useGCalStore } from "./gcal-store";
import { useAppStore } from "./store";
import { useGCalReady } from "./use-persist-ready";
import type { GCalEvent } from "./types";

export function useGCalConnection() {
  const ready = useGCalReady();
  const { accessToken, expiresAt, calendars, setAuth, clearAuth, setCalendars } = useGCalStore();
  const { setGCalCalendars } = useAppStore();
  const [connecting, setConnecting] = useState(false);

  const syncCalendars = useCallback(async (token: string) => {
    const list = await fetchGoogleCalendars(token);
    setCalendars(list);
    setGCalCalendars(list.map((c) => c.id));
    return list;
  }, [setCalendars, setGCalCalendars]);

  useEffect(() => {
    if (!ready || !accessToken) return;

    let cancelled = false;
    (async () => {
      const refreshed = await refreshGoogleTokenIfNeeded(accessToken, expiresAt);
      if (cancelled) return;

      if (!refreshed) {
        clearAuth();
        setGCalCalendars([]);
        return;
      }

      if (refreshed.token !== accessToken) {
        setAuth(refreshed.token, refreshed.expiresAt);
      }

      if (calendars.length === 0) {
        try {
          await syncCalendars(refreshed.token);
        } catch (error) {
          if (!cancelled) {
            toast.error("Google-Kalender konnten nicht geladen werden", {
              description: error instanceof Error ? error.message : undefined,
            });
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, accessToken, expiresAt, calendars.length, clearAuth, setAuth, setGCalCalendars, syncCalendars]);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const auth = await signInToGoogle("consent");
      setAuth(auth.token, auth.expiresAt);
      await syncCalendars(auth.token);
      toast.success("Google Calendar verbunden");
    } catch (error) {
      toast.error("Verbindung fehlgeschlagen", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setConnecting(false);
    }
  }, [setAuth, syncCalendars]);

  const disconnect = useCallback(async () => {
    if (accessToken) {
      try {
        await revokeGoogleToken(accessToken);
      } catch {
        // ignore revoke errors
      }
    }
    clearAuth();
    setGCalCalendars([]);
    toast.success("Google Calendar getrennt");
  }, [accessToken, clearAuth, setGCalCalendars]);

  return {
    ready,
    connected: !!accessToken,
    connecting,
    calendars,
    connect,
    disconnect,
  };
}

export function useGCalEvents(range: { start: Date; end: Date } | null): GCalEvent[] {
  const ready = useGCalReady();
  const { accessToken, expiresAt, calendars } = useGCalStore();
  const { visibility } = useAppStore();

  const visibleCalendarIds = useMemo(
    () => calendars
      .map((c) => c.id)
      .filter((id) => visibility.gcal[id] !== false),
    [calendars, visibility.gcal]
  );

  const calendarMeta = useMemo(
    () => Object.fromEntries(calendars.map((c) => [c.id, c])),
    [calendars]
  );

  const { data = [] } = useQuery({
    queryKey: [
      "gcal-events",
      accessToken,
      expiresAt,
      range?.start.toISOString(),
      range?.end.toISOString(),
      visibleCalendarIds.join(","),
    ],
    enabled: ready && !!accessToken && !!range && visibleCalendarIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const refreshed = await refreshGoogleTokenIfNeeded(accessToken, expiresAt);
      if (!refreshed || !range) return [];

      if (refreshed.token !== accessToken) {
        useGCalStore.getState().setAuth(refreshed.token, refreshed.expiresAt);
      }

      return fetchGoogleEvents(
        refreshed.token,
        visibleCalendarIds,
        range.start.toISOString(),
        range.end.toISOString(),
        calendarMeta
      );
    },
  });

  return data;
}
