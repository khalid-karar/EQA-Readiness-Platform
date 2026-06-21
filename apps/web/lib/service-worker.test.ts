import { describe, expect, it } from "vitest";
import { shouldRegisterServiceWorker } from "./service-worker";

describe("shouldRegisterServiceWorker", () => {
  it("registers only in production", () => {
    expect(shouldRegisterServiceWorker("production")).toBe(true);
    expect(shouldRegisterServiceWorker("development")).toBe(false);
    expect(shouldRegisterServiceWorker("test")).toBe(false);
    expect(shouldRegisterServiceWorker(undefined)).toBe(false);
  });
});
