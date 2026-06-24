// Native fetch wrapper for Notion API – compatible with Node.js v24

const BASE = "https://api.notion.com/v1";

function headers() {
  return {
    "Authorization": `Bearer ${process.env.NOTION_API_KEY}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };
}

export async function notionQuery(databaseId: string, body: object = {}): Promise<any[]> {
  const results: any[] = [];
  let cursor: string | undefined;

  do {
    const payload: any = { page_size: 100, ...body };
    if (cursor) payload.start_cursor = cursor;

    const res = await fetch(`${BASE}/databases/${databaseId}/query`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Notion API ${res.status}: ${err}`);
    }

    const data = await res.json();
    results.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return results;
}

export async function notionUpdatePage(pageId: string, properties: object): Promise<void> {
  const res = await fetch(`${BASE}/pages/${pageId}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ properties }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion API ${res.status}: ${err}`);
  }
}
