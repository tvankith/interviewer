import type { SerializedEditorState } from "lexical";
import { EMPTY_LEXICAL_DOC } from "../types/lexical";

/**
 * Wraps a plain-text string (as authored by the interview agent's LLM) into
 * a Lexical SerializedEditorState — one paragraph per non-empty line.
 */
export function plainTextToLexicalJson(text: string | null | undefined): SerializedEditorState {
  if (!text || !text.trim()) return EMPTY_LEXICAL_DOC;

  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  const paragraphs = (lines.length > 0 ? lines : [text]).map((line) => ({
    children: [
      {
        detail: 0,
        format: 0,
        mode: "normal",
        style: "",
        text: line,
        type: "text",
        version: 1,
      },
    ],
    direction: "ltr",
    format: "",
    indent: 0,
    type: "paragraph",
    version: 1,
  }));

  return {
    root: {
      children: paragraphs,
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  } as unknown as SerializedEditorState;
}
