import { createFileRoute } from "@tanstack/react-router";
import { notionQuery, notionUpdatePage, notionCreatePage } from "@/lib/notion-fetch.server";
import type { Todo, TodoKategorie } from "@/lib/types";

export const Route = createFileRoute("/api/notion/todos")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const dbId = process.env.NOTION_TODO_DB_ID;
          if (!dbId) return Response.json({ error: "DB ID missing" }, { status: 500 });
          const pages = await notionQuery(dbId);
          const todos: Todo[] = pages.map((page: any) => {
            const p = page.properties;
            return {
              id: page.id,
              name: p.Name?.title?.[0]?.plain_text ?? "Ohne Titel",
              date: p.Dat?.date?.start ?? null,
              completed: p.Kontrollkästchen?.checkbox ?? false,
              kategorie: (p.Auswählen?.select?.name as TodoKategorie) ?? null,
              kat: p.kat?.select?.name ?? null,
              lernplanIds: p.Lernplan?.relation?.map((r: any) => r.id) ?? [],
            };
          });
          return Response.json(todos);
        } catch (e: any) {
          console.error("[todos]", e.message);
          return Response.json({ error: e.message }, { status: 500 });
        }
      },
      POST: async ({ request }) => {
        try {
          const { name, date, kategorie } = await request.json();
          const dbId = process.env.NOTION_TODO_DB_ID;
          if (!dbId) return Response.json({ error: "DB ID missing" }, { status: 500 });
          const page = await notionCreatePage(dbId, {
            Name: { title: [{ text: { content: name || "Neues To-Do" } }] },
            ...(date ? { Dat: { date: { start: date } } } : {}),
            ...(kategorie ? { Auswählen: { select: { name: kategorie } } } : {}),
          });
          return Response.json({ id: page.id });
        } catch (e: any) {
          return Response.json({ error: e.message }, { status: 500 });
        }
      },
      PATCH: async ({ request }) => {
        try {
          const { id, completed } = await request.json();
          if (!id) return Response.json({ error: "ID required" }, { status: 400 });
          await notionUpdatePage(id, { Kontrollkästchen: { checkbox: completed } });
          return Response.json({ success: true });
        } catch (e: any) {
          return Response.json({ error: e.message }, { status: 500 });
        }
      },
    },
  },
});
