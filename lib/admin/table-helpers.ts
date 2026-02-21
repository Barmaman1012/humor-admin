export type RowData = Record<string, unknown>;
export type AdminColumnType =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "json"
  | "image"
  | "url"
  | "long-text";

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

export function formatColumnLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

export function guessColumnType(key: string): AdminColumnType {
  const normalized = key.toLowerCase();
  if (
    normalized === "url" ||
    normalized.endsWith("_url") ||
    normalized.includes("cdn_url") ||
    normalized.includes("uri")
  ) {
    if (normalized.includes("image") || normalized === "url") {
      return "image";
    }
    return "url";
  }
  if (
    normalized.includes("created") ||
    normalized.endsWith("_at") ||
    normalized.includes("date")
  ) {
    return "date";
  }
  if (
    normalized.includes("caption") ||
    normalized.includes("text") ||
    normalized.includes("prompt") ||
    normalized.includes("body") ||
    normalized.includes("content")
  ) {
    return "long-text";
  }
  if (normalized.includes("count") || normalized.includes("total")) {
    return "number";
  }
  if (
    normalized.startsWith("is_") ||
    normalized.startsWith("has_") ||
    normalized.endsWith("_flag")
  ) {
    return "boolean";
  }
  return "text";
}

export function guessFormFieldType(
  key: string,
  columnType?: AdminColumnType
): "text" | "number" | "boolean" | "json" | "textarea" | "url" {
  const type = columnType ?? guessColumnType(key);
  if (type === "long-text") return "textarea";
  if (type === "image" || type === "url") return "url";
  if (type === "number") return "number";
  if (type === "boolean") return "boolean";
  if (type === "json") return "json";
  return "text";
}

export function isEditableColumn(key: string): boolean {
  const normalized = key.toLowerCase();
  return ![
    "id",
    "created_at",
    "updated_at",
    "created_on",
    "updated_on",
  ].includes(normalized);
}
