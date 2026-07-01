import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { PomodoroTimer } from "@/components/pomodoro-timer";
import { DUMMY_SESSIONS } from "@/lib/dummy-data";
import type { LernSession } from "@/lib/types";

/**
 * Einbettbare Timer-Seite für Notion.
 * In Notion: /embed → https://<app-url>/timer?session=<notion-page-id>
 * Der session-Parameter akzeptiert die Page-ID (mit/ohne Bindestriche)
 * oder eine komplette Notion-URL – die ID wird automatisch extrahiert.
 */

// Extrahiert die 32-stellige Hex-ID aus ID oder Notion-URL
function extractPageId(raw: string): string | null {
  const m = raw.replace(/-/g, "").match(/[0-9a-f]{32}/i);
  return m ? m[0].toLowerCase() : null;
}

function TimerEmbedPage() {
  const { session: sessionParam } = Route.useSearch();

  const { data: sessions = DUMMY_SESSIONS } = useQuery<LernSession[]>({
    queryKey: ["sessions"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/notion/sessions", { cache: "no-store" });
        return res.ok ? res.json() : DUMMY_SESSIONS;
      } catch {
        return DUMMY_SESSIONS;
      }
    },
    staleTime: 30_000,
  });

  const initialSession = useMemo(() => {
    if (!sessionParam) return null;
    const target = extractPageId(sessionParam);
    if (!target) return null;
    return sessions.find((s) => extractPageId(s.id) === target) ?? null;
  }, [sessions, sessionParam]);

  return <PomodoroTimer sessions={sessions} initialSession={initialSession} fullPage compact />;
}

export const Route = createFileRoute("/timer")({
  component: TimerEmbedPage,
  validateSearch: (search: Record<string, unknown>): { session?: string } => ({
    session: typeof search.session === "string" && search.session ? search.session : undefined,
  }),
});
