import { createFileRoute } from "@tanstack/react-router";

const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

function headers() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gcalKey = process.env.GOOGLE_CALENDAR_API_KEY;
  if (!lovableKey || !gcalKey) throw new Error("Google Calendar Connector ist nicht konfiguriert");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": gcalKey,
  };
}

export const Route = createFileRoute("/api/google/calendars")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const res = await fetch(`${GATEWAY}/users/me/calendarList?minAccessRole=reader`, {
            headers: headers(),
          });
          const body = await res.json();
          if (!res.ok) {
            return Response.json({ error: body?.error?.message ?? `Gateway ${res.status}` }, { status: res.status });
          }
          const calendars = (body.items ?? []).map((c: any) => ({
            id: c.id,
            name: c.summary,
            color: c.backgroundColor ?? "#888780",
          }));
          return Response.json(calendars);
        } catch (e: any) {
          return Response.json({ error: e.message }, { status: 500 });
        }
      },
    },
  },
});
