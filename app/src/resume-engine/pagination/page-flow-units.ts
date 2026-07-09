import type { ListNodeProps, SectionNodeProps, TemplateNode } from "../types/template";
import type { ResumeData } from "../types/resume-data";
import type { RenderMode } from "../registry/node-registry";
import { resolveBinding } from "../binding/resolve-binding";
import { correspondPositionally, type EntryCorrespondence } from "../diff/list-correspondence";

export type PageFlowUnit =
  | { kind: "block"; key: string; node: TemplateNode }
  | { kind: "section-head"; key: string; sectionId: string; sectionNode: TemplateNode; listNode: TemplateNode }
  | {
      kind: "repeater-entry";
      key: string;
      sectionId: string;
      sectionNode: TemplateNode;
      listNode: TemplateNode;
      itemTemplate: TemplateNode;
      entryIndex: number;
      diffEntry?: EntryCorrespondence<unknown>;
    };

/**
 * Flattens the Page's top-level children into atomic page-flow units for the interactive
 * preview's client-side pagination. A Section with `avoidBreak === false` (Experience/
 * Education/Projects) is split into one "section-head" unit (title+border, no entries)
 * followed by one "repeater-entry" unit per array entry, so entries that fit stay on the
 * current page instead of the whole section jumping to the next one — mirroring the same
 * atomicity the PDF path gets from the `resume-engine-avoid-break` CSS class (see
 * SectionNodeProps.avoidBreak). Every other top-level child (Header, Divider, Summary,
 * Skills, and any repeater section with zero entries) is a single atomic "block" unit.
 */
export function buildPageFlowUnits(
  rootNode: TemplateNode,
  data: ResumeData,
  previousData: ResumeData | undefined,
  mode: RenderMode
): PageFlowUnit[] {
  const units: PageFlowUnit[] = [];

  for (const child of rootNode.children ?? []) {
    const sectionProps = child.type === "Section" ? (child.props as SectionNodeProps | undefined) : undefined;
    const listNode = sectionProps?.avoidBreak === false ? child.children?.find((c) => c.type === "List") : undefined;
    const itemTemplate = listNode ? (listNode.props as ListNodeProps | undefined)?.itemTemplate : undefined;

    if (!listNode || !itemTemplate) {
      units.push({ kind: "block", key: child.id, node: child });
      continue;
    }

    const newItems = resolveBinding(listNode.binding, data);
    const newArr = Array.isArray(newItems) ? newItems : [];

    let diffEntries: EntryCorrespondence<unknown>[] | undefined;
    let entryCount: number;
    if (mode === "diff") {
      const oldItems = resolveBinding(listNode.binding, previousData);
      diffEntries = correspondPositionally(Array.isArray(oldItems) ? oldItems : undefined, newArr);
      entryCount = diffEntries.length;
    } else {
      entryCount = newArr.length;
    }

    if (entryCount === 0) {
      units.push({ kind: "block", key: child.id, node: child });
      continue;
    }

    units.push({ kind: "section-head", key: `${child.id}-head`, sectionId: child.id, sectionNode: child, listNode });

    for (let entryIndex = 0; entryIndex < entryCount; entryIndex++) {
      units.push({
        kind: "repeater-entry",
        key: `${child.id}-entry-${entryIndex}`,
        sectionId: child.id,
        sectionNode: child,
        listNode,
        itemTemplate,
        entryIndex,
        diffEntry: diffEntries?.[entryIndex],
      });
    }
  }

  return units;
}
