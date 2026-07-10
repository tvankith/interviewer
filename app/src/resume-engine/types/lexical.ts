import type { SerializedEditorState } from "lexical";

/** Rich-text field value as persisted: Lexical's native serialized editor state. */
export type RichTextValue = SerializedEditorState | null | undefined;

export function isLexicalDoc(value: unknown): value is SerializedEditorState {
  return (
    typeof value === "object" &&
    value !== null &&
    "root" in value &&
    typeof (value as { root?: unknown }).root === "object" &&
    (value as { root?: { type?: unknown } }).root !== null &&
    (value as { root?: { type?: unknown } }).root?.type === "root"
  );
}

export const EMPTY_LEXICAL_DOC: SerializedEditorState = {
  root: {
    children: [
      {
        children: [],
        direction: null,
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      },
    ],
    direction: null,
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
} as unknown as SerializedEditorState;
