"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReviewUnitId, ReviewUnitStatus } from "./review-unit";
import type { ResumeDiffHostValue } from "../registry/diff-overlay";

/**
 * One proposal's in-progress review state: a sparse map of unit id ->
 * decision, defaulting to "pending" for any unit not yet touched (see
 * design.md: unresolved units are reconciled as rejected, i.e. kept at
 * their current value). Scoped to a single proposal — call `reset()` (or
 * remount with a new `key`) when switching to a different proposal.
 */
export function useProposalReview() {
  const [decisions, setDecisions] = useState<Record<ReviewUnitId, ReviewUnitStatus>>({});

  const getUnitStatus = useCallback((unitId: ReviewUnitId): ReviewUnitStatus => decisions[unitId] ?? "pending", [decisions]);

  const setUnitStatus = useCallback((unitId: ReviewUnitId, status: ReviewUnitStatus) => {
    setDecisions((prev) => ({ ...prev, [unitId]: status }));
  }, []);

  const reset = useCallback(() => setDecisions({}), []);

  const diffHost: ResumeDiffHostValue = useMemo(() => ({ getUnitStatus, setUnitStatus }), [getUnitStatus, setUnitStatus]);

  return { decisions, getUnitStatus, setUnitStatus, reset, diffHost };
}
