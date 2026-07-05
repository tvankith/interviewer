"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
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

type HtmlModeProps = {
  format?: "html";
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
};

type LexicalModeProps = {
  format: "lexical";
  value?: SerializedEditorState | null;
  onChange?: (state: SerializedEditorState) => void;
  placeholder?: string;
  className?: string;
};

type Props = HtmlModeProps | LexicalModeProps;

const TOOLBAR_BTN =
  "px-2 py-1 text-xs rounded hover:bg-accent hover:text-accent-foreground transition-colors";

function Toolbar() {
  const [editor] = useLexicalComposerContext();
  return (
    <div className="flex flex-wrap gap-1 border-b px-2 py-1">
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
  const { placeholder, className, value } = props;
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
        "rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring",
        className
      )}
    >
      <LexicalComposer initialConfig={initialConfig}>
        <Toolbar />

        <div className="relative min-h-[140px] px-3 py-2">
          <RichTextPlugin
            contentEditable={
            <ContentEditable
              className="
                min-h-[120px]
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
