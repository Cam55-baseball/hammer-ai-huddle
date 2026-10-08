import { describe, expect, it } from "vitest";
import { triggerChunkReload } from "./lazyWithRetry";

describe("chunk recovery", () => {
  it("never reloads or replaces the current screen", () => {
    expect(triggerChunkReload("test")).toBe(false);
  });
});