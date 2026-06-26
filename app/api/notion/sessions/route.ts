import { NextResponse } from "next/server";
import { notionQuery, notionUpdatePage, notionCreatePage, notionArchivePage } from "@/lib/notion-fetch";
import type { LernSession, Fach, LernStatus, Priority } from "@/lib/types";

export async function GET() {
  try {
    const dbId = process.env.NOTION_LERNPLAN_DB_ID;
    if (!dbId) return NextResponse.json({ error: "DB ID missing" }, { status: 500 });

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

    return NextResponse.json(sessions);
  } catch (error: any) {
    console.error("[sessions]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await notionArchivePage(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[sessions DELETE]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
    const { title, date, subject, duration } = await req.json();
    const dbId = process.env.NOTION_LERNPLAN_DB_ID;
    if (!dbId) return NextResponse.json({ error: "DB ID missing" }, { status: 500 });

    const page = await notionCreatePage(dbId, {
      Session: { title: [{ text: { content: title || "Neue Lerneinheit" } }] },
      ...(date ? { Date: { date: { start: date } } } : {}),
      ...(subject ? { Subject: { select: { name: subject } } } : {}),
      ...(duration != null ? { Duration: { number: duration } } : {}),
    });

    return NextResponse.json({ id: page.id });
  } catch (error: any) {
    console.error("[sessions POST]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, date, duration } = await req.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const props: Record<string, unknown> = {};
    if (date !== undefined) {
      props.Date = date ? { date: { start: date } } : { date: null };
    }
    if (duration !== undefined) {
      props.Duration = { number: duration };
    }
    if (Object.keys(props).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await notionUpdatePage(id, props);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[sessions PATCH]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
