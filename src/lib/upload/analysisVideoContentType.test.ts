import { describe, expect, it } from "vitest";
import { analysisVideoContentType } from "./analysisVideoFile";

describe("analysisVideoContentType", () => {
  it("uploads an untyped iPhone .MOV as video/quicktime", () => {
    expect(analysisVideoContentType({ name: "IMG_7346.MOV", type: "" })).toBe("video/quicktime");
    expect(analysisVideoContentType({ name: "clip.mov", type: "application/octet-stream" })).toBe("video/quicktime");
  });
  it("keeps a type storage already accepts", () => {
    expect(analysisVideoContentType({ name: "x.mov", type: "video/mp4" })).toBe("video/mp4");
  });
  it("maps other phone clips to an accepted type", () => {
    expect(analysisVideoContentType({ name: "a.m4v", type: "video/x-m4v" })).toBe("video/mp4");
    expect(analysisVideoContentType({ name: "a.webm", type: "" })).toBe("video/webm");
  });
});

describe("withAnalysisVideoType", () => {
  it("relabels an untyped .MOV without changing its bytes", async () => {
    const { withAnalysisVideoType } = await import("./analysisVideoFile");
    const original = new File([new Uint8Array([1, 2, 3])], "IMG_1.MOV", { type: "" });
    const labelled = withAnalysisVideoType(original);
    expect(labelled.type).toBe("video/quicktime");
    expect(new Uint8Array(await labelled.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });
});
