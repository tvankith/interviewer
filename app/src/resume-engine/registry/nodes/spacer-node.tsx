import { registerNodeType, type NodeComponentProps } from "../node-registry";
import type { SpacerNodeProps } from "../../types/template";

function SpacerNode({ node, theme }: NodeComponentProps) {
  const props = (node.props as SpacerNodeProps) || { size: "md" };
  return <div style={{ height: theme.spacing[props.size] }} />;
}

registerNodeType("Spacer", SpacerNode);
export default SpacerNode;
