export type RowData = Record<string, unknown>;

export function pickFirstKey(
  row: RowData | null | undefined,
  candidates: string[]
): string | null {
  if (!row) return null;
  for (const key of candidates) {
    if (key in row) return key;
  }
  return null;
}

export function getAllKeys(rows: RowData[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      set.add(key);
    }
  }
  return Array.from(set);
}

export function buildColumnOrder(
  rows: RowData[],
  preferred: string[]
): string[] {
  const all = getAllKeys(rows);
  const remaining = all.filter((key) => !preferred.includes(key)).sort();
  const ordered = preferred.filter((key) => all.includes(key));
  return [...ordered, ...remaining];
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value);
}

export function formatDateValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return formatValue(value);
  return date.toLocaleString();
}

export function truncateText(value: string, max = 160): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}
