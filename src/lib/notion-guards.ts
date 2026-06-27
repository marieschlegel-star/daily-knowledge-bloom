/** True for real Notion page IDs (UUID-style), false for local-only placeholders. */
export function isNotionPageId(id: string | null | undefined): boolean {
  if (!id) return false;
  return !id.startsWith("local-");
}
