/**
 * A review unit is either a top-level scalar field ("location") or a single
 * list entry ("experiences.2") — the granularity a candidate accepts/rejects
 * at (see design.md: whole-entry, not sub-field, granularity). Shared between
 * the canvas (which renders units) and the reconciliation logic (which
 * resolves them into a final PATCH body), so both sides key decisions the
 * same way.
 */
export type ReviewUnitId = string;

export type ReviewUnitStatus = "pending" | "accepted" | "rejected";

export function scalarUnitId(field: string): ReviewUnitId {
  return field;
}

export function entryUnitId(field: string, index: number): ReviewUnitId {
  return `${field}.${index}`;
}

/** Splits an entry unit id back into its list field and index; returns no `index` for a scalar unit id. */
export function parseUnitId(unitId: ReviewUnitId): { field: string; index?: number } {
  const separatorIndex = unitId.lastIndexOf(".");
  if (separatorIndex === -1) return { field: unitId };

  const suffix = unitId.slice(separatorIndex + 1);
  if (!/^\d+$/.test(suffix)) return { field: unitId };

  return { field: unitId.slice(0, separatorIndex), index: Number(suffix) };
}
