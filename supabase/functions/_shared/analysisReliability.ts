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

export function hasStructuredAnalysis(data: unknown): boolean {
  try {
    const d = data as { choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }> };
    const args = d?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return false;
    const report = JSON.parse(args);
    return typeof report.feedback === "string" && report.feedback.trim().length > 0 &&
      Array.isArray(report.summary) && report.summary.some((s: unknown) => typeof s === "string" && s.trim()) &&
      typeof report.efficiency_score === "number" && Number.isFinite(report.efficiency_score) && Array.isArray(report.drills);
  } catch { return false; }
}

export async function reliableAnalysis<T extends { ok: boolean; status: number; data: unknown }>(
  call: (model: string) => Promise<T>, record: (result: T) => Promise<void>,
): Promise<T> {
  let result = await call("google/gemini-2.5-flash");
  const recordSafely = async (attempt: T) => {
    try { await record(attempt); } catch { console.warn("[analysis] usage logging failed; report retry continues"); }
  };
  await recordSafely(result);
  if (result.ok && hasStructuredAnalysis(result.data)) return result;
  if ([400, 401, 402, 403].includes(result.status)) return result;
  result = await call("google/gemini-2.5-flash");
  await recordSafely(result);
  if (result.ok && hasStructuredAnalysis(result.data)) return result;
  if ([400, 401, 402, 403].includes(result.status)) return result;
  result = await call("openai/gpt-4o-mini");
  await recordSafely(result);
  return result;
}