type NotionProperties = Record<string, { type?: string; [key: string]: unknown }>;

export function findPropertyKey(properties: NotionProperties, type: string, fallback?: string): string | null {
  const entry = Object.entries(properties).find(([, prop]) => prop?.type === type);
  if (entry) return entry[0];
  if (fallback && properties[fallback]) return fallback;
  return null;
}

export function readTitle(properties: NotionProperties, fallback = "Name"): string {
  const key = findPropertyKey(properties, "title", fallback);
  if (!key) return "Ohne Titel";
  const title = properties[key]?.title as Array<{ plain_text?: string }> | undefined;
  return title?.[0]?.plain_text ?? "Ohne Titel";
}

export function readDate(properties: NotionProperties, fallback = "Dat"): string | null {
  const key = findPropertyKey(properties, "date", fallback);
  if (!key) return null;
  const date = properties[key]?.date as { start?: string } | null | undefined;
  return date?.start ?? null;
}

export function readCheckbox(properties: NotionProperties, fallback = "Kontrollkästchen"): boolean {
  const key = findPropertyKey(properties, "checkbox", fallback);
  if (!key) return false;
  return Boolean(properties[key]?.checkbox);
}

export function readSelect(properties: NotionProperties, fallback?: string): string | null {
  const key = findPropertyKey(properties, "select", fallback);
  if (!key) return null;
  const select = properties[key]?.select as { name?: string } | null | undefined;
  return select?.name ?? null;
}

export function readRelationIds(properties: NotionProperties, fallback: string): string[] {
  const key = findPropertyKey(properties, "relation", fallback) ?? (properties[fallback] ? fallback : null);
  if (!key) return [];
  const relation = properties[key]?.relation as Array<{ id: string }> | undefined;
  return relation?.map((r) => r.id) ?? [];
}
