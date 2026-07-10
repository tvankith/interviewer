/** Normalizes null/undefined/empty-string to the same "empty" value so a proposal that clears a field isn't treated as unchanged relative to it merely being absent. */
function normalizeScalar(value: unknown): string {
  return value == null ? "" : String(value);
}

/** Whether a Text-bound scalar field's proposed value differs from its current value. */
export function scalarValuesDiffer(oldValue: unknown, newValue: unknown): boolean {
  return normalizeScalar(oldValue) !== normalizeScalar(newValue);
}
