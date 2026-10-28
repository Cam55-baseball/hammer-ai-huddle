import { describe, expect, it } from "vitest";
import { ANALYSIS_DID_NOT_FINISH, TEMPORARY_UPLOAD_HOURS, temporaryUploadUntil } from "./temporaryUpload";
import { classicFrameTimestamps } from "@/lib/frameExtraction";
import { readWrittenReportFields } from "../../../supabase/functions/analyze-video/writtenReport";

describe("owner P0 Oct 28 — temporary uploads and the written analysis", () => {
  it("unsaved analysis uploads expire 24 hours after upload", () => {
    expect(TEMPORARY_UPLOAD_HOURS).toBe(24);
    expect(temporaryUploadUntil(new Date("2026-10-28T10:00:00Z"))).toBe("2026-10-29T10:00:00.000Z");
  });

  it("a failed analysis says only the plain retry line", () => {
    expect(ANALYSIS_DID_NOT_FINISH).toBe("Your analysis didn't finish. Tap Retry.");
  });

  it("samples the original 7 pictures at 10/25/40/50/60/75/90% of the clip", () => {
    expect(classicFrameTimestamps(10)).toEqual([1, 2.5, 4, 5, 6, 7.5, 9]);
  });

  it("samples around a marked landing at −0.4…+0.3 s", () => {
    expect(classicFrameTimestamps(10, 5).map((t) => Math.round(t * 10) / 10)).toEqual([4.6, 4.8, 4.9, 5, 5.1, 5.2, 5.3]);
  });

  it("keeps how-to-check and observed vs inferred sections apart", () => {
    const r = readWrittenReportFields({ check_improvement: " 5 tee swings ", observed_in_clip: ["Head stays still"], connected_to_your_data: ["Your goal is power"] });
    expect(r).toEqual({ check_improvement: "5 tee swings", observed_in_clip: ["Head stays still"], connected_to_your_data: ["Your goal is power"] });
  });
});
