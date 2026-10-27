/** A readable report is not a measured result. Missing values never become scores. */
export function unavailableAnalysis(module: string, stage: string) {
  return {
    efficiency_score: null,
    summary: [`${module.charAt(0).toUpperCase() + module.slice(1)} report: Not measured.`],
    feedback: "Not measured: this clip could not be fully checked. No measurements, grades or faults have been guessed. Your clip can be checked again.",
    positives: [], improvements: [], drills: [], violations_detected: {}, metrics: null,
    report_status: "not_measured", unavailable_stage: stage,
  };
}

/** Saved reports omit scores; missing measurements must not invalidate readable coaching. */
export function hasReadableReport(data: unknown): boolean {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const report = data as Record<string, unknown>;
  return typeof report.feedback === "string" && report.feedback.trim().length > 0 &&
    Array.isArray(report.summary) && report.summary.some((s: unknown) => typeof s === "string" && s.trim().length > 0) &&
    Array.isArray(report.drills);
}

/** A full coaching report: visible strengths, things to work on and drills. Never a refusal. */
export function hasFullCoachingReport(data: unknown): boolean {
  if (!hasReadableReport(data)) return false;
  const r = data as Record<string, unknown>;
  if (r.report_status === "not_measured") return false;
  const filled = (v: unknown) => Array.isArray(v) && v.length > 0;
  const lead = Array.isArray(r.summary) ? String(r.summary[0] ?? "") : "";
  if (/\bcould(?:n'?t| not) (?:judge|see|tell)\b/i.test(lead)) return false;
  const verifiedClean = typeof r.clean_reason === "string" && r.clean_reason.trim().length > 0 && filled(r.positives);
  return filled(r.drills) && (filled(r.improvements) || verifiedClean);
}

/** Parsed coaching arguments from a tool-call response, or null. */
export function coachingArgs(data: unknown): Record<string, unknown> | null {
  try {
    const d = data as { choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }> };
    const args = d?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    return args ? JSON.parse(args) : null;
  } catch { return null; }
}

/** Readable coaching output. A score is optional: coaching never depends on a number. */
export function hasStructuredAnalysis(data: unknown): boolean {
  return hasReadableReport(coachingArgs(data));
}

/** The provider returned a complete coaching report (strengths/work-ons and drills). */
export function hasFullCoaching(data: unknown): boolean {
  return hasFullCoachingReport(coachingArgs(data));
}

export function analysisRefused(data: unknown): boolean {
  const value = data as { choices?: Array<{ finish_reason?: string; message?: { refusal?: string; content?: string; tool_calls?: unknown[] } }> } | null;
  return value?.choices?.some(choice => /safety|content_filter|recitation|prohibited|blocklist/i.test(choice.finish_reason ?? "") || !!choice.message?.refusal) ?? false;
}

/** Attempt order: classic engine first, then today's direct route, then the backup. */
export const ANALYSIS_ROUTES = ["classic:google/gemini-2.5-flash", "google/gemini-2.5-flash", "openai/gpt-4o-mini"] as const;

export async function reliableAnalysis<T extends { ok: boolean; status: number; data: unknown; errorBody?: string }>(
  call: (model: string) => Promise<T>, record: (result: T) => Promise<void>,
  wait: () => Promise<void> = () => new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500)),
): Promise<T> {
  const recordSafely = async (attempt: T) => {
    try { await record(attempt); } catch { console.warn("[analysis] usage logging failed; report retry continues"); }
  };
  // Keep the best readable attempt: a thin report is retried, never thrown away.
  let best: T | null = null;
  let result: T | null = null;
  for (let i = 0; i < ANALYSIS_ROUTES.length; i++) {
    if (i > 0) await wait();
    result = await call(ANALYSIS_ROUTES[i]);
    await recordSafely(result);
    if (result.ok && hasFullCoaching(result.data)) return result;
    if (!best && result.ok && hasStructuredAnalysis(result.data)) best = result;
    // A refusal ends the request. Account/billing denials on one route never
    // retry the same route, but a backup route with its own access may still run.
    if (analysisRefused(result.data)) return best ?? result;
    if (!result.ok && result.status !== 429 && result.status < 500 && !(i === 0 && isRouteLocalFailure(result.status))) return best ?? result;
  }
  return best ?? (result as T);
}

/** Classic-route failures that today's direct route can still answer (its own credentials). */
function isRouteLocalFailure(status: number): boolean {
  return status === 401 || status === 402 || status === 403 || status === 404;
}
