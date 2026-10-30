import { describe, it, expect } from "vitest";
import { capAnalysisVideos } from "./analysisVideoCap";

const id = (v: string) => v;
describe("analysis video cap", () => {
  it("shows at most 3", () => expect(capAnalysisVideos(["a", "b", "c", "d", "e"], id, new Set(), new Set())).toHaveLength(3));
  it("skips watched while unwatched variety remains", () =>
    expect(capAnalysisVideos(["a", "b", "c", "d", "e"], id, new Set(["a", "b"]), new Set())).toEqual(["c", "d", "e"]));
  it("refills with watched only when variety runs out", () =>
    expect(capAnalysisVideos(["a", "b", "c"], id, new Set(["a"]), new Set())).toEqual(["b", "c", "a"]));
  it("allows at most one saved video, even if watched", () =>
    expect(capAnalysisVideos(["s1", "s2", "x", "y"], id, new Set(["s1"]), new Set(["s1", "s2"]))).toEqual(["s1", "x", "y"]));
});
