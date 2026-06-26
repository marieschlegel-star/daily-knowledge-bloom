import { createFileRoute } from "@tanstack/react-router";
import { GATEWAY } from "@/lib/notion-fetch.server";

export const Route = createFileRoute("/api/notion/health")({
  server: {
    handlers: {
      GET: async () => {
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

        let klausurenCheck: any = { ok: false, status: null, count: null, latencyMs: null, error: null };

        if (!envCheck.ok) {
          klausurenCheck.error = "Missing required environment variables";
        } else {
          const start = Date.now();
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
            const latencyMs = Date.now() - start;
            if (!res.ok) {
              klausurenCheck = { ok: false, status: res.status, count: null, latencyMs, error: `Notion API ${res.status}: ${await res.text()}` };
            } else {
              const data = await res.json();
              klausurenCheck = { ok: true, status: res.status, count: data?.results?.length ?? null, latencyMs, error: null };
            }
          } catch (e: any) {
            klausurenCheck = { ok: false, status: null, count: null, latencyMs: Date.now() - start, error: e.message };
          }
        }

        const overallOk = envCheck.ok && klausurenCheck.ok;
        return Response.json({ ok: overallOk, timestamp, checks: { env: envCheck, klausuren: klausurenCheck } }, { status: overallOk ? 200 : 503 });
      },
    },
  },
});
