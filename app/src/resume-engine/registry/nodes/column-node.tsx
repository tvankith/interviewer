import { cn } from "@/lib/utils";
import { registerNodeType, renderChildren, type NodeComponentProps } from "../node-registry";
import type { ColumnNodeProps } from "../../types/template";

function ColumnNode({ node, scope, resumeData, theme, mode }: NodeComponentProps) {
  const props = (node.props as ColumnNodeProps) || {};
  return (
    <div
      className={cn("flex flex-col min-w-0", node.className)}
      style={{
        gap: props.gap ? theme.spacing[props.gap] : undefined,
        width: props.width,
        flex: props.width ? `0 0 ${props.width}` : 1,
      }}
    >
      {renderChildren(node.children, scope, resumeData, theme, mode)}
    </div>
  );
}

registerNodeType("Column", ColumnNode);
export default ColumnNode;
