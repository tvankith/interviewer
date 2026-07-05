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

function TextNode({ node, scope, theme }: NodeComponentProps) {
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

  if (!content) return null;

  const variant = props.variant ?? "body";
  const style = {
    fontSize: theme.sizes[variant],
    color: props.muted ? theme.colors.muted : theme.colors.text,
    ...VARIANT_STYLE[variant],
  };

  const Tag = props.as ?? "span";

  const hrefValue = props.hrefBinding ? resolveBinding(props.hrefBinding, scope.value) : value;
  if (props.href && typeof hrefValue === "string" && hrefValue) {
    return (
      <Tag className={cn(node.className)} style={style}>
        <a href={hrefValue} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
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
