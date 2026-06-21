import { describe, expect, it } from "vitest";
import {
  readinessSemanticClasses,
  readinessSemanticCircleClass,
  readinessSemanticRingClass,
  readinessSemanticTextClass,
} from "./readiness-display";

describe("readiness display helpers", () => {
  it("maps green/amber/red bands to semantic tokens", () => {
    expect(readinessSemanticTextClass("green")).toContain("conformant");
    expect(readinessSemanticTextClass("amber")).toContain("partial");
    expect(readinessSemanticTextClass("red")).toContain("gap");

    expect(readinessSemanticRingClass("green")).toContain("conformant");
    expect(readinessSemanticRingClass("amber")).toContain("partial");
    expect(readinessSemanticRingClass("red")).toContain("gap");

    expect(readinessSemanticCircleClass("green")).toContain("conformant");
    expect(readinessSemanticCircleClass("amber")).toContain("partial");
    expect(readinessSemanticCircleClass("red")).toContain("gap");
  });

  it("readinessSemanticClasses returns all slots", () => {
    const classes = readinessSemanticClasses("amber");
    expect(classes.text).toBe(readinessSemanticTextClass("amber"));
    expect(classes.ring).toBe(readinessSemanticRingClass("amber"));
    expect(classes.circle).toBe(readinessSemanticCircleClass("amber"));
  });
});
