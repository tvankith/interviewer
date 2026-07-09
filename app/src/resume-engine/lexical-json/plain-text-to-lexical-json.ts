import type { SerializedEditorState } from "lexical";
import { EMPTY_LEXICAL_DOC } from "../types/lexical";

/**
 * Wraps a plain-text string (as authored by the interview agent's LLM) into
 * a Lexical SerializedEditorState — one paragraph per non-empty line. An
 * array of strings (e.g. resume-parser bullet points) is rendered as a
 * single bullet list instead.
 */
export function plainTextToLexicalJson(text: string | string[] | null | undefined): SerializedEditorState {
  if (Array.isArray(text)) {
    const items = text.map((line) => line.trim()).filter((line) => line.length > 0);
    if (items.length === 0) return EMPTY_LEXICAL_DOC;

    const listItems = items.map((line, index) => ({
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
      type: "listitem",
      value: index + 1,
      version: 1,
    }));

    return {
      root: {
        children: [
          {
            children: listItems,
            direction: "ltr",
            format: "",
            indent: 0,
            listType: "bullet",
            start: 1,
            tag: "ul",
            type: "list",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "root",
        version: 1,
      },
    } as unknown as SerializedEditorState;
  }

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
