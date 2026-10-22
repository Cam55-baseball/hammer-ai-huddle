import { describe, it, expect } from "vitest";
import { canSeeCatalogRow, catalogVisibilityFilter } from "./testOnlyVisibility";

describe("TEST-only catalog visibility", () => {
  const testOnly = { visible_to: ["test-a"] };
  it("hides a TEST-only item from a normal player", () => {
    expect(canSeeCatalogRow(testOnly, "real-player")).toBe(false);
  });
  it("hides a TEST-only item when signed out", () => {
    expect(canSeeCatalogRow(testOnly, null)).toBe(false);
  });
  it("shows it to a listed TEST account", () => {
    expect(canSeeCatalogRow(testOnly, "test-a")).toBe(true);
  });
  it("shows ordinary items to everyone", () => {
    expect(canSeeCatalogRow({ visible_to: null }, "real-player")).toBe(true);
  });
  it("server filter never widens for signed-out viewers", () => {
    expect(catalogVisibilityFilter(null)).toBe("visible_to.is.null");
  });
});
