"use client";

import "../registry/nodes";
import { cn } from "@/lib/utils";
import { RenderNode, setEditableWrapper, type RenderMode, type BindingScope } from "../registry/node-registry";
import { ResumeEditorHostProvider, EditableOverlay } from "../registry/editable-overlay";
import type { ResumeData } from "../types/resume-data";
import type { TemplateDocument } from "../types/template";
import type { ThemeDocument } from "../types/theme";

// Registered once, only from this client entry point — see the comment on
// setEditableWrapper for why the server-only static render path never does this.
setEditableWrapper(EditableOverlay);

export type ResumeCanvasProps = {
  data: ResumeData;
  templateDoc: TemplateDocument;
  themeDoc: ThemeDocument;
  mode?: RenderMode;
  /** Called with the absolute binding path and new value when a click-to-edit save happens. Required for mode="interactive". */
  onEdit?: (absoluteBinding: string, value: unknown) => void;
  className?: string;
};

export default function ResumeCanvas({
  data,
  templateDoc,
  themeDoc,
  mode = "static",
  onEdit,
  className,
}: ResumeCanvasProps) {
  const rootScope: BindingScope = { value: data };

  const content = (
    <RenderNode node={templateDoc.root} scope={rootScope} resumeData={data} theme={themeDoc} mode={mode} />
  );

  if (mode !== "interactive") {
    return <div className={cn("w-full", className)}>{content}</div>;
  }

  return (
    <ResumeEditorHostProvider value={{ onEdit: onEdit ?? (() => {}) }}>
      <div className={cn("w-full", className)}>{content}</div>
    </ResumeEditorHostProvider>
  );
}
