import { hasReadableReport } from "./analysisReliability.ts";
import { isAnalysisType } from "./analysisTypes.ts";
/** Library visibility may be committed only after the existing video/report pair is readable. */
export function canSaveLibraryPair(clip: { video_url?: unknown; module?: unknown; ai_analysis?: unknown } | null, requireAnalysis: boolean): boolean {
  return Boolean(clip && typeof clip.video_url === "string" && clip.video_url.length > 0 &&
    (!requireAnalysis || (isAnalysisType(clip.module) && hasReadableReport(clip.ai_analysis))));
}