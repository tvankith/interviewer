"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { RenderNode, type BindingScope, type RenderMode } from "../registry/node-registry";
import { renderRepeaterDiffEntry } from "../registry/nodes/list-node";
import { resolveBinding, toAbsoluteBinding } from "../binding/resolve-binding";
import { buildRepeaterEntryScope } from "../pagination/repeater-entry-scope";
import type { PageFlowUnit } from "../pagination/page-flow-units";
import type { ThemeDocument } from "../types/theme";
import type { ResumeData } from "../types/resume-data";

export type HiddenMeasurementPassProps = {
  units: PageFlowUnit[];
  data: ResumeData;
  previousData: ResumeData | undefined;
  theme: ThemeDocument;
  /** The real render mode ("interactive" | "diff") — measurement itself renders a mode derived from this, see measureMode below. */
  mode: RenderMode;
  contentWidthPx: number;
  onMeasured: (heights: Map<string, number>) => void;
};

/**
 * Always-mounted, off-screen render of every page-flow unit, used purely to read real pixel
 * heights before deciding page breaks. Never visible, never interactive (`inert` + `visibility:
 * hidden`), and must stay decoupled from the PDF's server render path (render-static-html.ts) —
 * this file is "use client" and only ever imported from paginated-resume.tsx.
 *
 * Each unit gets its own `overflow: hidden` wrapper div so its BoundingClientRect height
 * captures margin (e.g. SectionNode's own `marginTop`), which wouldn't otherwise be part of a
 * bare element's own height since margins don't collapse through a block formatting context.
 */
export default function HiddenMeasurementPass({ units, data, previousData, theme, mode, contentWidthPx, onMeasured }: HiddenMeasurementPassProps) {
  const wrapperRefs = useRef(new Map<string, HTMLDivElement>());
  const rafScheduledRef = useRef(false);

  const rootScope: BindingScope = useMemo(() => ({ value: data }), [data]);
  const previousRootScope: BindingScope | undefined = useMemo(
    () => (mode === "diff" && previousData ? { value: previousData } : undefined),
    [mode, previousData]
  );

  // Interactive mode measures as "static" so we never mount a second live Popover/rich-text
  // editor for the same field (EditableOverlay only wraps in classnames/ring styles, so this
  // doesn't affect measured height). Diff mode measures as real "diff", since DiffOverlay/
  // DiffEntryWrapper add real flow height (old/new value blocks, accept/reject row) that
  // "static" would systematically undercount.
  const measureMode: RenderMode = mode === "interactive" ? "static" : mode;

  function scheduleMeasure() {
    if (rafScheduledRef.current) return;
    rafScheduledRef.current = true;
    requestAnimationFrame(() => {
      rafScheduledRef.current = false;
      const heights = new Map<string, number>();
      for (const [key, el] of wrapperRefs.current) {
        heights.set(key, el.getBoundingClientRect().height);
      }
      onMeasured(heights);
    });
  }

  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => scheduleMeasure());
    for (const el of wrapperRefs.current.values()) observer.observe(el);
    scheduleMeasure();
    return () => observer.disconnect();
    // Re-observe whenever the unit list itself changes identity (content/theme/width change);
    // scheduleMeasure is stable enough per-render that omitting it here is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, contentWidthPx]);

  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) scheduleMeasure();
    });
    const onLoadingDone = () => scheduleMeasure();
    document.fonts.addEventListener("loadingdone", onLoadingDone);
    return () => {
      cancelled = true;
      document.fonts.removeEventListener("loadingdone", onLoadingDone);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      aria-hidden="true"
      inert
      style={{ position: "fixed", left: -100000, top: 0, width: contentWidthPx, visibility: "hidden", pointerEvents: "none" }}
    >
      {units.map((unit) => (
        <div
          key={unit.key}
          ref={(el) => {
            if (el) wrapperRefs.current.set(unit.key, el);
            else wrapperRefs.current.delete(unit.key);
          }}
          style={{ overflow: "hidden" }}
        >
          {renderMeasurementUnit(unit, rootScope, previousRootScope, data, theme, measureMode)}
        </div>
      ))}
    </div>
  );
}

function renderMeasurementUnit(
  unit: PageFlowUnit,
  rootScope: BindingScope,
  previousRootScope: BindingScope | undefined,
  data: ResumeData,
  theme: ThemeDocument,
  measureMode: RenderMode
) {
  if (unit.kind === "block") {
    return <RenderNode node={unit.node} scope={rootScope} previousScope={previousRootScope} resumeData={data} theme={theme} mode={measureMode} />;
  }

  if (unit.kind === "section-head") {
    return (
      <RenderNode
        node={{ ...unit.sectionNode, children: [] }}
        scope={rootScope}
        previousScope={previousRootScope}
        resumeData={data}
        theme={theme}
        mode={measureMode}
      />
    );
  }

  // repeater-entry
  const listAbsoluteBinding = toAbsoluteBinding(rootScope.absolutePath, unit.listNode.binding ?? "");

  if (unit.diffEntry) {
    return renderRepeaterDiffEntry(unit.diffEntry, unit.itemTemplate, listAbsoluteBinding, true, data, theme);
  }

  const items = resolveBinding(unit.listNode.binding, rootScope.value);
  const item = Array.isArray(items) ? items[unit.entryIndex] : undefined;
  const itemScope = buildRepeaterEntryScope(listAbsoluteBinding, unit.entryIndex, item);
  return (
    <RenderNode
      node={{ ...unit.itemTemplate, id: `${unit.itemTemplate.id}-${unit.entryIndex}` }}
      scope={itemScope}
      resumeData={data}
      theme={theme}
      mode={measureMode}
    />
  );
}
