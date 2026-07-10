import { describe, expect, it } from "vitest";
import { correspondPositionally } from "./list-correspondence";
import { correspondSkillGroups } from "./skill-group-correspondence";

describe("correspondPositionally", () => {
  it("marks equal entries at the same index as unchanged", () => {
    const result = correspondPositionally(["a", "b"], ["a", "b"]);
    expect(result).toEqual([
      { kind: "unchanged", index: 0, oldItem: "a", newItem: "a" },
      { kind: "unchanged", index: 1, oldItem: "b", newItem: "b" },
    ]);
  });

  it("marks a differing entry at the same index as modified", () => {
    const result = correspondPositionally(
      [{ role: "SWE", company: "Google" }],
      [{ role: "Sr. SWE", company: "Google" }]
    );
    expect(result).toEqual([
      {
        kind: "modified",
        index: 0,
        oldItem: { role: "SWE", company: "Google" },
        newItem: { role: "Sr. SWE", company: "Google" },
      },
    ]);
  });

  it("treats extra trailing entries in the new array as added", () => {
    const result = correspondPositionally(["a"], ["a", "b"]);
    expect(result[1]).toEqual({ kind: "added", index: 1, newItem: "b" });
  });

  it("treats an index beyond the shorter (new) array's length as removed", () => {
    const result = correspondPositionally(["a", "b", "c"], ["a", "c"]);
    expect(result[2]).toEqual({ kind: "removed", index: 2, oldItem: "c" });
  });

  it("treats an empty old array as every new entry being added", () => {
    const result = correspondPositionally(undefined, ["a", "b"]);
    expect(result).toEqual([
      { kind: "added", index: 0, newItem: "a" },
      { kind: "added", index: 1, newItem: "b" },
    ]);
  });

  it("treats an empty new array as every old entry being removed", () => {
    const result = correspondPositionally(["a", "b"], undefined);
    expect(result).toEqual([
      { kind: "removed", index: 0, oldItem: "a" },
      { kind: "removed", index: 1, oldItem: "b" },
    ]);
  });
});

describe("correspondSkillGroups", () => {
  it("adds chip-level correspondence for a matched group pair", () => {
    const result = correspondSkillGroups(
      [{ category: "Languages", skills: ["Python"] }],
      [{ category: "Languages", skills: ["Python", "Go"] }]
    );
    expect(result[0].kind).toBe("modified");
    expect(result[0].chipCorrespondence).toEqual([
      { kind: "unchanged", index: 0, oldItem: "Python", newItem: "Python" },
      { kind: "added", index: 1, newItem: "Go" },
    ]);
  });

  it("marks a whole new group beyond the old array's length as added, with no chip correspondence", () => {
    const result = correspondSkillGroups(
      [{ category: "Languages", skills: ["Python"] }],
      [
        { category: "Languages", skills: ["Python"] },
        { category: "Cloud", skills: ["AWS"] },
      ]
    );
    expect(result[1]).toEqual({ kind: "added", index: 1, newItem: { category: "Cloud", skills: ["AWS"] } });
  });
});
