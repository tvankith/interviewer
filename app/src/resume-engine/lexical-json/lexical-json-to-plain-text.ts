import type { SerializedEditorState } from "lexical";
import { isLexicalDoc } from "../types/lexical";

type AnyNode = {
  type: string;
  text?: string;
  children?: AnyNode[];
};

function collectText(node: AnyNode, lines: string[], current: { text: string }) {
  if (node.type === "text") {
    current.text += node.text ?? "";
    return;
  }
  if (node.type === "linebreak") {
    current.text += "\n";
    return;
  }

  const isBlock = node.type === "paragraph" || node.type === "heading" || node.type === "listitem" || node.type === "quote";
  for (const child of node.children ?? []) {
    collectText(child, lines, current);
  }
  if (isBlock) {
    lines.push(current.text);
    current.text = "";
  }
}

/** Flattens a Lexical doc to plain text — one line per paragraph/heading/list item. Used for HITL proposal diffs and as a display fallback. */
export function lexicalJsonToPlainText(doc: SerializedEditorState | null | undefined): string {
  if (!doc || !isLexicalDoc(doc)) return "";
  const lines: string[] = [];
  const current = { text: "" };
  collectText(doc.root as unknown as AnyNode, lines, current);
  if (current.text) lines.push(current.text);
  return lines.filter((line) => line.length > 0).join("\n");
}
