// Server-only Notion gateway helpers. Imported by server route handlers only.
export const GATEWAY = "https://connector-gateway.lovable.dev/notion/v1";

function headers() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const notionKey = process.env.NOTION_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  if (!notionKey) throw new Error("NOTION_API_KEY is not configured");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": notionKey,
    "Content-Type": "application/json",
  };
}

export async function notionQuery(databaseId: string, body: object = {}): Promise<any[]> {
  const results: any[] = [];
  let cursor: string | undefined;
  do {
    const payload: any = { page_size: 100, ...body };
    if (cursor) payload.start_cursor = cursor;
    const res = await fetch(`${GATEWAY}/databases/${databaseId}/query`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Notion API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    results.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return results;
}

export async function notionCreatePage(databaseId: string, properties: object): Promise<any> {
  const res = await fetch(`${GATEWAY}/pages`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
  });
  if (!res.ok) throw new Error(`Notion API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function notionGetPage(pageId: string): Promise<any> {
  const res = await fetch(`${GATEWAY}/pages/${pageId}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Notion API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function notionUpdatePage(pageId: string, properties: object): Promise<void> {
  const res = await fetch(`${GATEWAY}/pages/${pageId}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ properties }),
  });
  if (!res.ok) throw new Error(`Notion API ${res.status}: ${await res.text()}`);
}

export async function notionArchivePage(pageId: string): Promise<void> {
  const res = await fetch(`${GATEWAY}/pages/${pageId}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ archived: true }),
  });
  if (!res.ok) throw new Error(`Notion API ${res.status}: ${await res.text()}`);
}

export function gatewayHeaders() {
  return headers();
}
