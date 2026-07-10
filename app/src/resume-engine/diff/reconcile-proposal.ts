import { correspondPositionally } from "./list-correspondence";
import { entryUnitId, scalarUnitId, type ReviewUnitId, type ReviewUnitStatus } from "./review-unit";

export type ReconciledProposal = {
  /** Only the fields that actually change — the exact body for the single PATCH. */
  patch: Record<string, unknown>;
  /** Every unit the proposal touched and its final status (pending is reconciled as rejected) — for the grouped outcome message. */
  outcome: Array<{ unit: ReviewUnitId; status: "accepted" | "rejected" }>;
};

function isListField(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Walks every field a proposal touched and resolves it against the
 * candidate's per-unit decisions: an accepted scalar field takes its
 * proposed value, a rejected/pending one is omitted (the PATCH endpoint is
 * partial-update, so omission means "leave untouched"). A list field with at
 * least one accepted entry-unit is reconstructed wholesale from the same
 * positional correspondence used to render it, and included only if
 * something in it was actually accepted.
 */
export function reconcileProposal(
  proposedFields: Record<string, unknown>,
  currentValues: Record<string, unknown>,
  decisions: Record<ReviewUnitId, ReviewUnitStatus>
): ReconciledProposal {
  const patch: Record<string, unknown> = {};
  const outcome: ReconciledProposal["outcome"] = [];

  const statusOf = (unitId: ReviewUnitId): "accepted" | "rejected" => (decisions[unitId] === "accepted" ? "accepted" : "rejected");

  for (const [field, proposedValue] of Object.entries(proposedFields)) {
    const currentValue = currentValues[field];

    if (isListField(proposedValue) || isListField(currentValue)) {
      const correspondence = correspondPositionally(
        isListField(currentValue) ? currentValue : undefined,
        isListField(proposedValue) ? proposedValue : undefined
      );

      let anyAccepted = false;
      const reconciledArray: unknown[] = [];

      for (const entry of correspondence) {
        if (entry.kind === "unchanged") {
          reconciledArray.push(entry.newItem);
          continue;
        }

        const unitId = entryUnitId(field, entry.index);
        const status = statusOf(unitId);
        outcome.push({ unit: unitId, status });

        if (entry.kind === "added") {
          if (status === "accepted") {
            anyAccepted = true;
            reconciledArray.push(entry.newItem);
          }
          continue; // rejected addition contributes nothing
        }

        if (entry.kind === "removed") {
          if (status === "accepted") {
            anyAccepted = true; // accepted removal contributes nothing
          } else {
            reconciledArray.push(entry.oldItem);
          }
          continue;
        }

        // modified
        if (status === "accepted") {
          anyAccepted = true;
          reconciledArray.push(entry.newItem);
        } else {
          reconciledArray.push(entry.oldItem);
        }
      }

      if (anyAccepted) {
        patch[field] = reconciledArray;
      }
      continue;
    }

    const unitId = scalarUnitId(field);
    const status = statusOf(unitId);
    outcome.push({ unit: unitId, status });
    if (status === "accepted") {
      patch[field] = proposedValue;
    }
  }

  return { patch, outcome };
}
