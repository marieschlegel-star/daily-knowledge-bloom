import { NextResponse } from "next/server";
import { notionQuery } from "@/lib/notion-fetch";
import type { Klausur, Fach, KlausurStatus } from "@/lib/types";

export async function GET() {
  try {
    const dbId = process.env.NOTION_KLAUSUREN_DB_ID;
    if (!dbId) return NextResponse.json({ error: "DB ID missing" }, { status: 500 });

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

    return NextResponse.json(klausuren);
  } catch (error: any) {
    console.error("[klausuren]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
