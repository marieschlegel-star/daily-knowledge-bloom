import { createFileRoute } from "@tanstack/react-router";
import { notionQuery, notionUpdatePage, notionCreatePage, notionGetPage } from "@/lib/notion-fetch.server";
import {
  readCheckbox,
  readDate,
  readRelationIds,
  readSelect,
  readTitle,
  findPropertyKey,
} from "@/lib/notion-properties.server";
import type { Todo, TodoKategorie } from "@/lib/types";

let cachedCheckboxKey: string | null = null;

function rememberCheckboxKey(properties: Record<string, unknown>) {
  const key = findPropertyKey(properties as any, "checkbox", "Kontrollkästchen");
  if (key) cachedCheckboxKey = key;
}

async function resolveCheckboxKey(pageId: string): Promise<string> {
  if (cachedCheckboxKey) return cachedCheckboxKey;
  const page = await notionGetPage(pageId);
  rememberCheckboxKey(page.properties);
  if (!cachedCheckboxKey) throw new Error("Keine Checkbox-Spalte in der Notion To-Do-Datenbank gefunden");
  return cachedCheckboxKey;
}

export const Route = createFileRoute("/api/notion/todos")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const dbId = process.env.NOTION_TODO_DB_ID;
          if (!dbId) return Response.json({ error: "DB ID missing" }, { status: 500 });
          const pages = await notionQuery(dbId);
          if (pages[0]?.properties) rememberCheckboxKey(pages[0].properties);
          const todos: Todo[] = pages.map((page: any) => {
            const p = page.properties;
            return {
              id: page.id,
              name: readTitle(p),
              date: readDate(p),
              completed: readCheckbox(p),
              kategorie: (readSelect(p, "Auswählen") as TodoKategorie) ?? null,
              kat: readSelect(p, "kat"),
              lernplanIds: readRelationIds(p, "Lernplan"),
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
          const checkboxKey = await resolveCheckboxKey(id);
          await notionUpdatePage(id, { [checkboxKey]: { checkbox: completed } });
          return Response.json({ success: true });
        } catch (e: any) {
          console.error("[todos PATCH]", e.message);
          return Response.json({ error: e.message }, { status: 500 });
        }
      },
      DELETE: async () =>
        Response.json(
          { error: "Notion-To-Dos können in der App nicht gelöscht werden." },
          { status: 403 }
        ),
    },
  },
});
