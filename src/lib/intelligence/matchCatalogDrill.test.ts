import { describe, it, expect } from "vitest";
import { matchCatalogDrill } from "./addDoThisToPlan";
import { ELITE_DRILL_CATALOG } from "@/data/drills/eliteDrillCatalog";

describe("Do this → catalog drill (Item 7)", () => {
  it("keeps an exact catalog id", () => {
    const d = ELITE_DRILL_CATALOG.find(x => x.category === "hitting" && x.sports.includes("baseball"))!;
    expect(matchCatalogDrill({ id: d.id }, "Hitting", "baseball")?.id).toBe(d.id);
  });
  it("never matches across categories", () => {
    const d = ELITE_DRILL_CATALOG.find(x => x.category === "pitching")!;
    expect(matchCatalogDrill({ id: d.id, title: d.name }, "Hitting", "baseball")?.category ?? "hitting").toBe("hitting");
  });
  it("hides when no tags match", () => {
    expect(matchCatalogDrill({ title: "Zzz Qqq" }, "Hitting", "baseball")).toBeNull();
  });
});
