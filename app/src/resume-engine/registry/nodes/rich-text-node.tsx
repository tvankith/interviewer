import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import { registerNodeType, type NodeComponentProps } from "../node-registry";
import { resolveBinding } from "../../binding/resolve-binding";
import { lexicalDocHasText, lexicalJsonToReact } from "../../lexical-json/lexical-json-to-react";
import { isLexicalDoc } from "../../types/lexical";
import type { RichTextNodeProps } from "../../types/template";

const ALLOWED_TAGS = ["b", "i", "em", "strong", "a", "p", "br", "span", "ul", "ol", "li"];

function RichTextNode({ node, scope, theme, mode }: NodeComponentProps) {
  const props = (node.props as RichTextNodeProps) || {};
  const value = node.binding ? resolveBinding(node.binding, scope.value) : undefined;

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

  if (isLexicalDoc(value) && lexicalDocHasText(value)) {
    return (
      <div className={richTextClassName} style={style}>
        {lexicalJsonToReact(value)}
      </div>
    );
  }

  // Legacy HTML-string data (pre-migration) — sanitized fallback, matching
  // the current app's existing DOMPurify usage in resume-preview.tsx.
  if (typeof value === "string" && value.trim()) {
    const sanitized = DOMPurify.sanitize(value, { ALLOWED_TAGS, ALLOWED_ATTR: ["href"] });
    if (sanitized.trim()) {
      return <div className={richTextClassName} style={style} dangerouslySetInnerHTML={{ __html: sanitized }} />;
    }
  }

  // Empty. A downloaded/printed resume (mode="static") never shows synthetic
  // placeholder text for data the candidate hasn't entered — only the
  // interactive editor does, where clicking it opens the same editor as
  // non-empty content (RenderNode wraps any editable node in EditableOverlay
  // regardless of what it renders).
  if (mode === "interactive" && node.editable?.editable) {
    return (
      <div className={richTextClassName} style={{ ...style, color: theme.colors.muted, fontStyle: "italic" }}>
        {props.placeholder ?? "Click to add"}
      </div>
    );
  }

  return null;
}

registerNodeType("RichText", RichTextNode);
export default RichTextNode;
