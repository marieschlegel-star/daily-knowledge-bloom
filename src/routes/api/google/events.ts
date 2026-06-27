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

export const Route = createFileRoute("/api/google/events")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const calendarIds = (url.searchParams.get("calendarIds") ?? "").split(",").filter(Boolean);
          const timeMin = url.searchParams.get("timeMin");
          const timeMax = url.searchParams.get("timeMax");
          if (!timeMin || !timeMax || calendarIds.length === 0) {
            return Response.json([]);
          }

          const results = await Promise.all(
            calendarIds.map(async (calendarId) => {
              const params = new URLSearchParams({
                timeMin,
                timeMax,
                singleEvents: "true",
                orderBy: "startTime",
                maxResults: "250",
              });
              const res = await fetch(
                `${GATEWAY}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
                { headers: headers() }
              );
              const data = await res.json();
              if (!res.ok) return [];
              return (data.items ?? [])
                .filter((item: any) => item.start)
                .map((item: any) => {
                  const allDay = !!item.start?.date && !item.start?.dateTime;
                  const start = item.start?.dateTime ?? (item.start?.date ? `${item.start.date}T00:00:00` : "");
                  const end = item.end?.dateTime ?? (item.end?.date ? `${item.end.date}T00:00:00` : start);
                  return {
                    id: `${calendarId}:${item.id}`,
                    title: item.summary ?? "(Ohne Titel)",
                    start,
                    end: allDay ? item.end?.date ?? item.start?.date ?? start : end,
                    allDay,
                    calendarId,
                  };
                });
            })
          );
          return Response.json(results.flat());
        } catch (e: any) {
          return Response.json({ error: e.message }, { status: 500 });
        }
      },
    },
  },
});
