import { hasReadableReport } from "../../../supabase/functions/_shared/analysisReliability";
import { isAnalysisType } from "../../../supabase/functions/_shared/analysisTypes";
import { VIDEO_GRADE_PLACEHOLDER } from "@/lib/reportCard/visibility";
/** Render only the report supplied by the consent-scoped library endpoint. */
export function SavedAnalysisReport({ report, module }: { report: any; module: unknown }) {
  if (!isAnalysisType(module) || !hasReadableReport(report)) return null;
  return <section aria-label="Saved analysis report" className="space-y-4 break-words">
    <h3 className="font-semibold">Your analysis report</h3>
    <p className="text-sm text-muted-foreground">Grade: {VIDEO_GRADE_PLACEHOLDER}</p>
    <ul className="list-disc pl-5 space-y-1 text-sm">{report.summary.map((value: string, i: number) => <li key={i}>{value}</li>)}</ul>
    <p className="text-sm whitespace-pre-wrap">{report.feedback}</p>
    {report.positives?.length > 0 && <div><h4 className="font-medium">What went well</h4><ul className="list-disc pl-5 text-sm">{report.positives.map((value: string, i: number) => <li key={i}>{value}</li>)}</ul></div>}
    {report.improvements?.length > 0 && <div className="space-y-3"><h4 className="font-medium">What to work on</h4>{report.improvements.map((item: any, i: number) => <div key={i} className="text-sm space-y-1"><p className="font-medium">{item.phase}: {item.fault}</p><p>{item.why}</p><p>{item.fix}</p></div>)}</div>}
    {report.clean_reason && <p className="text-sm">{report.clean_reason}</p>}
  </section>;
}