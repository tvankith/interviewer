import { describe, expect, it } from "vitest";
import { packUnitsIntoPages, toMeasuredUnits, type MeasuredUnit } from "./pack-units";
import type { PageFlowUnit } from "./page-flow-units";
import type { ThemeDocument } from "../types/theme";
import type { TemplateNode } from "../types/template";

function block(key: string): MeasuredUnit {
  return { key, kind: "block", heightPx: 100, gapBeforePx: 0 };
}

function head(key: string, sectionId: string): MeasuredUnit {
  return { key, kind: "section-head", sectionId, heightPx: 30, gapBeforePx: 0 };
}

function entry(key: string, sectionId: string, heightPx: number, gapBeforePx = 0): MeasuredUnit {
  return { key, kind: "repeater-entry", sectionId, heightPx, gapBeforePx };
}

describe("packUnitsIntoPages", () => {
  it("keeps everything on one page when it all fits", () => {
    const pages = packUnitsIntoPages([block("a"), block("b")], 1000);
    expect(pages).toEqual([["a", "b"]]);
  });

  it("starts a new page when a unit doesn't fit", () => {
    const pages = packUnitsIntoPages([block("a"), block("b"), block("c")], 250);
    expect(pages).toEqual([
      ["a", "b"],
      ["c"],
    ]);
  });

  it("charges gapBeforePx for a non-first unit, splitting entries that would otherwise just fit", () => {
    // Two 100px entries with an 8px inter-entry gap: 100 + 8 + 100 = 208px, which a 200px
    // page can't hold (100 + 100 = 200 would fit if the gap were ignored).
    const pages = packUnitsIntoPages([entry("e1", "exp", 100, 8), entry("e2", "exp", 100, 8)], 200);
    expect(pages).toEqual([["e1"], ["e2"]]);
  });

  it("never charges a unit's gapBeforePx once it becomes first on a new page", () => {
    // Same 8px-gap entries on a 100px page: e2 is forced onto its own page by the first
    // split, and must not then also be charged its gap against that empty new page.
    const pages = packUnitsIntoPages([entry("e1", "exp", 100, 8), entry("e2", "exp", 100, 8)], 100);
    expect(pages).toEqual([["e1"], ["e2"]]);
  });

  it("pushes a section-head to the next page if its first entry wouldn't also fit alongside it", () => {
    // head(30) + entry(100) = 130 fits on a fresh 150px page, but not alongside the 100px
    // filler already on the current page (100 + 30 + 100 = 230 > 150).
    const pages = packUnitsIntoPages(
      [block("filler"), head("exp-head", "exp"), entry("exp-e0", "exp", 100)],
      150
    );
    expect(pages).toEqual([["filler"], ["exp-head", "exp-e0"]]);
  });

  it("keeps a section-head with its first entry when there is room for both", () => {
    const pages = packUnitsIntoPages([head("exp-head", "exp"), entry("exp-e0", "exp", 50)], 200);
    expect(pages).toEqual([["exp-head", "exp-e0"]]);
  });

  it("does not apply the orphan-head rule when there is no following unit to check against", () => {
    const pages = packUnitsIntoPages([block("filler"), head("edu-head", "edu")], 150);
    // "edu-head" fits in the remaining space (100 + 30 = 130 <= 150) and is the last unit,
    // so there's nothing to look ahead to — it stays put rather than being pushed forward.
    expect(pages).toEqual([["filler", "edu-head"]]);
  });

  it("places an oversized unit alone on its own page instead of dropping it", () => {
    const pages = packUnitsIntoPages([block("a"), block("huge")], 50);
    expect(pages).toEqual([["a"], ["huge"]]);
  });

  it("packs multiple full pages in order", () => {
    const units = [block("a"), block("b"), block("c"), block("d"), block("e")];
    const pages = packUnitsIntoPages(units, 250);
    expect(pages).toEqual([["a", "b"], ["c", "d"], ["e"]]);
  });
});

describe("toMeasuredUnits", () => {
  const theme = { spacing: { xs: "4px", sm: "8px", md: "14px", lg: "20px", xl: "32px" } } as ThemeDocument;
  const listNode: TemplateNode = { id: "experience-list", type: "List", props: { gap: "sm" } };
  const sectionNode: TemplateNode = { id: "experience-section", type: "Section", props: { title: "Experience", avoidBreak: false } };
  const itemTemplate: TemplateNode = { id: "experience-item", type: "Stack" };

  it("returns null when a unit's height hasn't been measured yet", () => {
    const units: PageFlowUnit[] = [{ kind: "block", key: "header", node: { id: "header", type: "Column" } }];
    expect(toMeasuredUnits(units, new Map(), theme)).toBeNull();
  });

  it("only charges gapBeforePx between two repeater entries of the same section, not head-to-entry", () => {
    const units: PageFlowUnit[] = [
      { kind: "section-head", key: "exp-head", sectionId: "experience-section", sectionNode, listNode },
      { kind: "repeater-entry", key: "exp-e0", sectionId: "experience-section", sectionNode, listNode, itemTemplate, entryIndex: 0 },
      { kind: "repeater-entry", key: "exp-e1", sectionId: "experience-section", sectionNode, listNode, itemTemplate, entryIndex: 1 },
    ];
    const heights = new Map([
      ["exp-head", 30],
      ["exp-e0", 100],
      ["exp-e1", 100],
    ]);

    const measured = toMeasuredUnits(units, heights, theme);
    expect(measured).not.toBeNull();
    expect(measured?.map((u) => u.gapBeforePx)).toEqual([0, 0, 8]);
  });
});
