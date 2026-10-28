import { hasReadableReport } from "../../../supabase/functions/_shared/analysisReliability";
import { isAnalysisType } from "../../../supabase/functions/_shared/analysisTypes";
import type { ReactNode } from "react";

const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : []);

/**
 * Render only the report supplied by the consent-scoped library endpoint.
 * Same written analysis as right after upload (owner P0, Oct 28): top
 * takeaway, key findings, what went well, corrections, how to check it, and
 * what the clip showed kept apart from inferred links to the athlete's data.
 * No grade line and no measurement wording.
 */
export function SavedAnalysisReport({ report, module, libraryMatches }: { report: any; module: unknown; libraryMatches?: ReactNode }) {
  if (!isAnalysisType(module) || !hasReadableReport(report)) return null;
  const summary = list(report.summary).filter((s) => !/^optional tip:/i.test(s.trim()));
  const [takeaway, ...findings] = summary;
  const observed = list(report.observed_in_clip);
  const connected = list(report.connected_to_your_data);
  return <section aria-label="Saved analysis report" className="space-y-4 break-words">
    <h3 className="font-semibold">Your analysis report</h3>
    {takeaway && <div><h4 className="font-medium">Top takeaway</h4><p className="text-sm">{takeaway}</p></div>}
    {findings.length > 0 && <div><h4 className="font-medium">Key findings</h4><ul className="list-disc pl-5 space-y-1 text-sm">{findings.map((value, i) => <li key={i}>{value}</li>)}</ul></div>}
    {report.feedback && <p className="text-sm whitespace-pre-wrap">{report.feedback}</p>}
    {list(report.positives).length > 0 && <div><h4 className="font-medium">What went well</h4><ul className="list-disc pl-5 text-sm">{list(report.positives).map((value, i) => <li key={i}>{value}</li>)}</ul></div>}
    {report.improvements?.length > 0 && <div className="space-y-3"><h4 className="font-medium">What to work on</h4>{report.improvements.map((item: any, i: number) => <div key={i} className="text-sm space-y-1"><p className="font-medium">{item.phase}: {item.fault}</p>{item.why && <p><span className="font-medium">Why it matters: </span>{item.why}</p>}{item.fix && <p><span className="font-medium">How to fix it: </span>{item.fix}</p>}</div>)}</div>}
    {typeof report.check_improvement === "string" && report.check_improvement.trim() && <div><h4 className="font-medium">How to check it's working</h4><p className="text-sm">{report.check_improvement}</p></div>}
    {observed.length > 0 && <div><h4 className="font-medium">What we saw in this clip</h4><ul className="list-disc pl-5 text-sm">{observed.map((value, i) => <li key={i}>{value}</li>)}</ul></div>}
    {connected.length > 0 && <div><h4 className="font-medium">How this may connect to you</h4><p className="text-xs text-muted-foreground">Our best read from your profile and logs — not something the clip showed.</p><ul className="list-disc pl-5 text-sm">{connected.map((value, i) => <li key={i}>{value}</li>)}</ul></div>}
    {report.clean_reason && <p className="text-sm">{report.clean_reason}</p>}
    {libraryMatches}
  </section>;
}
