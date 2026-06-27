import { createFileRoute } from "@tanstack/react-router";
import { notionQuery } from "@/lib/notion-fetch.server";
import type { Klausur, Fach, KlausurStatus } from "@/lib/types";

export const Route = createFileRoute("/api/notion/klausuren")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const dbId = process.env.NOTION_KLAUSUREN_DB_ID;
          if (!dbId) return Response.json({ error: "DB ID missing" }, { status: 500 });
          const pages = await notionQuery(dbId);
          const klausuren: Klausur[] = pages.map((page: any) => {
            const p = page.properties;
            return {
              id: page.id,
              title: p.Klausur?.title?.[0]?.plain_text ?? "Ohne Titel",
              fach: (p.Fach?.select?.name as Fach) ?? "ZPO",
              ort: p["Wo?"]?.select?.name ?? "",
              status: (p.Status?.status?.name as KlausurStatus) ?? "offen",
              ausgabeDatum: p.Ausgabe?.date?.start ?? null,
              schreibDatum: p.Schreiben?.date?.start ?? null,
              abgabeDatum: p.Abgabedatum?.date?.start ?? null,
              nachbesprechung: p.Nachbesprechung?.date?.start ?? null,
              nachbearbeiten: p.Nachbearbeiten?.date?.start ?? null,
              note: p.Note?.rich_text?.[0]?.plain_text ?? "",
              problemuebersicht: p.Problemübersicht?.rich_text?.[0]?.plain_text ?? "",
              lernplanIds: p.Lernplan?.relation?.map((r: any) => r.id) ?? [],
            };
          });
          return Response.json(klausuren);
        } catch (e: any) {
          console.error("[klausuren]", e.message);
          return Response.json({ error: e.message }, { status: 500 });
        }
      },
    },
  },
});
