/** Stable JSON equality for persisted fields, independent of object key order. */
export function canonical(value: unknown): string {
  if (value === undefined || value === null) return "null";
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") return `{${Object.keys(value).filter(key => (value as Record<string, unknown>)[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
export function matchesBase(record: object, base?: Record<string, unknown>) {
  return !base || Object.entries(base).every(([key, value]) => canonical((record as Record<string, unknown>)[key]) === canonical(value));
}
