export type NodeType =
  | "Page"
  | "Row"
  | "Column"
  | "Stack"
  | "Spacer"
  | "Divider"
  | "Section"
  | "Text"
  | "RichText"
  | "List"
  | "Image";

export type SpacingToken = "xs" | "sm" | "md" | "lg" | "xl";
export type TypographyToken = "h1" | "h2" | "body" | "small" | "label";

export type EditableConfig = {
  /** Can the resume owner edit the bound content via click-to-edit. */
  editable: boolean;
  /** Can this node be removed from the layout. Schema-only in MVP — no UI reads it yet. */
  removable?: boolean;
  /** For List repeaters: can items be added/removed. Schema-only in MVP. */
  addable?: boolean;
};

export type TextNodeProps = {
  as?: "h1" | "h2" | "h3" | "span" | "p";
  variant?: TypographyToken;
  /** Wraps the text in a link. Uses `hrefBinding` if given, else the main `binding`'s own value. */
  href?: boolean;
  /** Path resolved separately from `binding` to provide the link target (e.g. text=social_media, href=url). */
  hrefBinding?: string;
  /** Renders "start – end" when both `binding` and `bindingEnd` resolve. */
  bindingEnd?: string;
  /** Shown in place of an empty `bindingEnd` resolution (e.g. "Present"). */
  emptyEndFallback?: string;
  /** Static literal text instead of / alongside a binding (e.g. section labels). */
  text?: string;
  separator?: string;
  /** Renders using the theme's muted color instead of the primary text color. */
  muted?: boolean;
};

export type RichTextNodeProps = {
  variant?: TypographyToken;
};

export type ListNodeProps = {
  /** Leaf mode: render the bound array directly (e.g. skills). */
  display?: "chip" | "comma" | "bullet";
  /** Repeater mode: render `itemTemplate` once per element of the bound array. */
  itemTemplate?: TemplateNode;
  gap?: SpacingToken;
};

export type PageNodeProps = {
  size?: "a4" | "letter";
  padding?: SpacingToken;
};

export type RowNodeProps = {
  gap?: SpacingToken;
  justify?: "start" | "center" | "end" | "space-between";
  align?: "start" | "center" | "end" | "baseline";
};

export type ColumnNodeProps = {
  gap?: SpacingToken;
  width?: string;
};

export type StackNodeProps = {
  gap?: SpacingToken;
};

export type SpacerNodeProps = {
  size: SpacingToken;
};

export type DividerNodeProps = {
  orientation?: "horizontal" | "vertical";
};

export type SectionNodeProps = {
  title?: string;
};

export type ImageNodeProps = {
  alt?: string;
};

export interface TemplateNode {
  /** Stable id — React key and the click-to-edit target identifier. */
  id: string;
  type: NodeType;
  /** Dot-path into ResumeData (root scope) or into the current repeater scope. */
  binding?: string;
  editable?: EditableConfig;
  className?: string;
  props?:
    | TextNodeProps
    | RichTextNodeProps
    | ListNodeProps
    | PageNodeProps
    | RowNodeProps
    | ColumnNodeProps
    | StackNodeProps
    | SpacerNodeProps
    | DividerNodeProps
    | SectionNodeProps
    | ImageNodeProps
    | Record<string, never>;
  children?: TemplateNode[];
}

export interface TemplateDocument {
  schemaVersion: 1;
  id: string;
  name: string;
  /** Always a single Page node for MVP — no multi-page flow. */
  root: TemplateNode;
}
