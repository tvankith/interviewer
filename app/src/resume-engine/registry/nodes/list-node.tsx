import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { registerNodeType, RenderNode, getListControls, getDiffEntryWrapper, type NodeComponentProps, type BindingScope } from "../node-registry";
import { resolveBinding, toAbsoluteBinding } from "../../binding/resolve-binding";
import { correspondPositionally, type EntryCorrespondence } from "../../diff/list-correspondence";
import { buildRepeaterEntryScope } from "../../pagination/repeater-entry-scope";
import type { ListNodeProps, TemplateNode } from "../../types/template";
import type { ThemeDocument } from "../../types/theme";
import type { ResumeData } from "../../types/resume-data";

/**
 * Blank data shape for a new repeater entry, derived from the itemTemplate's
 * own bindings (e.g. experience-item -> { role: "", company: "", ... }) so
 * appending an item never depends on a hardcoded ResumeExperience/etc. shape.
 */
function buildBlankItem(itemTemplate: TemplateNode): Record<string, unknown> {
  const blank: Record<string, unknown> = {};
  const visit = (node: TemplateNode) => {
    if (node.binding) {
      blank[node.binding] = node.type === "RichText" ? null : node.type === "List" ? [] : "";
    }
    const bindingEnd = (node.props as { bindingEnd?: string } | undefined)?.bindingEnd;
    if (bindingEnd) blank[bindingEnd] = "";
    (node.children ?? []).forEach(visit);
  };
  visit(itemTemplate);
  return blank;
}

/**
 * Renders one repeater entry's diff decoration (added/removed whole-block, or modified/unchanged
 * cascading per-field diffs) — exported so the pagination hidden measurement pass can measure the
 * exact same markup (including the DiffEntry accept/reject wrapper, which adds real flow height)
 * rather than an approximation that would silently under-measure diff-mode pages.
 */
export function renderRepeaterDiffEntry(
  entry: EntryCorrespondence<unknown>,
  itemTemplate: TemplateNode,
  listAbsoluteBinding: string | undefined,
  isTopLevelUnit: boolean,
  resumeData: ResumeData,
  theme: ThemeDocument
): ReactNode {
  const DiffEntry = getDiffEntryWrapper();
  const itemAbsolutePath = listAbsoluteBinding ? `${listAbsoluteBinding}.${entry.index}` : undefined;

  if (entry.kind === "removed") {
    const itemScope: BindingScope = { value: entry.oldItem, absolutePath: itemAbsolutePath };
    const rendered = (
      <RenderNode
        node={{ ...itemTemplate, id: `${itemTemplate.id}-removed-${entry.index}` }}
        scope={itemScope}
        resumeData={resumeData}
        theme={theme}
        mode="static"
      />
    );
    const content = <div className="text-red-600 line-through decoration-red-600/70">{rendered}</div>;
    return isTopLevelUnit && listAbsoluteBinding && DiffEntry ? (
      <DiffEntry key={`removed-${entry.index}`} listAbsoluteBinding={listAbsoluteBinding} index={entry.index} kind="removed">
        {content}
      </DiffEntry>
    ) : (
      <Fragment key={`removed-${entry.index}`}>{content}</Fragment>
    );
  }

  if (entry.kind === "added") {
    const itemScope: BindingScope = { value: entry.newItem, absolutePath: itemAbsolutePath };
    const rendered = (
      <RenderNode
        node={{ ...itemTemplate, id: `${itemTemplate.id}-added-${entry.index}` }}
        scope={itemScope}
        resumeData={resumeData}
        theme={theme}
        mode="static"
      />
    );
    return isTopLevelUnit && listAbsoluteBinding && DiffEntry ? (
      <DiffEntry key={`added-${entry.index}`} listAbsoluteBinding={listAbsoluteBinding} index={entry.index} kind="added">
        {rendered}
      </DiffEntry>
    ) : (
      <Fragment key={`added-${entry.index}`}>{rendered}</Fragment>
    );
  }

  // modified or unchanged — recurse in diff mode with both scopes so every
  // field inside cascades its own scalar/rich-text diff decoration; an
  // "unchanged" entry naturally renders with zero decoration this way.
  const itemScope: BindingScope = { value: entry.newItem, absolutePath: itemAbsolutePath };
  const previousItemScope: BindingScope = { value: entry.oldItem, absolutePath: itemAbsolutePath };
  const rendered = (
    <RenderNode
      node={{ ...itemTemplate, id: `${itemTemplate.id}-${entry.index}` }}
      scope={itemScope}
      previousScope={previousItemScope}
      resumeData={resumeData}
      theme={theme}
      mode="diff"
    />
  );

  return entry.kind === "modified" && isTopLevelUnit && listAbsoluteBinding && DiffEntry ? (
    <DiffEntry key={entry.index} listAbsoluteBinding={listAbsoluteBinding} index={entry.index} kind="modified">
      {rendered}
    </DiffEntry>
  ) : (
    <Fragment key={entry.index}>{rendered}</Fragment>
  );
}

/** Renders one repeater's entries in diff mode (see renderRepeaterDiffEntry for per-entry decoration rules). */
function renderRepeaterDiff(
  correspondence: EntryCorrespondence<unknown>[],
  itemTemplate: TemplateNode,
  listAbsoluteBinding: string | undefined,
  isTopLevelUnit: boolean,
  resumeData: ResumeData,
  theme: ThemeDocument,
  entryRange?: [start: number, end: number]
): ReactNode[] {
  return correspondence.map((entry) => {
    if (entryRange && (entry.index < entryRange[0] || entry.index >= entryRange[1])) return null;
    return renderRepeaterDiffEntry(entry, itemTemplate, listAbsoluteBinding, isTopLevelUnit, resumeData, theme);
  });
}

/** A leaf chip's style, colored to reflect its correspondence kind (unchanged/added/removed) rather than a per-chip accept/reject control — chips are decoration within their enclosing entry/list's single review unit, not their own unit (see design.md Non-Goals). */
function leafChipStyle(theme: ThemeDocument, kind: EntryCorrespondence<string>["kind"]) {
  const base = {
    fontSize: theme.sizes.small,
    borderRadius: theme.borders.radius,
    padding: `2px ${theme.spacing.xs}`,
    whiteSpace: "nowrap" as const,
    textDecoration: undefined as string | undefined,
    background: undefined as string | undefined,
  };
  if (kind === "removed") {
    return { ...base, color: "#dc2626", border: `${theme.borders.width} solid #dc2626`, textDecoration: "line-through" };
  }
  if (kind === "added") {
    return { ...base, color: "#15803d", border: `${theme.borders.width} solid #15803d` };
  }
  return {
    ...base,
    color: theme.colors.text,
    border: `${theme.borders.width} solid ${theme.colors.pillBorder}`,
    background: theme.colors.pillBg,
  };
}

function leafEntryText(entry: EntryCorrespondence<string>): string {
  return entry.kind === "removed" ? entry.oldItem : entry.kind === "added" ? entry.newItem : entry.oldItem;
}

/** Renders a leaf string-array field (skills-within-a-group, tech_stack) in diff mode: chip-by-chip added/removed/unchanged decoration, no independent accept/reject per chip. */
function renderLeafDiff(correspondence: EntryCorrespondence<string>[], display: "chip" | "comma" | "bullet", prefixLabel: ReactNode, theme: ThemeDocument, className?: string) {
  if (display === "bullet") {
    return (
      <ul className={cn("list-disc pl-4", className)} style={{ fontSize: theme.sizes.body }}>
        {correspondence.map((entry) => (
          <li key={`${entry.kind}-${entry.index}`} style={{ color: leafChipStyle(theme, entry.kind).color, textDecoration: leafChipStyle(theme, entry.kind).textDecoration }}>
            {leafEntryText(entry)}
          </li>
        ))}
      </ul>
    );
  }

  if (display === "comma") {
    return (
      <span className={className} style={{ fontSize: theme.sizes.body }}>
        {prefixLabel}
        {prefixLabel ? " " : ""}
        {correspondence.map((entry, i) => (
          <span key={`${entry.kind}-${entry.index}`}>
            <span style={{ color: leafChipStyle(theme, entry.kind).color, textDecoration: leafChipStyle(theme, entry.kind).textDecoration }}>
              {leafEntryText(entry)}
            </span>
            {i < correspondence.length - 1 ? ", " : ""}
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className={cn("flex flex-wrap", className)} style={{ gap: theme.spacing.xs, alignItems: "baseline" }}>
      {prefixLabel}
      {correspondence.map((entry) => (
        <span key={`${entry.kind}-${entry.index}`} style={leafChipStyle(theme, entry.kind)}>
          {leafEntryText(entry)}
        </span>
      ))}
    </div>
  );
}

function ListNode({ node, scope, previousScope, resumeData, theme, mode }: NodeComponentProps) {
  const props = (node.props as ListNodeProps) || {};
  const items = node.binding ? resolveBinding(node.binding, scope.value) : undefined;
  const listAbsoluteBinding = node.binding ? toAbsoluteBinding(scope.absolutePath, node.binding) : undefined;

  const prefixBound = props.prefixBinding ? resolveBinding(props.prefixBinding, scope.value) : undefined;
  const prefixText = prefixBound != null && prefixBound !== "" ? `${String(prefixBound)}${props.prefixSuffix ?? ""}` : undefined;
  const prefixLabel = prefixText ? (
    <span style={{ fontSize: theme.sizes.label, color: theme.colors.text, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
      {prefixText}
    </span>
  ) : null;

  if (mode === "diff" && node.binding) {
    const isTopLevelUnit = scope.absolutePath === undefined;
    const previousItems = previousScope ? resolveBinding(node.binding, previousScope.value) : undefined;

    if (props.itemTemplate) {
      const correspondence = correspondPositionally(
        Array.isArray(previousItems) ? previousItems : undefined,
        Array.isArray(items) ? items : undefined
      );
      return (
        <div className={cn("flex flex-col items-stretch", node.className)} style={{ gap: theme.spacing[props.gap ?? "sm"] }}>
          {renderRepeaterDiff(correspondence, props.itemTemplate, listAbsoluteBinding, isTopLevelUnit, resumeData, theme, props.entryRange)}
        </div>
      );
    }

    const correspondence = correspondPositionally(
      Array.isArray(previousItems) ? (previousItems as string[]) : undefined,
      Array.isArray(items) ? (items as string[]).map(String) : undefined
    );
    return renderLeafDiff(correspondence, props.display ?? "chip", prefixLabel, theme, node.className);
  }

  // Hover add/remove controls only apply when the template opts in
  // (`editable.addable`) and there's somewhere to write the result back to.
  const manage =
    mode === "interactive" && node.editable?.addable && listAbsoluteBinding
      ? { controls: getListControls(), listAbsoluteBinding }
      : null;

  if (!Array.isArray(items) || items.length === 0) {
    // A downloaded/printed resume (mode="static") never shows synthetic
    // placeholder text for data the candidate hasn't entered.
    if (mode !== "interactive") return null;

    // Repeater lists (experience/education/projects).
    if (props.itemTemplate) {
      return (
        <div className={cn("flex flex-col items-start", node.className)} style={{ gap: theme.spacing[props.gap ?? "sm"] }}>
          <div style={{ fontSize: theme.sizes.small, color: theme.colors.muted, fontStyle: "italic" }}>
            {props.placeholder ?? "No items added yet"}
          </div>
          {manage?.controls && (
            <manage.controls.AddItemButton
              listAbsoluteBinding={manage.listAbsoluteBinding}
              items={[]}
              blankItem={buildBlankItem(props.itemTemplate)}
              label={props.addLabel ?? "Add item"}
            />
          )}
        </div>
      );
    }

    // Leaf lists (e.g. skills) are edited as a whole array via the same
    // click-to-edit wrapper as any other editable node.
    if (node.editable?.editable) {
      return (
        <div className={cn("flex flex-wrap", node.className)} style={{ gap: theme.spacing.xs, alignItems: "baseline" }}>
          {prefixLabel}
          <span style={{ fontSize: theme.sizes.small, color: theme.colors.muted, fontStyle: "italic" }}>
            {props.placeholder ?? "Click to add"}
          </span>
        </div>
      );
    }

    return null;
  }

  // Repeater mode: render itemTemplate once per array element, with that
  // element as the new binding scope (see binding/resolve-binding.ts).
  if (props.itemTemplate) {
    const itemTemplate = props.itemTemplate;
    return (
      <div
        className={cn("flex flex-col items-stretch", node.className)}
        style={{ gap: theme.spacing[props.gap ?? "sm"] }}
      >
        {items.map((item, index) => {
          if (props.entryRange && (index < props.entryRange[0] || index >= props.entryRange[1])) return null;
          const itemScope: BindingScope = buildRepeaterEntryScope(listAbsoluteBinding, index, item);
          const rendered = (
            <RenderNode
              node={{ ...itemTemplate, id: `${itemTemplate.id}-${index}` }}
              scope={itemScope}
              resumeData={resumeData}
              theme={theme}
              mode={mode}
            />
          );
          if (manage?.controls) {
            return (
              <manage.controls.RepeaterItemWrapper
                key={index}
                listAbsoluteBinding={manage.listAbsoluteBinding}
                items={items}
                index={index}
              >
                {rendered}
              </manage.controls.RepeaterItemWrapper>
            );
          }
          return <Fragment key={index}>{rendered}</Fragment>;
        })}
        {manage?.controls && !props.hideAddButton && (
          <manage.controls.AddItemButton
            listAbsoluteBinding={manage.listAbsoluteBinding}
            items={items}
            blankItem={buildBlankItem(itemTemplate)}
            label={props.addLabel ?? "Add item"}
          />
        )}
      </div>
    );
  }

  // Leaf mode: bound array is plain strings (skills, tech_stack).
  const display = props.display ?? "chip";
  const stringItems = items.map((item) => String(item));

  if (display === "comma") {
    return (
      <span className={node.className} style={{ fontSize: theme.sizes.body, color: theme.colors.text }}>
        {prefixLabel}
        {prefixLabel ? " " : ""}
        {stringItems.join(", ")}
      </span>
    );
  }

  if (display === "bullet") {
    return (
      <ul className={cn("list-disc pl-4", node.className)} style={{ fontSize: theme.sizes.body, color: theme.colors.text }}>
        {stringItems.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
  }

  return (
    <div className={cn("flex flex-wrap", node.className)} style={{ gap: theme.spacing.xs, alignItems: "baseline" }}>
      {prefixLabel}
      {stringItems.map((item, index) => {
        const chip = (
          <span
            style={{
              fontSize: theme.sizes.small,
              color: theme.colors.text,
              border: `${theme.borders.width} solid ${theme.colors.pillBorder}`,
              background: theme.colors.pillBg,
              borderRadius: theme.borders.radius,
              padding: `2px ${theme.spacing.xs}`,
              whiteSpace: "nowrap",
            }}
          >
            {item}
          </span>
        );
        if (manage?.controls) {
          return (
            <manage.controls.RemovableChip key={index} listAbsoluteBinding={manage.listAbsoluteBinding} items={items} index={index}>
              {chip}
            </manage.controls.RemovableChip>
          );
        }
        return <Fragment key={index}>{chip}</Fragment>;
      })}
    </div>
  );
}

registerNodeType("List", ListNode);
export default ListNode;
