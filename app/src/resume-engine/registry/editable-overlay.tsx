"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import ChipInput from "@/components/basic/chip-input";
import RichTextEditor from "@/components/basic/rich-text-editor";
import { normalizeRichText } from "../lexical-json/normalize-rich-text";
import type { RichTextValue } from "../types/lexical";
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

const EDITABLE_TRIGGER_CLASSNAME = cn(
  "cursor-pointer rounded-sm outline-none transition-shadow",
  "hover:ring-2 hover:ring-blue-400/60",
  "focus-visible:ring-2 focus-visible:ring-blue-500"
);

/**
 * Rich text is edited in place: clicking the rendered content swaps it for
 * the real Lexical editor at the same spot, with a floating toolbar
 * overlaying it (rather than a popup) so the surrounding layout doesn't
 * jump. Clicking outside the editor commits the draft.
 */
function InlineRichTextEditable({
  node,
  value,
  absoluteBinding,
  children,
}: {
  node: TemplateNode;
  value: RichTextValue;
  absoluteBinding: string;
  children: ReactNode;
}) {
  const host = useContext(ResumeEditorHostContext);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RichTextValue>(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const startEditing = () => {
    // Legacy pre-Lexical data (plain/HTML strings) is coerced to a Lexical
    // doc here so editing it doesn't silently discard it on commit.
    setDraft(normalizeRichText(value));
    setEditing(true);
  };

  const commit = () => {
    host?.onEdit(absoluteBinding, draftRef.current);
    setEditing(false);
  };

  const cancel = () => setEditing(false);

  useEffect(() => {
    if (!editing) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        commit();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (!editing) {
    return (
      <div
        role="button"
        tabIndex={0}
        data-node-id={node.id}
        data-binding={absoluteBinding}
        onClick={startEditing}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            startEditing();
          }
        }}
        className={EDITABLE_TRIGGER_CLASSNAME}
      >
        {children}
      </div>
    );
  }

  return (
    <div ref={containerRef} data-node-id={node.id} data-binding={absoluteBinding} className="relative rounded-sm ring-2 ring-blue-500">
      <RichTextEditor
        format="lexical"
        value={draft ?? undefined}
        onChange={setDraft}
        bordered={false}
        toolbarVariant="floating"
        autoFocus
        minHeight="auto"
        toolbarTrailing={
          <>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={cancel}
              className="rounded px-2 py-1 text-xs font-medium hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={commit}
              className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              Done
            </button>
          </>
        }
      />
    </div>
  );
}

function PopoverEditable({
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
          className={cn(EDITABLE_TRIGGER_CLASSNAME, open && "ring-2 ring-blue-500")}
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

/**
 * Wraps a rendered node so clicking it makes it editable with the right
 * input for its value's shape. Uses a div with role="button" rather than a
 * real <button> because the wrapped content is flow content (headings,
 * paragraphs, lists), which a <button>'s phrasing-content model doesn't
 * permit.
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
  if (node.type === "RichText") {
    return (
      <InlineRichTextEditable node={node} value={value as RichTextValue} absoluteBinding={absoluteBinding}>
        {children}
      </InlineRichTextEditable>
    );
  }

  return (
    <PopoverEditable node={node} value={value} absoluteBinding={absoluteBinding}>
      {children}
    </PopoverEditable>
  );
}
