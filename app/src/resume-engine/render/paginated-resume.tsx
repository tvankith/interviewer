"use client";

import { useMemo, useState, type ReactNode } from "react";
import { RenderNode, type BindingScope, type RenderMode } from "../registry/node-registry";
import { pageStyle } from "../theme/resolve-theme";
import { buildPageFlowUnits, type PageFlowUnit } from "../pagination/page-flow-units";
import { toMeasuredUnits, packUnitsIntoPages } from "../pagination/pack-units";
import HiddenMeasurementPass from "./hidden-measurement-pass";
import type { TemplateDocument, ListNodeProps, SectionNodeProps, TemplateNode } from "../types/template";
import type { ThemeDocument } from "../types/theme";
import type { ResumeData } from "../types/resume-data";

export type PaginatedResumeProps = {
  templateDoc: TemplateDocument;
  data: ResumeData;
  previousData: ResumeData | undefined;
  theme: ThemeDocument;
  mode: RenderMode;
};

/** A4 height fallback (297mm @96dpi), used only if theme.page.height is missing/unparseable — guards against contentHeightPx collapsing toward 0, which would otherwise degrade pagination to one section per page. */
const A4_HEIGHT_PX_FALLBACK = 1123;
/** A4 width fallback (210mm @96dpi), used only if theme.page.width is missing/unparseable. */
const A4_WIDTH_PX_FALLBACK = 794;

function parsePx(value: string | undefined): number {
  const n = value ? parseFloat(value) : NaN;
  return Number.isFinite(n) ? n : 0;
}

/** Generic 1-4 value CSS padding/margin shorthand parser (today's theme only uses the 2-value form). */
function parsePaddingPx(padding: string): { top: number; right: number; bottom: number; left: number } {
  const parts = padding.trim().split(/\s+/).map(parsePx);
  const [top, right = top, bottom = top, left = right] = parts;
  return { top, right, bottom, left };
}

function buildSectionEntryCounts(units: PageFlowUnit[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const unit of units) {
    if (unit.kind === "repeater-entry") counts.set(unit.sectionId, (counts.get(unit.sectionId) ?? 0) + 1);
  }
  return counts;
}

/**
 * Real client-side pagination for the interactive/diff resume preview — splits
 * `templateDoc.root`'s children across fixed A4 page divs, continuing overflow content
 * onto subsequent pages instead of one continuous scroll. Only used by the live preview
 * (see resume-canvas.tsx); the PDF export path (render-static-html.ts) renders the
 * template directly via RenderNode and paginates via its own CSS `page-break-inside`
 * rules at print time — this component is never imported there.
 */
export default function PaginatedResume({ templateDoc, data, previousData, theme, mode }: PaginatedResumeProps) {
  const rootScope: BindingScope = useMemo(() => ({ value: data }), [data]);
  const previousRootScope: BindingScope | undefined = useMemo(
    () => (mode === "diff" && previousData ? { value: previousData } : undefined),
    [mode, previousData]
  );

  const units = useMemo(() => buildPageFlowUnits(templateDoc.root, data, previousData, mode), [templateDoc, data, previousData, mode]);

  // The last successfully measured+packed generation. Kept as its own {units, pages} pair
  // (rather than deriving unitsByKey/sectionEntryCounts from the always-latest `units`) so a
  // render is never a mismatched hybrid of stale page assignments against fresh unit keys —
  // until a new measurement pass lands, we keep showing the previous, internally-consistent
  // generation rather than a partially-broken one.
  const [committed, setCommitted] = useState<{ units: PageFlowUnit[]; pages: string[][] } | null>(null);

  const activeUnits = committed?.units ?? units;
  const activePages = committed?.pages ?? [units.map((u) => u.key)];
  const activeUnitsByKey = useMemo(() => new Map(activeUnits.map((u) => [u.key, u] as const)), [activeUnits]);
  const activeSectionEntryCounts = useMemo(() => buildSectionEntryCounts(activeUnits), [activeUnits]);

  const pagePadding = parsePaddingPx(theme.page.padding);
  const pageWidthPx = parsePx(theme.page.width) || A4_WIDTH_PX_FALLBACK;
  const contentWidthPx = Math.max(pageWidthPx - pagePadding.left - pagePadding.right, 0);
  const pageHeightPx = parsePx(theme.page.height) || A4_HEIGHT_PX_FALLBACK;
  const contentHeightPx = Math.max(pageHeightPx - pagePadding.top - pagePadding.bottom, 0);

  function handleMeasured(heights: Map<string, number>) {
    const measured = toMeasuredUnits(units, heights, theme);
    if (!measured) return; // partial measurement (mid-transition) — keep showing the previous generation
    setCommitted({ units, pages: packUnitsIntoPages(measured, contentHeightPx) });
  }

  return (
    <div className="w-full overflow-x-auto">
      <HiddenMeasurementPass
        units={units}
        data={data}
        previousData={previousData}
        theme={theme}
        mode={mode}
        contentWidthPx={contentWidthPx}
        onMeasured={handleMeasured}
      />
      {/* Gray canvas behind the page stack — the pages themselves are white
          (theme.page.background), so without this a multi-page resume reads as
          one continuous scroll instead of visually distinct pages. Pages are a
          fixed standard size (theme.page.width/height, A4 by default) rather
          than shrinking to fit a narrow panel; `overflow-x-auto` above lets a
          narrower panel scroll horizontally instead of squeezing the page. */}
      <div className="flex flex-col items-center gap-6 rounded-lg bg-gray-100 p-6">
        {activePages.map((pageKeys, pageIndex) => (
          <div
            key={pageIndex}
            className="resume-engine-page shrink-0 shadow-md"
            style={{
              ...pageStyle(theme),
              width: pageWidthPx,
              minHeight: pageHeightPx,
            }}
          >
            {renderPageContent(pageKeys, activeUnitsByKey, activeSectionEntryCounts, rootScope, previousRootScope, data, theme, mode)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders one page's units: consecutive `block` units render directly; a maximal
 * contiguous run of `section-head`/`repeater-entry` units sharing a `sectionId` renders
 * as one reused Section+List (if the run starts with the section's head) or List-only
 * (for a continuation run with no head, so it doesn't pick up SectionNode's own
 * `marginTop` a second time — that spacing was already spent on the page the head
 * landed on, and was never budgeted into a continuation run's measured height).
 */
function renderPageContent(
  pageKeys: string[],
  unitsByKey: Map<string, PageFlowUnit>,
  sectionEntryCounts: Map<string, number>,
  rootScope: BindingScope,
  previousRootScope: BindingScope | undefined,
  data: ResumeData,
  theme: ThemeDocument,
  mode: RenderMode
): ReactNode[] {
  const elements: ReactNode[] = [];
  let i = 0;

  while (i < pageKeys.length) {
    const unit = unitsByKey.get(pageKeys[i]);
    if (!unit) {
      i++;
      continue;
    }

    if (unit.kind === "block") {
      elements.push(
        <RenderNode key={unit.key} node={unit.node} scope={rootScope} previousScope={previousRootScope} resumeData={data} theme={theme} mode={mode} />
      );
      i++;
      continue;
    }

    const sectionId = unit.sectionId;
    const sectionNode = unit.sectionNode;
    const listNode = unit.listNode;
    const runStart = i;
    let hasHead = false;
    let minEntryIndex: number | undefined;
    let maxEntryIndex: number | undefined;

    while (i < pageKeys.length) {
      const runUnit = unitsByKey.get(pageKeys[i]);
      if (!runUnit || runUnit.kind === "block" || runUnit.sectionId !== sectionId) break;
      if (runUnit.kind === "section-head") hasHead = true;
      if (runUnit.kind === "repeater-entry") {
        minEntryIndex = minEntryIndex === undefined ? runUnit.entryIndex : Math.min(minEntryIndex, runUnit.entryIndex);
        maxEntryIndex = maxEntryIndex === undefined ? runUnit.entryIndex : Math.max(maxEntryIndex, runUnit.entryIndex);
      }
      i++;
    }

    const entryRange: [number, number] =
      minEntryIndex !== undefined && maxEntryIndex !== undefined ? [minEntryIndex, maxEntryIndex + 1] : [0, 0];
    const totalEntries = sectionEntryCounts.get(sectionId) ?? 0;
    const containsLastEntry = maxEntryIndex !== undefined && maxEntryIndex === totalEntries - 1;
    const listChunk: TemplateNode = {
      ...listNode,
      props: { ...(listNode.props as ListNodeProps), entryRange, hideAddButton: !containsLastEntry },
    };

    const chunkNode: TemplateNode = hasHead
      ? { ...sectionNode, props: { ...(sectionNode.props as SectionNodeProps) }, children: [listChunk] }
      : listChunk;

    elements.push(
      <RenderNode
        key={`${sectionId}-chunk-${runStart}`}
        node={chunkNode}
        scope={rootScope}
        previousScope={previousRootScope}
        resumeData={data}
        theme={theme}
        mode={mode}
      />
    );
  }

  return elements;
}
