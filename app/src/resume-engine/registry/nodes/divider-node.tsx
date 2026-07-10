import { cn } from "@/lib/utils";
import { registerNodeType, type NodeComponentProps } from "../node-registry";
import type { DividerNodeProps } from "../../types/template";

function DividerNode({ node, theme }: NodeComponentProps) {
  const props = (node.props as DividerNodeProps) || {};
  const isVertical = props.orientation === "vertical";
  return (
    <div
      className={cn(isVertical ? "self-stretch" : "w-full", node.className)}
      style={{
        borderLeft: isVertical ? `${theme.borders.width} solid ${theme.colors.line}` : undefined,
        borderTop: isVertical ? undefined : `${theme.borders.width} solid ${theme.colors.line}`,
      }}
    />
  );
}

registerNodeType("Divider", DividerNode);
export default DividerNode;
