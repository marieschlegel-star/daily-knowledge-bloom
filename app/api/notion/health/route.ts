import { NextResponse } from "next/server";
import { GATEWAY } from "@/lib/notion-fetch";

export async function GET() {
  const timestamp = new Date().toISOString();
  const lovableKey = process.env.LOVABLE_API_KEY;
  const notionKey = process.env.NOTION_API_KEY;
  const klausurenDbId = process.env.NOTION_KLAUSUREN_DB_ID;

  const envCheck = {
    ok: Boolean(lovableKey && notionKey && klausurenDbId),
    lovableApiKey: Boolean(lovableKey),
    notionApiKey: Boolean(notionKey),
    klausurenDbId: Boolean(klausurenDbId),
  };

  let klausurenCheck: {
    ok: boolean;
    status: number | null;
    count: number | null;
    latencyMs: number | null;
    error: string | null;
  } = {
    ok: false,
    status: null,
    count: null,
    latencyMs: null,
    error: null,
  };

  if (!envCheck.ok) {
    klausurenCheck.error = "Missing required environment variables";
  } else {
    const start = performance.now();
    try {
      const res = await fetch(`${GATEWAY}/databases/${klausurenDbId}/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": notionKey!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ page_size: 1 }),
      });
      const latencyMs = Math.round(performance.now() - start);

      if (!res.ok) {
        const body = await res.text();
        klausurenCheck = {
          ok: false,
          status: res.status,
          count: null,
          latencyMs,
          error: `Notion API returned ${res.status}: ${body}`,
        };
      } else {
        const data = await res.json();
        klausurenCheck = {
          ok: true,
          status: res.status,
          count: typeof data?.results?.length === "number" ? data.results.length : null,
          latencyMs,
          error: null,
        };
      }
    } catch (error: any) {
      klausurenCheck = {
        ok: false,
        status: null,
        count: null,
        latencyMs: Math.round(performance.now() - start),
        error: error.message || "Unknown error",
      };
    }
  }

  const overallOk = envCheck.ok && klausurenCheck.ok;

  const body = {
    ok: overallOk,
    timestamp,
    checks: {
      env: envCheck,
      klausuren: klausurenCheck,
    },
  };

  return NextResponse.json(body, { status: overallOk ? 200 : 503 });
}
