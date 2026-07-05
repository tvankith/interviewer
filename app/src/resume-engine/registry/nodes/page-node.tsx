import { registerNodeType, renderChildren, type NodeComponentProps } from "../node-registry";
import { pageStyle } from "../../theme/resolve-theme";

function PageNode({ node, scope, resumeData, theme, mode }: NodeComponentProps) {
  return (
    <div className="resume-engine-page" style={pageStyle(theme)}>
      {renderChildren(node.children, scope, resumeData, theme, mode)}
    </div>
  );
}

registerNodeType("Page", PageNode);
export default PageNode;
