"use client";

import { createContext, useContext, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { richTextToComparableText, richTextValuesDiffer } from "../diff/rich-text-diff";
import { scalarValuesDiffer } from "../diff/scalar-diff";
import { entryUnitId, scalarUnitId, type ReviewUnitId, type ReviewUnitStatus } from "../diff/review-unit";
import type { RichTextValue } from "../types/lexical";
import type { TextNodeProps } from "../types/template";
import type { DiffEntryWrapperProps, DiffWrapperProps } from "./node-registry";

export type ResumeDiffHostValue = {
  getUnitStatus: (unitId: ReviewUnitId) => ReviewUnitStatus;
  setUnitStatus: (unitId: ReviewUnitId, status: ReviewUnitStatus) => void;
};

const ResumeDiffHostContext = createContext<ResumeDiffHostValue | null>(null);

export function ResumeDiffHostProvider({ value, children }: { value: ResumeDiffHostValue; children: ReactNode }) {
  return <ResumeDiffHostContext.Provider value={value}>{children}</ResumeDiffHostContext.Provider>;
}

function scalarText(value: unknown): string {
  return value == null ? "" : String(value);
}

/** Mirrors TextNode's own "main – end" formatting (text-node.tsx) so a diff shows exactly what the field would render. */
function formatWithEnd(mainText: string, endValue: unknown, props: TextNodeProps): string {
  if (!mainText) return mainText;
  const endText = endValue != null && endValue !== "" ? scalarText(endValue) : props.emptyEndFallback;
  if (!endText) return mainText;
  return `${mainText}${props.separator ?? " – "}${endText}`;
}

function AcceptRejectControls({ unitId }: { unitId: ReviewUnitId }) {
  const host = useContext(ResumeDiffHostContext);
  const status = host?.getUnitStatus(unitId) ?? "pending";

  return (
    <span className="ml-2 inline-flex items-center gap-1 align-middle">
      <button
        type="button"
        aria-label="Accept change"
        aria-pressed={status === "accepted"}
        onClick={() => host?.setUnitStatus(unitId, status === "accepted" ? "pending" : "accepted")}
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
          status === "accepted" ? "border-green-600 bg-green-600 text-white" : "border-muted-foreground/40 text-muted-foreground hover:border-green-600 hover:text-green-600"
        )}
      >
        <Check className="h-3 w-3" />
      </button>
      <button
        type="button"
        aria-label="Reject change"
        aria-pressed={status === "rejected"}
        onClick={() => host?.setUnitStatus(unitId, status === "rejected" ? "pending" : "rejected")}
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
          status === "rejected" ? "border-red-600 bg-red-600 text-white" : "border-muted-foreground/40 text-muted-foreground hover:border-red-600 hover:text-red-600"
        )}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

/** Scalar/rich-text diff decoration: current value struck through in red immediately above the proposed value in green, per node — the DiffWrapperComponent registered via setDiffWrapper. */
export function DiffOverlay({
  node,
  absoluteBinding,
  oldValue,
  newValue,
  hasPrevious,
  isTopLevelUnit,
  hrefOldValue,
  hrefNewValue,
  bindingEndOldValue,
  bindingEndNewValue,
  children,
}: DiffWrapperProps) {
  const isRichText = node.type === "RichText";
  const textProps = (node.props as TextNodeProps) || {};

  const oldMain = isRichText ? richTextToComparableText(oldValue as RichTextValue) : scalarText(oldValue);
  const newMain = isRichText ? richTextToComparableText(newValue as RichTextValue) : scalarText(newValue);

  const oldDisplay = isRichText ? oldMain : formatWithEnd(oldMain, bindingEndOldValue, textProps);
  const newDisplay = isRichText ? newMain : formatWithEnd(newMain, bindingEndNewValue, textProps);

  const mainDiffers = isRichText ? richTextValuesDiffer(oldValue as RichTextValue, newValue as RichTextValue) : scalarValuesDiffer(oldValue, newValue);
  const endDiffers = bindingEndOldValue !== undefined || bindingEndNewValue !== undefined ? scalarValuesDiffer(bindingEndOldValue, bindingEndNewValue) : false;
  const hrefDiffers = hrefOldValue !== undefined || hrefNewValue !== undefined ? scalarValuesDiffer(hrefOldValue, hrefNewValue) : false;

  if (!hasPrevious || (!mainDiffers && !endDiffers)) {
    return <>{children}</>;
  }

  return (
    <div className="my-0.5 inline-block rounded-sm" data-node-id={node.id} data-binding={absoluteBinding}>
      <div className="whitespace-pre-wrap text-red-600 line-through decoration-red-600/70">{oldDisplay || "(empty)"}</div>
      <div className="whitespace-pre-wrap text-green-700">
        {newDisplay || "(empty)"}
        {isTopLevelUnit && <AcceptRejectControls unitId={scalarUnitId(absoluteBinding)} />}
      </div>
      {hrefDiffers && (
        <div className="mt-0.5 text-xs">
          <span className="text-red-600 line-through">{scalarText(hrefOldValue) || "(empty)"}</span>
          {" → "}
          <span className="text-green-700">{scalarText(hrefNewValue) || "(empty)"}</span>
        </div>
      )}
    </div>
  );
}

/** One repeater entry's diff decoration + accept/reject control — the DiffEntryWrapperComponent injected via setDiffEntryWrapper. */
export function DiffEntryWrapper({ listAbsoluteBinding, index, kind, children }: DiffEntryWrapperProps) {
  const unitId = entryUnitId(listAbsoluteBinding, index);

  return (
    <div
      className={cn(
        "group relative rounded-sm border-l-2 pl-2",
        kind === "added" && "border-green-500 bg-green-50/40",
        kind === "removed" && "border-red-500 bg-red-50/40",
        kind === "modified" && "border-amber-400"
      )}
      data-diff-entry={kind}
      data-binding={unitId}
    >
      {children}
      <div className="mt-1">
        <AcceptRejectControls unitId={unitId} />
      </div>
    </div>
  );
}
