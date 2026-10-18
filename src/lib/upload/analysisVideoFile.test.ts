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
  it("accepts phone M4V and 3GP exports without a MIME type", () => {
    expect(isAnalysisVideoFile({ name: "camera.m4v", type: "" })).toBe(true);
    expect(isAnalysisVideoFile({ name: "camera.3gp", type: "application/octet-stream" })).toBe(true);
  });
});