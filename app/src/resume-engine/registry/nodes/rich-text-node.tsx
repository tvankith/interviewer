import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import { registerNodeType, type NodeComponentProps } from "../node-registry";
import { resolveBinding } from "../../binding/resolve-binding";
import { lexicalJsonToReact } from "../../lexical-json/lexical-json-to-react";
import { isLexicalDoc } from "../../types/lexical";
import type { RichTextNodeProps } from "../../types/template";

const ALLOWED_TAGS = ["b", "i", "em", "strong", "a", "p", "br", "span", "ul", "ol", "li"];

function RichTextNode({ node, scope, theme }: NodeComponentProps) {
  const props = (node.props as RichTextNodeProps) || {};
  const value = node.binding ? resolveBinding(node.binding, scope.value) : undefined;
  if (!value) return null;

  const style = { fontSize: theme.sizes[props.variant ?? "body"], color: theme.colors.text };
  // Tailwind's preflight resets `list-style: none` on ul/ol, so the plain
  // <ul>/<ol>/<li> elements lexicalJsonToReact emits render with no visible
  // bullet/number marker or indent unless we re-apply it here.
  const richTextClassName = cn(
    "resume-engine-richtext",
    "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1",
    "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1",
    "[&_li]:pl-1",
    node.className
  );

  if (isLexicalDoc(value)) {
    const rendered = lexicalJsonToReact(value);
    if (!rendered) return null;
    return (
      <div className={richTextClassName} style={style}>
        {rendered}
      </div>
    );
  }

  // Legacy HTML-string data (pre-migration) — sanitized fallback, matching
  // the current app's existing DOMPurify usage in resume-preview.tsx.
  if (typeof value === "string") {
    const sanitized = DOMPurify.sanitize(value, { ALLOWED_TAGS, ALLOWED_ATTR: ["href"] });
    if (!sanitized.trim()) return null;
    return (
      <div
        className={richTextClassName}
        style={style}
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  }

  return null;
}

registerNodeType("RichText", RichTextNode);
export default RichTextNode;
