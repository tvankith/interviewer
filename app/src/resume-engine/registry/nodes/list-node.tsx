import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { registerNodeType, RenderNode, getListControls, type NodeComponentProps, type BindingScope } from "../node-registry";
import { resolveBinding, toAbsoluteBinding } from "../../binding/resolve-binding";
import type { ListNodeProps, TemplateNode } from "../../types/template";

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

function ListNode({ node, scope, resumeData, theme, mode }: NodeComponentProps) {
  const props = (node.props as ListNodeProps) || {};
  const items = node.binding ? resolveBinding(node.binding, scope.value) : undefined;
  const listAbsoluteBinding = node.binding ? toAbsoluteBinding(scope.absolutePath, node.binding) : undefined;

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
        <div className={node.className} style={{ fontSize: theme.sizes.small, color: theme.colors.muted, fontStyle: "italic" }}>
          {props.placeholder ?? "Click to add"}
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
          const itemScope: BindingScope = {
            value: item,
            absolutePath: `${listAbsoluteBinding}.${index}`,
          };
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
        {manage?.controls && (
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
    <div className={cn("flex flex-wrap", node.className)} style={{ gap: theme.spacing.xs }}>
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
