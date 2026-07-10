import type { SkillGroup } from "@/components/basic/skill-builder";
import { correspondPositionally, type EntryCorrespondence } from "./list-correspondence";

export type SkillGroupCorrespondence = EntryCorrespondence<SkillGroup> & {
  /** Only set for a `modified` or `unchanged` group — the chip-level correspondence within that matched pair. */
  chipCorrespondence?: EntryCorrespondence<string>[];
};

function skillGroupsEqual(a: SkillGroup, b: SkillGroup): boolean {
  return (a.category ?? "") === (b.category ?? "") && JSON.stringify(a.skills) === JSON.stringify(b.skills);
}

/**
 * Two-level version of the same positional-correspondence algorithm used for
 * repeater lists: first across the `SkillGroup[]` array by index, then again
 * across each matched pair's flat `skills: string[]` chips.
 */
export function correspondSkillGroups(
  oldGroups: SkillGroup[] | undefined,
  newGroups: SkillGroup[] | undefined
): SkillGroupCorrespondence[] {
  return correspondPositionally(oldGroups, newGroups, skillGroupsEqual).map((entry) => {
    if (entry.kind === "modified" || entry.kind === "unchanged") {
      return { ...entry, chipCorrespondence: correspondPositionally(entry.oldItem.skills, entry.newItem.skills) };
    }
    return entry;
  });
}
