/** Convert node:sqlite rows (which use a null prototype) at every nesting level. */
export function toPlainObject<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => toPlainObject(item)) as T;
  if (value && typeof value === "object") {
    const plain: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) plain[key] = toPlainObject(nested);
    return plain as T;
  }
  return value;
}
