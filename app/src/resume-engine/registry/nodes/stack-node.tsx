import { cn } from "@/lib/utils";
import { registerNodeType, renderChildren, type NodeComponentProps } from "../node-registry";
import type { StackNodeProps } from "../../types/template";

/** Vertical-only convenience container, typically used inside a Section to stack repeated entries. */
function StackNode({ node, scope, resumeData, theme, mode, previousScope }: NodeComponentProps) {
  const props = (node.props as StackNodeProps) || {};
  return (
    <div className={cn("flex flex-col", node.className)} style={{ gap: props.gap ? theme.spacing[props.gap] : undefined }}>
      {renderChildren(node.children, scope, resumeData, theme, mode, previousScope)}
    </div>
  );
}

registerNodeType("Stack", StackNode);
export default StackNode;
