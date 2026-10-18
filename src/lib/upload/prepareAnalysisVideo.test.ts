import { describe, expect, it } from "vitest";
import { analysisConversionArgs } from "./prepareAnalysisVideo";

describe("phone video conversion", () => {
  it("creates H264 without fabricating extra frames or trimming the source", () => {
    const args = analysisConversionArgs("original.MOV", "analysis.mp4");
    expect(args.slice(0, 2)).toEqual(["-i", "original.MOV"]);
    expect(args[args.indexOf("-c:v") + 1]).toBe("libx264");
    expect(args[args.indexOf("-fps_mode") + 1]).toBe("passthrough");
    expect(args).not.toContain("-r");
    expect(args.join(" ")).not.toContain("minterpolate");
    expect(args).not.toContain("-t");
  });
});
