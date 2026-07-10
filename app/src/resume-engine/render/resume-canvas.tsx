"use client";

import "../registry/nodes";
import { cn } from "@/lib/utils";
import {
  RenderNode,
  setEditableWrapper,
  setListControls,
  setDiffWrapper,
  setDiffEntryWrapper,
  type RenderMode,
  type BindingScope,
} from "../registry/node-registry";
import { ResumeEditorHostProvider, EditableOverlay, resumeListControls } from "../registry/editable-overlay";
import { ResumeDiffHostProvider, DiffOverlay, DiffEntryWrapper, type ResumeDiffHostValue } from "../registry/diff-overlay";
import { googleFontsLinkHref } from "../theme/resolve-theme";
import PaginatedResume from "./paginated-resume";
import type { ResumeData } from "../types/resume-data";
import type { TemplateDocument } from "../types/template";
import type { ThemeDocument } from "../types/theme";

// Registered once, only from this client entry point — see the comment on
// setEditableWrapper for why the server-only static render path never does this.
setEditableWrapper(EditableOverlay);
setListControls(resumeListControls);
setDiffWrapper(DiffOverlay);
setDiffEntryWrapper(DiffEntryWrapper);

export type ResumeCanvasProps = {
  data: ResumeData;
  templateDoc: TemplateDocument;
  themeDoc: ThemeDocument;
  mode?: RenderMode;
  /** Called with the absolute binding path and new value when a click-to-edit save happens. Required for mode="interactive". */
  onEdit?: (absoluteBinding: string, value: unknown) => void;
  /** Pre-proposal data to diff `data` against. Required for mode="diff". */
  previousData?: ResumeData;
  /** Accept/reject state for the pending proposal's review units. Required for mode="diff". */
  diffHost?: ResumeDiffHostValue;
  className?: string;
};

export default function ResumeCanvas({
  data,
  templateDoc,
  themeDoc,
  mode = "static",
  onEdit,
  previousData,
  diffHost,
  className,
}: ResumeCanvasProps) {
  const rootScope: BindingScope = { value: data };
  const previousRootScope: BindingScope | undefined = mode === "diff" && previousData ? { value: previousData } : undefined;

  // Same Google Fonts URL the PDF path (render-static-html.ts) links, so the
  // live canvas renders with the identical font file rather than whatever
  // fallback the browser's OS happens to have installed.
  const fontsUrl = googleFontsLinkHref(themeDoc);
  const fontLinks = fontsUrl && (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={fontsUrl} />
    </>
  );

  // The interactive/diff preview paginates client-side into fixed A4 pages (see
  // paginated-resume.tsx); any other mode (e.g. the unused "static" default) renders the
  // template as a single continuous page, same as the PDF path (render-static-html.ts),
  // which must stay decoupled from PaginatedResume and its DOM-measurement machinery.
  const content =
    mode === "interactive" || mode === "diff" ? (
      <PaginatedResume templateDoc={templateDoc} data={data} previousData={previousData} theme={themeDoc} mode={mode} />
    ) : (
      <RenderNode
        node={templateDoc.root}
        scope={rootScope}
        previousScope={previousRootScope}
        resumeData={data}
        theme={themeDoc}
        mode={mode}
      />
    );

  if (mode === "diff") {
    return (
      <ResumeDiffHostProvider
        value={diffHost ?? { getUnitStatus: () => "pending", setUnitStatus: () => {} }}
      >
        <div className={cn("w-full", className)}>
          {fontLinks}
          {content}
        </div>
      </ResumeDiffHostProvider>
    );
  }

  if (mode !== "interactive") {
    return (
      <div className={cn("w-full", className)}>
        {fontLinks}
        {content}
      </div>
    );
  }

  return (
    <ResumeEditorHostProvider value={{ onEdit: onEdit ?? (() => {}) }}>
      <div className={cn("w-full", className)}>
        {fontLinks}
        {content}
      </div>
    </ResumeEditorHostProvider>
  );
}
