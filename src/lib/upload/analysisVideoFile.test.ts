import { describe, it, expect } from "vitest";
import { isAnalysisVideoFile } from "./analysisVideoFile";
describe("analysis clip selection", () => {
  it("accepts MOV phone exports without a video MIME type", () => {
    expect(isAnalysisVideoFile({ name: "swing.mov", type: "" })).toBe(true);
    expect(isAnalysisVideoFile({ name: "swing.MOV", type: "application/octet-stream" })).toBe(true);
  });
  it("refuses non-video files", () => {
    expect(isAnalysisVideoFile({ name: "notes.txt", type: "" })).toBe(false);
    expect(isAnalysisVideoFile({ name: "notes.mov", type: "text/plain" })).toBe(false);
  });
});