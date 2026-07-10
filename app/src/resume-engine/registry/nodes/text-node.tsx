import { cn } from "@/lib/utils";
import { registerNodeType, type NodeComponentProps } from "../node-registry";
import { resolveBinding } from "../../binding/resolve-binding";
import type { TextNodeProps } from "../../types/template";
import type { TypographyToken } from "../../types/template";

const VARIANT_STYLE: Record<TypographyToken, { fontWeight?: number }> = {
  h1: { fontWeight: 700 },
  h2: { fontWeight: 700 },
  body: {},
  small: {},
  label: { fontWeight: 600 },
};

function TextNode({ node, scope, theme, mode }: NodeComponentProps) {
  const props = (node.props as TextNodeProps) || {};
  const bound = node.binding ? resolveBinding(node.binding, scope.value) : undefined;
  const value = bound != null && bound !== "" ? String(bound) : undefined;
  const text = value ?? props.text;

  let content = text;
  if (props.bindingEnd) {
    const endBound = resolveBinding(props.bindingEnd, scope.value);
    const endText = endBound != null && endBound !== "" ? String(endBound) : props.emptyEndFallback;
    if (content && endText) {
      content = `${content}${props.separator ?? " – "}${endText}`;
    }
  }

  const variant = props.variant ?? "body";
  const Tag = props.as ?? "span";

  if (!content) {
    // A downloaded/printed resume (mode="static") never shows synthetic
    // placeholder text for data the candidate hasn't entered — only the
    // interactive editor does, where clicking it opens the same editor as
    // non-empty content (RenderNode wraps any editable node in
    // EditableOverlay regardless of what it renders).
    if (mode === "interactive" && node.editable?.editable) {
      return (
        <Tag
          className={cn(node.className)}
          style={{ fontSize: theme.sizes[variant], color: theme.colors.muted, fontStyle: "italic" }}
        >
          {props.placeholder ?? "Click to add"}
        </Tag>
      );
    }
    return null;
  }

  const style = {
    fontSize: theme.sizes[variant],
    color: props.muted ? theme.colors.muted : theme.colors.text,
    ...VARIANT_STYLE[variant],
  };

  const hrefValue = props.hrefBinding ? resolveBinding(props.hrefBinding, scope.value) : value;
  if (props.href && typeof hrefValue === "string" && hrefValue) {
    return (
      <Tag className={cn(node.className)} style={style}>
        <a href={hrefValue} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
          {content}
        </a>
      </Tag>
    );
  }

  return (
    <Tag className={cn(node.className)} style={style}>
      {content}
    </Tag>
  );
}

registerNodeType("Text", TextNode);
export default TextNode;
