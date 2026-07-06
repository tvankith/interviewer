import type { ReactNode } from "react";
import { Fragment } from "react";
import type { SerializedEditorState, SerializedLexicalNode } from "lexical";
import { isLexicalDoc } from "../types/lexical";

// Lexical's TextNode format bitmask (see lexical/TextNode.ts) — duplicated
// here rather than imported since it isn't exported as a public constant.
const IS_BOLD = 1;
const IS_ITALIC = 2;
const IS_STRIKETHROUGH = 4;
const IS_UNDERLINE = 8;
const IS_CODE = 16;

type AnyNode = SerializedLexicalNode & {
  children?: AnyNode[];
  text?: string;
  format?: number | string;
  tag?: string;
};

function renderTextNode(node: AnyNode, key: number): ReactNode {
  let content: ReactNode = node.text ?? "";
  const format = typeof node.format === "number" ? node.format : 0;

  if (format & IS_CODE) content = <code>{content}</code>;
  if (format & IS_STRIKETHROUGH) content = <s>{content}</s>;
  if (format & IS_UNDERLINE) content = <u>{content}</u>;
  if (format & IS_ITALIC) content = <em>{content}</em>;
  if (format & IS_BOLD) content = <strong>{content}</strong>;

  return <Fragment key={key}>{content}</Fragment>;
}

function renderChildren(node: AnyNode): ReactNode {
  return (node.children ?? []).map((child, index) => renderNode(child, index));
}

function renderNode(node: AnyNode, key: number): ReactNode {
  switch (node.type) {
    case "text":
      return renderTextNode(node, key);
    case "linebreak":
      return <br key={key} />;
    case "paragraph":
      return <p key={key}>{renderChildren(node)}</p>;
    case "heading": {
      const Tag = (node.tag as "h1" | "h2" | "h3" | "h4" | "h5" | "h6") || "h3";
      return <Tag key={key}>{renderChildren(node)}</Tag>;
    }
    case "quote":
      return <blockquote key={key}>{renderChildren(node)}</blockquote>;
    case "list": {
      const Tag = node.tag === "number" || (node as { listType?: string }).listType === "number" ? "ol" : "ul";
      return <Tag key={key}>{renderChildren(node)}</Tag>;
    }
    case "listitem":
      return <li key={key}>{renderChildren(node)}</li>;
    default:
      return node.children ? <Fragment key={key}>{renderChildren(node)}</Fragment> : null;
  }
}

/** Renders a Lexical SerializedEditorState as real React elements (no HTML string, no dangerouslySetInnerHTML). */
export function lexicalJsonToReact(doc: SerializedEditorState | null | undefined): ReactNode {
  if (!doc || !isLexicalDoc(doc)) return null;
  const root = doc.root as unknown as AnyNode;
  return renderChildren(root);
}

function nodeHasText(node: AnyNode): boolean {
  if (node.type === "text") return Boolean(node.text?.trim());
  return (node.children ?? []).some(nodeHasText);
}

/**
 * True if the doc contains any non-whitespace text. A freshly-initialized
 * doc (e.g. EMPTY_LEXICAL_DOC) is a structurally valid root+paragraph with
 * no text, so `isLexicalDoc` alone can't distinguish "untouched" from
 * "has content" — used by has-content.ts to decide whether a Section is
 * empty.
 */
export function lexicalDocHasText(doc: SerializedEditorState | null | undefined): boolean {
  if (!doc || !isLexicalDoc(doc)) return false;
  return nodeHasText(doc.root as unknown as AnyNode);
}
