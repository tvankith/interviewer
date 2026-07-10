import { describe, expect, it } from "vitest";
import { reconcileProposal } from "./reconcile-proposal";

describe("reconcileProposal", () => {
  it("includes an accepted scalar field's proposed value", () => {
    const { patch, outcome } = reconcileProposal(
      { location: "Remote" },
      { location: "Bangalore" },
      { location: "accepted" }
    );
    expect(patch).toEqual({ location: "Remote" });
    expect(outcome).toEqual([{ unit: "location", status: "accepted" }]);
  });

  it("omits a rejected scalar field entirely, leaving the current value untouched", () => {
    const { patch, outcome } = reconcileProposal(
      { location: "Remote" },
      { location: "Bangalore" },
      { location: "rejected" }
    );
    expect(patch).toEqual({});
    expect(outcome).toEqual([{ unit: "location", status: "rejected" }]);
  });

  it("treats an untouched (pending) scalar field as rejected", () => {
    const { patch, outcome } = reconcileProposal({ title: "Staff Engineer" }, { title: "Engineer" }, {});
    expect(patch).toEqual({});
    expect(outcome).toEqual([{ unit: "title", status: "rejected" }]);
  });

  it("reconstructs a list field from a mix of accepted modify/add and a rejected remove", () => {
    // experiences[0] modified, experiences[1] removed, experiences[2] added —
    // matches the spec scenario "Partial acceptance within one list field".
    const current = {
      experiences: [
        { company: "Google", role: "SWE" },
        { company: "Meta", role: "Intern" },
      ],
    };
    const proposed = {
      experiences: [
        { company: "Google", role: "Sr. SWE" },
        { company: "Acme", role: "Founder" },
      ],
    };

    const { patch, outcome } = reconcileProposal(proposed, current, {
      "experiences.0": "accepted",
      "experiences.1": "rejected",
      "experiences.2": "accepted",
    });

    expect(patch.experiences).toEqual([
      { company: "Google", role: "Sr. SWE" },
      { company: "Meta", role: "Intern" },
      { company: "Acme", role: "Founder" },
    ]);
    expect(outcome).toEqual(
      expect.arrayContaining([
        { unit: "experiences.0", status: "accepted" },
        { unit: "experiences.1", status: "rejected" },
        { unit: "experiences.2", status: "accepted" },
      ])
    );
  });

  it("omits a list field entirely when none of its entries were accepted", () => {
    const current = { links: [{ url: "a", social_media: "GitHub" }] };
    const proposed = { links: [{ url: "b", social_media: "GitHub" }] };

    const { patch } = reconcileProposal(proposed, current, { "links.0": "rejected" });
    expect(patch).not.toHaveProperty("links");
  });

  it("excludes an entry from the reconciled array when its removal is accepted", () => {
    const current = { links: [{ url: "a" }, { url: "b" }] };
    const proposed = { links: [{ url: "a" }] };

    const { patch } = reconcileProposal(proposed, current, { "links.1": "accepted" });
    expect(patch.links).toEqual([{ url: "a" }]);
  });

  it("excludes an added entry from the reconciled array when its addition is rejected, alongside an accepted change elsewhere", () => {
    const current = { links: [{ url: "a" }, { url: "old-b" }] };
    const proposed = { links: [{ url: "a-changed" }, { url: "old-b" }, { url: "c" }] };

    const { patch } = reconcileProposal(proposed, current, {
      "links.0": "accepted",
      "links.2": "rejected",
    });
    expect(patch.links).toEqual([{ url: "a-changed" }, { url: "old-b" }]);
  });
});
