import { cn } from "@/lib/utils";
import { registerNodeType, renderChildren, type NodeComponentProps } from "../node-registry";
import type { SectionNodeProps } from "../../types/template";

function SectionNode({ node, scope, resumeData, theme, mode, previousScope }: NodeComponentProps) {
  const props = (node.props as SectionNodeProps) || {};
  return (
    <div className={cn("resume-engine-avoid-break", node.className)} style={{ marginTop: theme.spacing.md }}>
      {props.title && (
        <div
          style={{
            fontSize: theme.sizes.small,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            borderBottom: `${theme.borders.width} solid ${theme.colors.text}`,
            paddingBottom: theme.spacing.xs,
            marginBottom: theme.spacing.sm,
          }}
        >
          {props.title}
        </div>
      )}
      <div className="flex flex-col" style={{ gap: theme.spacing.sm }}>
        {renderChildren(node.children, scope, resumeData, theme, mode, previousScope)}
      </div>
    </div>
  );
}

registerNodeType("Section", SectionNode);
export default SectionNode;
