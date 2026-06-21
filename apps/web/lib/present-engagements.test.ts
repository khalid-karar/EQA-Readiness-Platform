import { describe, expect, it } from "vitest";
import { buildEngagementsPresentation } from "./present-engagements";

describe("present-engagements", () => {
  it("groups demo working papers by reference with standard links", () => {
    const presentation = buildEngagementsPresentation("en", "cae");

    expect(presentation.engagements).toHaveLength(1);
    const engagement = presentation.engagements[0]!;
    expect(engagement.papers).toHaveLength(3);
    expect(engagement.papers.map((p) => p.reference)).toEqual([
      "WP-1.1",
      "WP-1.2",
      "WP-2.1",
    ]);

    const ethicsPaper = engagement.papers.find((p) => p.reference === "WP-1.1");
    expect(ethicsPaper?.standardNumbers).toEqual(["1.1"]);
    expect(ethicsPaper?.totalItemCount).toBe(3);
  });

  it("allows admin actions for operational roles only", () => {
    const cae = buildEngagementsPresentation("en", "cae");
    const board = buildEngagementsPresentation("en", "board");

    expect(cae.canRunAdminActions).toBe(true);
    expect(board.canRunAdminActions).toBe(false);
  });

  it("localizes engagement labels for Arabic", () => {
    const presentation = buildEngagementsPresentation("ar", "cae");
    expect(presentation.roleLabel.length).toBeGreaterThan(0);
    expect(presentation.engagements[0]?.papers[0]?.titleAr.length).toBeGreaterThan(
      0,
    );
  });
});
