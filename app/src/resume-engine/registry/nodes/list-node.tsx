import { cn } from "@/lib/utils";
import { registerNodeType, RenderNode, type NodeComponentProps, type BindingScope } from "../node-registry";
import { resolveBinding, toAbsoluteBinding } from "../../binding/resolve-binding";
import type { ListNodeProps } from "../../types/template";

function ListNode({ node, scope, resumeData, theme, mode }: NodeComponentProps) {
  const props = (node.props as ListNodeProps) || {};
  const items = node.binding ? resolveBinding(node.binding, scope.value) : undefined;

  if (!Array.isArray(items) || items.length === 0) return null;

  // Repeater mode: render itemTemplate once per array element, with that
  // element as the new binding scope (see binding/resolve-binding.ts).
  if (props.itemTemplate) {
    const itemTemplate = props.itemTemplate;
    const listAbsoluteBinding = toAbsoluteBinding(scope.absolutePath, node.binding!);
    return (
      <div
        className={cn("flex flex-col", node.className)}
        style={{ gap: theme.spacing[props.gap ?? "sm"] }}
      >
        {items.map((item, index) => {
          const itemScope: BindingScope = {
            value: item,
            absolutePath: `${listAbsoluteBinding}.${index}`,
          };
          return (
            <RenderNode
              key={index}
              node={{ ...itemTemplate, id: `${itemTemplate.id}-${index}` }}
              scope={itemScope}
              resumeData={resumeData}
              theme={theme}
              mode={mode}
            />
          );
        })}
      </div>
    );
  }

  // Leaf mode: bound array is plain strings (skills, tech_stack).
  const display = props.display ?? "chip";
  const stringItems = items.map((item) => String(item));

  if (display === "comma") {
    return (
      <span className={node.className} style={{ fontSize: theme.sizes.body, color: theme.colors.text }}>
        {stringItems.join(", ")}
      </span>
    );
  }

  if (display === "bullet") {
    return (
      <ul className={cn("list-disc pl-4", node.className)} style={{ fontSize: theme.sizes.body, color: theme.colors.text }}>
        {stringItems.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
  }

  return (
    <div className={cn("flex flex-wrap", node.className)} style={{ gap: theme.spacing.xs }}>
      {stringItems.map((item, index) => (
        <span
          key={index}
          style={{
            fontSize: theme.sizes.small,
            color: theme.colors.text,
            border: `${theme.borders.width} solid ${theme.colors.pillBorder}`,
            background: theme.colors.pillBg,
            borderRadius: theme.borders.radius,
            padding: `2px ${theme.spacing.xs}`,
            whiteSpace: "nowrap",
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

registerNodeType("List", ListNode);
export default ListNode;
