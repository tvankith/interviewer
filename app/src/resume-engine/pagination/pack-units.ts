import type { ListNodeProps } from "../types/template";
import type { ThemeDocument } from "../types/theme";
import type { PageFlowUnit } from "./page-flow-units";

export type MeasuredUnit = {
  key: string;
  kind: PageFlowUnit["kind"];
  heightPx: number;
  sectionId?: string;
  /** Spacing owed before this unit if it isn't first on its page — 0 unless it's a repeater entry directly following another entry of the same section (see packUnitsIntoPages). */
  gapBeforePx: number;
};

function parsePx(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Pairs each unit with its measured height (and inter-entry gap). Returns null if any
 * unit's height hasn't been measured yet — the caller should keep the previous page
 * assignment rather than repack against partial data.
 *
 * Inter-unit spacing note: a Section's own `marginTop` and a section title's own
 * `marginBottom` are captured inside that unit's own measured box (BFC-wrapped in the
 * hidden measurement pass), so they need no extra accounting here. The one spacing that
 * can't be captured by measuring a single unit in isolation is ListNode's flex `gap`
 * between repeater entries — that's added explicitly below, and only between two
 * `repeater-entry` units of the same section (never between a section-head and its first
 * entry, which has no gap in the real render — see SectionNode/ListNode).
 */
export function toMeasuredUnits(units: PageFlowUnit[], heights: Map<string, number>, theme: ThemeDocument): MeasuredUnit[] | null {
  const result: MeasuredUnit[] = [];
  let prevUnit: PageFlowUnit | undefined;

  for (const unit of units) {
    const heightPx = heights.get(unit.key);
    if (heightPx === undefined) return null;

    const sectionId = unit.kind === "block" ? undefined : unit.sectionId;

    let gapBeforePx = 0;
    if (unit.kind === "repeater-entry" && prevUnit?.kind === "repeater-entry" && prevUnit.sectionId === unit.sectionId) {
      const gapToken = (unit.listNode.props as ListNodeProps | undefined)?.gap ?? "sm";
      gapBeforePx = parsePx(theme.spacing[gapToken]);
    }

    result.push({ key: unit.key, kind: unit.kind, heightPx, sectionId, gapBeforePx });
    prevUnit = unit;
  }

  return result;
}

/**
 * Greedy first-fit single pass: places units on the current page while they fit within
 * `contentHeightPx`, starting a new page when one doesn't.
 *
 * Orphan-head rule: a `section-head` unit that's the last thing fitting on a page is
 * pushed to the next page instead if its immediately-following same-section unit
 * wouldn't also fit there — so a section title is never left alone at the bottom of a
 * page with nothing beneath it.
 *
 * Degenerate case: a single unit taller than one page's own content height is placed
 * alone on its own page (with a dev warning) rather than dropped or infinitely retried.
 */
export function packUnitsIntoPages(units: MeasuredUnit[], contentHeightPx: number): string[][] {
  const pages: string[][] = [];
  let currentPage: string[] = [];
  let runningHeight = 0;

  const startNewPage = () => {
    if (currentPage.length > 0) pages.push(currentPage);
    currentPage = [];
    runningHeight = 0;
  };

  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    let isFirstOnPage = currentPage.length === 0;
    let addedHeight = (isFirstOnPage ? 0 : unit.gapBeforePx) + unit.heightPx;

    if (!isFirstOnPage && runningHeight + addedHeight > contentHeightPx) {
      startNewPage();
      isFirstOnPage = true;
      addedHeight = unit.heightPx;
    }

    if (unit.kind === "section-head" && !isFirstOnPage) {
      const next = units[i + 1];
      if (next && next.sectionId === unit.sectionId) {
        const nextAdded = next.gapBeforePx + next.heightPx;
        if (runningHeight + addedHeight + nextAdded > contentHeightPx) {
          startNewPage();
          isFirstOnPage = true;
          addedHeight = unit.heightPx;
        }
      }
    }

    if (isFirstOnPage && unit.heightPx > contentHeightPx && process.env.NODE_ENV !== "production") {
      console.warn(
        `[resume-engine] pagination: unit "${unit.key}" (${unit.heightPx}px) exceeds page content height (${contentHeightPx}px); placing on its own page.`
      );
    }

    runningHeight += addedHeight;
    currentPage.push(unit.key);
  }

  if (currentPage.length > 0) pages.push(currentPage);
  return pages;
}
