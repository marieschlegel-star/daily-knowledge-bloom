import { createFileRoute } from "@tanstack/react-router";
import { notionQuery, notionUpdatePage, notionCreatePage } from "@/lib/notion-fetch.server";
import type { LernSession, Fach, LernStatus, Priority } from "@/lib/types";

export const Route = createFileRoute("/api/notion/sessions")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const dbId = process.env.NOTION_LERNPLAN_DB_ID;
          if (!dbId) return Response.json({ error: "DB ID missing" }, { status: 500 });
          const pages = await notionQuery(dbId);
          const sessions: LernSession[] = pages.map((page: any) => {
            const p = page.properties;
            return {
              id: page.id,
              title: p.Session?.title?.[0]?.plain_text ?? "Ohne Titel",
              subject: (p.Subject?.select?.name as Fach) ?? "ZPO",
              date: p.Date?.date?.start ?? null,
              duration: p.Duration?.number ?? 0,
              status: (p.Status?.multi_select?.map((s: any) => s.name) as LernStatus[]) ?? [],
              priority: (p.Priority?.select?.name as Priority) ?? "Medium",
              examensrelevanz: p.Examensrelevanz?.multi_select?.map((s: any) => parseInt(s.name)) ?? [],
              completed: p.Completed?.checkbox ?? false,
              wiederholungen: p.Wiederholungen?.number ?? 0,
              klausurenIds: p.Klausuren?.relation?.map((r: any) => r.id) ?? [],
              pomodoroIds: p["Pomodoro Sessions"]?.relation?.map((r: any) => r.id) ?? [],
              todoIds: p["TO-Do"]?.relation?.map((r: any) => r.id) ?? [],
              parentId: p["Parent item"]?.relation?.[0]?.id ?? null,
              subIds: p["Sub-item"]?.relation?.map((r: any) => r.id) ?? [],
              unterlagen: p.Unterlagen?.files?.map((f: any) => f.name) ?? [],
              lernTodos: p["Aktuelle Lern-To-Dos / Wichtiges"]?.rich_text?.[0]?.plain_text ?? "",
            };
          });
          return Response.json(sessions);
        } catch (e: any) {
          console.error("[sessions]", e.message);
          return Response.json({ error: e.message }, { status: 500 });
        }
      },
      POST: async ({ request }) => {
        try {
          const { title, date, subject, duration } = await request.json();
          const dbId = process.env.NOTION_LERNPLAN_DB_ID;
          if (!dbId) return Response.json({ error: "DB ID missing" }, { status: 500 });
          const page = await notionCreatePage(dbId, {
            Session: { title: [{ text: { content: title || "Neue Lerneinheit" } }] },
            ...(date ? { Date: { date: { start: date } } } : {}),
            ...(subject ? { Subject: { select: { name: subject } } } : {}),
            ...(duration != null ? { Duration: { number: duration } } : {}),
          });
          return Response.json({ id: page.id });
        } catch (e: any) {
          return Response.json({ error: e.message }, { status: 500 });
        }
      },
      PATCH: async ({ request }) => {
        try {
          const { id, date, duration } = await request.json();
          if (!id) return Response.json({ error: "ID required" }, { status: 400 });
          const props: Record<string, unknown> = {};
          if (date !== undefined) props.Date = date ? { date: { start: date } } : { date: null };
          if (duration !== undefined) props.Duration = { number: duration };
          if (Object.keys(props).length === 0) return Response.json({ error: "Nothing to update" }, { status: 400 });
          await notionUpdatePage(id, props);
          return Response.json({ success: true });
        } catch (e: any) {
          return Response.json({ error: e.message }, { status: 500 });
        }
      },
    },
  },
});
