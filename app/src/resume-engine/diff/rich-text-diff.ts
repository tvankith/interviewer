import { lexicalJsonToPlainText } from "../lexical-json/lexical-json-to-plain-text";
import type { RichTextValue } from "../types/lexical";
import { scalarValuesDiffer } from "./scalar-diff";

/**
 * Reduces a rich-text field's value to plain text regardless of which
 * representation it's currently in: the stored value is a Lexical doc, but a
 * proposal's value is the agent's plain text — comparing them directly (or
 * JSON.stringify-ing the Lexical side) would diff an AST against a sentence.
 */
export function richTextToComparableText(value: RichTextValue | string | null | undefined): string {
  if (typeof value === "string") return value;
  return lexicalJsonToPlainText(value);
}

export function richTextValuesDiffer(oldValue: RichTextValue | string | null | undefined, newValue: RichTextValue | string | null | undefined): boolean {
  return scalarValuesDiffer(richTextToComparableText(oldValue), richTextToComparableText(newValue));
}
