import type { ComponentType, ReactNode } from "react";
import type { TemplateNode, NodeType } from "../types/template";
import type { ThemeDocument } from "../types/theme";
import type { ResumeData } from "../types/resume-data";
import { resolveBinding, toAbsoluteBinding } from "../binding/resolve-binding";

export type RenderMode = "interactive" | "static";

/**
 * The data a node's binding resolves against, plus (inside a List repeater)
 * the absolute RHF path prefix needed to write back to the right array item.
 * `absolutePath` is undefined at the document root, where bindings are
 * already absolute paths.
 */
export type BindingScope = {
  value: unknown;
  absolutePath?: string;
};

export type NodeComponentProps = {
  node: TemplateNode;
  scope: BindingScope;
  resumeData: ResumeData;
  theme: ThemeDocument;
  mode: RenderMode;
};

export type NodeComponent = ComponentType<NodeComponentProps>;

const registry = new Map<NodeType, NodeComponent>();

export function registerNodeType(type: NodeType, component: NodeComponent): void {
  registry.set(type, component);
}

export type EditableWrapperProps = {
  node: TemplateNode;
  value: unknown;
  absoluteBinding: string;
  children: ReactNode;
};

export type EditableWrapperComponent = ComponentType<EditableWrapperProps>;

// Set only by the client entry point (render/resume-canvas.tsx), never by
// the server-only static render path (render/render-static-html.ts) — this
// keeps node-registry.tsx and every node component free of any "use client"
// dependency (Radix Popover, Lexical's React hooks), so the PDF path's
// ReactDOMServer.renderToStaticMarkup call never touches client-only code.
let editableWrapper: EditableWrapperComponent | null = null;

export function setEditableWrapper(component: EditableWrapperComponent): void {
  editableWrapper = component;
}

/**
 * Single choke point for rendering a template node: resolves its binding,
 * renders the registered component for its type, and wraps the result in
 * click-to-edit when appropriate. Adding a new NodeType later only requires
 * a new component + registerNodeType call — this function never changes.
 */
export function RenderNode(props: NodeComponentProps) {
  const Component = registry.get(props.node.type);
  if (!Component) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[resume-engine] Unknown node type: ${props.node.type}`);
    }
    return null;
  }

  // Not a "component created during render" — Component is a stable reference
  // registered once at module load via registerNodeType, just looked up by key here.
  // eslint-disable-next-line react-hooks/static-components
  const rendered = <Component {...props} />;

  if (props.mode === "interactive" && props.node.editable?.editable && props.node.binding && editableWrapper) {
    const Wrapper = editableWrapper;
    const value = resolveBinding(props.node.binding, props.scope.value);
    const absoluteBinding = toAbsoluteBinding(props.scope.absolutePath, props.node.binding);
    return (
      <Wrapper node={props.node} value={value} absoluteBinding={absoluteBinding}>
        {rendered}
      </Wrapper>
    );
  }

  return rendered;
}

/** Shared helper: every container node (Page/Row/Column/Stack/Section) renders its children this way. */
export function renderChildren(
  children: TemplateNode[] | undefined,
  scope: BindingScope,
  resumeData: ResumeData,
  theme: ThemeDocument,
  mode: RenderMode
) {
  return (children ?? []).map((child) => (
    <RenderNode key={child.id} node={child} scope={scope} resumeData={resumeData} theme={theme} mode={mode} />
  ));
}
