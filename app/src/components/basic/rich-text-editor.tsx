"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

import { HeadingNode, QuoteNode } from "@lexical/rich-text";

import {
  ListNode,
  ListItemNode,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";

import {
  FORMAT_TEXT_COMMAND,
  $getRoot,
  $createParagraphNode,
  EditorState,
  $insertNodes,
} from "lexical";
import type { SerializedEditorState } from "lexical";

import {
  $generateHtmlFromNodes,
  $generateNodesFromDOM,
} from "@lexical/html";

type SharedProps = {
  placeholder?: string;
  className?: string;
  /** Renders the outer bordered/background box. Set false to blend into surrounding content (e.g. inline editing). Default true. */
  bordered?: boolean;
  /** "static" renders the toolbar inline above the content, pushing it down. "floating" overlays the toolbar above the content without affecting layout. Default "static". */
  toolbarVariant?: "static" | "floating";
  /** Extra controls appended to the end of the toolbar row (e.g. save/cancel). */
  toolbarTrailing?: ReactNode;
  /** Focuses the editor on mount. */
  autoFocus?: boolean;
  /** CSS min-height for the editable area. Default "140px". */
  minHeight?: string;
};

type HtmlModeProps = SharedProps & {
  format?: "html";
  value?: string;
  onChange?: (html: string) => void;
};

type LexicalModeProps = SharedProps & {
  format: "lexical";
  value?: SerializedEditorState | null;
  onChange?: (state: SerializedEditorState) => void;
};

type Props = HtmlModeProps | LexicalModeProps;

const TOOLBAR_BTN =
  "px-2 py-1 text-xs rounded hover:bg-accent hover:text-accent-foreground transition-colors";

function ToolbarButtons() {
  const [editor] = useLexicalComposerContext();
  return (
    <>
      <button
        type="button"
        className={TOOLBAR_BTN}
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
        }}
      >
        <strong>B</strong>
      </button>

      <button
        type="button"
        className={TOOLBAR_BTN}
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
        }}
      >
        <em>I</em>
      </button>

      <button
        type="button"
        className={TOOLBAR_BTN}
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(
            INSERT_UNORDERED_LIST_COMMAND,
            undefined
          );
        }}
      >
        • List
      </button>

      <button
        type="button"
        className={TOOLBAR_BTN}
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(
            INSERT_ORDERED_LIST_COMMAND,
            undefined
          );
        }}
      >
        1. List
      </button>

      <button
        type="button"
        className={TOOLBAR_BTN}
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(
            REMOVE_LIST_COMMAND,
            undefined
          );
        }}
      >
        Clear
      </button>
    </>
  );
}

function StaticToolbar({ trailing }: { trailing?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1">
      <ToolbarButtons />
      {trailing && <div className="ml-auto flex items-center gap-1">{trailing}</div>}
    </div>
  );
}

function FloatingToolbar({ trailing }: { trailing?: ReactNode }) {
  return (
    <div className="absolute -top-10 left-0 z-10 flex items-center gap-1 rounded-md border border-input bg-popover px-1 py-1 shadow-md">
      <ToolbarButtons />
      {trailing && (
        <>
          <div className="mx-1 h-4 w-px bg-border" />
          {trailing}
        </>
      )}
    </div>
  );
}

function LoadInitialValue({
  format,
  value,
}: {
  format: "html" | "lexical";
  value?: string | SerializedEditorState | null;
}) {
  const [editor] = useLexicalComposerContext();
  const loaded = useRef(false);

  useEffect(() => {
    if (!value || loaded.current) return;
    loaded.current = true;

    if (format === "lexical") {
      const state = editor.parseEditorState(value as SerializedEditorState);
      editor.setEditorState(state);
      return;
    }

    editor.update(() => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(value as string, "text/html");

      const nodes = $generateNodesFromDOM(editor, dom);
      const root = $getRoot();

      root.clear();

      if (nodes.length > 0) {
        root.select();
        $insertNodes(nodes);
      } else {
        root.append($createParagraphNode());
      }
    });
  }, [format, value, editor]);

  return null;
}

export default function RichTextEditor(props: Props) {
  const {
    placeholder,
    className,
    value,
    bordered = true,
    toolbarVariant = "static",
    toolbarTrailing,
    autoFocus,
    minHeight = "140px",
  } = props;
  const format = props.format ?? "html";

  const initialConfig = {
    namespace: "ResumeEditor",
    theme: {},
    onError(error: Error) {
      console.error(error);
    },
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
  };

  return (
    <div
      className={cn(
        bordered && "rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring",
        className
      )}
    >
      <LexicalComposer initialConfig={initialConfig}>
        {toolbarVariant === "static" && <StaticToolbar trailing={toolbarTrailing} />}

        <div className="relative px-3 py-2" style={{ minHeight }}>
          {toolbarVariant === "floating" && <FloatingToolbar trailing={toolbarTrailing} />}

          <RichTextPlugin
            contentEditable={
            <ContentEditable
              className="
                outline-none
                text-sm
                max-w-none

                [&_ul]:list-disc
                [&_ul]:pl-6
                [&_ul]:space-y-1
                [&_ol]:list-decimal
                [&_ol]:pl-6
                [&_ol]:space-y-1
                [&_li]:pl-2
              "
              style={{ minHeight }}
            />
            }
            placeholder={
              <div className="absolute left-3 top-2 text-sm text-muted-foreground pointer-events-none">
                {placeholder || "Write here..."}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />

          <HistoryPlugin />
          <ListPlugin />
          {autoFocus && <AutoFocusPlugin />}

          <OnChangePlugin
            onChange={(editorState: EditorState, editor) => {
              if (format === "lexical") {
                (props as LexicalModeProps).onChange?.(editorState.toJSON());
                return;
              }
              editorState.read(() => {
                const html = $generateHtmlFromNodes(editor, null);
                (props as HtmlModeProps).onChange?.(html);
              });
            }}
          />

          <LoadInitialValue format={format} value={value} />
        </div>
      </LexicalComposer>
    </div>
  );
}
