import type { SerializedEditorState } from "lexical";
import { isLexicalDoc } from "../types/lexical";
import { plainTextToLexicalJson } from "./plain-text-to-lexical-json";

/**
 * Coerces a rich-text field coming back from the API into a real
 * SerializedEditorState. Handles three cases seen in the wild:
 * - already a proper Lexical doc object -> returned as-is
 * - a JSON-encoded string of a Lexical doc (can happen if a caller ever
 *   sends `JSON.stringify(state)` instead of the object itself) -> parsed
 * - legacy plain text (pre-Lexical data) -> wrapped via plainTextToLexicalJson
 */
export function normalizeRichText(value: unknown): SerializedEditorState | null {
  if (value == null) return null;
  if (isLexicalDoc(value)) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (isLexicalDoc(parsed)) return parsed;
      } catch {
        // not valid JSON — fall through and treat as plain text
      }
    }
    return plainTextToLexicalJson(value);
  }

  return null;
}
