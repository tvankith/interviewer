"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import ChipInput from "@/components/basic/chip-input";
import RichTextEditor from "@/components/basic/rich-text-editor";
import { normalizeRichText } from "../lexical-json/normalize-rich-text";
import { lexicalDocHasText } from "../lexical-json/lexical-json-to-react";
import { isLexicalDoc } from "../types/lexical";
import type { RichTextValue } from "../types/lexical";
import type { TemplateNode } from "../types/template";
import type {
  ListControls,
  RepeaterItemWrapperProps,
  AddItemButtonProps,
  RemovableChipProps,
} from "./node-registry";

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

const REMOVE_BUTTON_CLASSNAME = cn(
  "absolute z-10 hidden items-center justify-center rounded-full border bg-background",
  "text-muted-foreground shadow-sm transition-colors",
  "hover:border-destructive hover:text-destructive",
  "group-hover:flex"
);

/** The value a field is reset to when its hover "remove" control is used. */
function computeEmptyValue(node: TemplateNode): unknown {
  if (node.type === "RichText") return null;
  if (node.type === "List") return [];
  return "";
}

/** Only show a remove control when there's actually something to clear. */
function hasRemovableValue(node: TemplateNode, value: unknown): boolean {
  if (node.type === "RichText") {
    if (isLexicalDoc(value)) return lexicalDocHasText(value);
    return typeof value === "string" && value.trim().length > 0;
  }
  if (node.type === "List") return Array.isArray(value) && value.length > 0;
  return value != null && value !== "";
}

/** Shared "x" control for clearing a single editable field's value on hover. */
function RemoveFieldButton({ onRemove }: { onRemove: () => void }) {
  return (
    <button
      type="button"
      aria-label="Remove"
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      className={cn(REMOVE_BUTTON_CLASSNAME, "-right-2 -top-2 h-5 w-5")}
    >
      <X className="h-3 w-3" />
    </button>
  );
}

/** Hover control on a single repeater entry (e.g. one experience) that removes it from its array. */
function RepeaterItemWrapper({ listAbsoluteBinding, items, index, children }: RepeaterItemWrapperProps) {
  const host = useContext(ResumeEditorHostContext);
  return (
    <div className="group relative rounded-sm">
      {children}
      <RemoveFieldButton
        onRemove={() => host?.onEdit(listAbsoluteBinding, items.filter((_, i) => i !== index))}
      />
    </div>
  );
}

/** Notion-style "+ Add <thing>" control appended after a repeater list's entries. */
function AddItemButton({ listAbsoluteBinding, items, blankItem, label }: AddItemButtonProps) {
  const host = useContext(ResumeEditorHostContext);
  return (
    <button
      type="button"
      onClick={() => host?.onEdit(listAbsoluteBinding, [...items, blankItem])}
      className="flex w-fit items-center gap-1.5 rounded-sm px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Plus className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

/** Hover control on a single chip (e.g. one skill) that removes it from its array. */
function RemovableChip({ listAbsoluteBinding, items, index, children }: RemovableChipProps) {
  const host = useContext(ResumeEditorHostContext);
  return (
    <span className="group relative inline-flex">
      {children}
      <button
        type="button"
        aria-label="Remove"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          host?.onEdit(listAbsoluteBinding, items.filter((_, i) => i !== index));
        }}
        className={cn(REMOVE_BUTTON_CLASSNAME, "-right-1.5 -top-1.5 h-3.5 w-3.5")}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

/** Registered with node-registry.tsx from the client entry point (resume-canvas.tsx). */
export const resumeListControls: ListControls = {
  RepeaterItemWrapper,
  AddItemButton,
  RemovableChip,
};

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
    const showRemove = Boolean(node.editable?.removable) && hasRemovableValue(node, value);
    return (
      <div className="group relative">
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
        {showRemove && (
          <RemoveFieldButton onRemove={() => host?.onEdit(absoluteBinding, computeEmptyValue(node))} />
        )}
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
  hrefValue,
  hrefAbsoluteBinding,
  children,
}: {
  node: TemplateNode;
  value: unknown;
  absoluteBinding: string;
  hrefValue?: unknown;
  hrefAbsoluteBinding?: string;
  children: ReactNode;
}) {
  const host = useContext(ResumeEditorHostContext);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<unknown>(value);
  const [hrefDraft, setHrefDraft] = useState<unknown>(hrefValue);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDraft(value);
      setHrefDraft(hrefValue);
    }
    setOpen(next);
  };

  const handleSave = () => {
    host?.onEdit(absoluteBinding, draft);
    if (hrefAbsoluteBinding) host?.onEdit(hrefAbsoluteBinding, hrefDraft);
    setOpen(false);
  };

  const showRemove = Boolean(node.editable?.removable) && hasRemovableValue(node, value);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <div className="group relative">
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
        {showRemove && (
          <RemoveFieldButton onRemove={() => host?.onEdit(absoluteBinding, computeEmptyValue(node))} />
        )}
      </div>
      <PopoverContent className="w-80" onOpenAutoFocus={(event) => event.preventDefault()}>
        {hrefAbsoluteBinding ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Label</label>
              <EditorField value={draft} onChange={setDraft} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">URL</label>
              <EditorField value={hrefDraft} onChange={setHrefDraft} />
            </div>
          </div>
        ) : (
          <EditorField value={draft} onChange={setDraft} />
        )}
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
  hrefValue,
  hrefAbsoluteBinding,
  children,
}: {
  node: TemplateNode;
  value: unknown;
  absoluteBinding: string;
  hrefValue?: unknown;
  hrefAbsoluteBinding?: string;
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
    <PopoverEditable
      node={node}
      value={value}
      absoluteBinding={absoluteBinding}
      hrefValue={hrefValue}
      hrefAbsoluteBinding={hrefAbsoluteBinding}
    >
      {children}
    </PopoverEditable>
  );
}
