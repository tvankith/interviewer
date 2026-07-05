import { cn } from "@/lib/utils";
import { registerNodeType, renderChildren, type NodeComponentProps } from "../node-registry";
import type { RowNodeProps } from "../../types/template";

function RowNode({ node, scope, resumeData, theme, mode }: NodeComponentProps) {
  const props = (node.props as RowNodeProps) || {};
  return (
    <div
      className={cn("flex", node.className)}
      style={{
        gap: props.gap ? theme.spacing[props.gap] : undefined,
        justifyContent: props.justify,
        alignItems: props.align,
      }}
    >
      {renderChildren(node.children, scope, resumeData, theme, mode)}
    </div>
  );
}

registerNodeType("Row", RowNode);
export default RowNode;
