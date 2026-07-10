import { cn } from "@/lib/utils";
import { registerNodeType, type NodeComponentProps } from "../node-registry";
import { resolveBinding } from "../../binding/resolve-binding";
import type { ImageNodeProps } from "../../types/template";

// No profile-photo field exists in ResumeData yet, so this node type is
// implemented (satisfying the core node set) but unused by the MVP Classic
// template — kept ready for a future `photo_url` field.
function ImageNode({ node, scope }: NodeComponentProps) {
  const props = (node.props as ImageNodeProps) || {};
  const src = node.binding ? resolveBinding(node.binding, scope.value) : undefined;
  if (typeof src !== "string" || !src) return null;

  // eslint-disable-next-line @next/next/no-img-element -- static/print rendering path, next/image isn't usable server-side here
  return <img src={src} alt={props.alt ?? ""} className={cn("object-cover", node.className)} />;
}

registerNodeType("Image", ImageNode);
export default ImageNode;
