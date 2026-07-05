"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import ChipInput from "@/components/basic/chip-input";
import RichTextEditor from "@/components/basic/rich-text-editor";
import { isLexicalDoc } from "../types/lexical";
import type { TemplateNode } from "../types/template";

export type ResumeEditorHostValue = {
  onEdit: (absoluteBinding: string, value: unknown) => void;
};

const ResumeEditorHostContext = createContext<ResumeEditorHostValue | null>(null);

export function ResumeEditorHostProvider({
  value,
  children,
}: {
  value: ResumeEditorHostValue;
  children: ReactNode;
}) {
  return <ResumeEditorHostContext.Provider value={value}>{children}</ResumeEditorHostContext.Provider>;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function EditorField({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (isLexicalDoc(value) || value == null) {
    return <RichTextEditor format="lexical" value={isLexicalDoc(value) ? value : undefined} onChange={onChange} />;
  }
  if (isStringArray(value)) {
    return <ChipInput value={value} onChange={onChange} />;
  }
  return (
    <Input
      autoFocus
      defaultValue={typeof value === "string" ? value : String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

/**
 * Wraps a rendered node so clicking it opens a click-to-edit popover with the
 * right input for its value's shape. Uses a div with role="button" rather
 * than a real <button> because the wrapped content is flow content
 * (headings, paragraphs, lists), which a <button>'s phrasing-content model
 * doesn't permit.
 */
export function EditableOverlay({
  node,
  value,
  absoluteBinding,
  children,
}: {
  node: TemplateNode;
  value: unknown;
  absoluteBinding: string;
  children: ReactNode;
}) {
  const host = useContext(ResumeEditorHostContext);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<unknown>(value);

  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(value);
    setOpen(next);
  };

  const handleSave = () => {
    host?.onEdit(absoluteBinding, draft);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          data-node-id={node.id}
          data-binding={absoluteBinding}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleOpenChange(true);
            }
          }}
          className={cn(
            "cursor-pointer rounded-sm outline-none transition-shadow",
            "hover:ring-2 hover:ring-blue-400/60",
            "focus-visible:ring-2 focus-visible:ring-blue-500",
            open && "ring-2 ring-blue-500"
          )}
        >
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80" onOpenAutoFocus={(event) => event.preventDefault()}>
        <EditorField value={draft} onChange={setDraft} />
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded px-3 py-1 text-xs font-medium hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            Save
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
