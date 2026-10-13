// Plan 4 D — AI cost tracking and the hourly fair-use limit.
// Rates are ESTIMATES in USD per 1M tokens. Gemini uses the owner's stated 2.5 Flash rates;
// check against the real Google/OpenAI bills.
export const AI_RATES: Record<string, { input: number; output: number }> = {
  gemini: { input: 0.30, output: 2.50 },
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4o": { input: 2.50, output: 10.0 },
};

export const HOURLY_ANALYSIS_LIMIT = 30;
export const HOURLY_LIMIT_MESSAGE =
  "You've reached 30 analyses this hour. Your video is saved and will be analyzed when the hour resets. You won't be charged.";

/** When the oldest analysis in the window leaves it, one slot opens. */
export function resumeAtFrom(oldestInWindowIso: string | null, now = Date.now()): string {
  const t = oldestInWindowIso ? new Date(oldestInWindowIso).getTime() + 3600_000 : now + 3600_000;
  return new Date(Math.max(t, now + 1000)).toISOString();
}

export async function hourlyResumeAt(admin: any, userId: string): Promise<string> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { data } = await admin.from("ai_usage_log").select("created_at").eq("user_id", userId)
    .not("analysis_type", "is", null).gte("created_at", since).order("created_at", { ascending: true }).limit(1).maybeSingle();
  return resumeAtFrom(data?.created_at ?? null);
}

export function rateFor(model: string) {
  const m = (model || "").toLowerCase();
  if (m.includes("gpt-4o-mini")) return AI_RATES["gpt-4o-mini"];
  if (m.includes("gpt-4o")) return AI_RATES["gpt-4o"];
  return AI_RATES.gemini;
}

export function estimateCostUsd(model: string, input: number, output: number): number {
  const r = rateFor(model);
  return Math.round(((input * r.input + output * r.output) / 1_000_000) * 1e6) / 1e6;
}

export function overHourlyLimit(countLastHour: number, limit = HOURLY_ANALYSIS_LIMIT) {
  return countLastHour >= limit;
}

/** Counts this account's analyses in the last hour. Errors count as 0 (never block on a read failure). */
export async function analysesLastHour(admin: any, userId: string): Promise<number> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count, error } = await admin.from("ai_usage_log").select("id", { count: "exact", head: true })
    .eq("user_id", userId).not("analysis_type", "is", null).gte("created_at", since);
  return error ? 0 : count ?? 0;
}

/** Writes one usage row. Never throws: cost logging must never cost an analysis. */
export async function logAiUsage(admin: any, row: {
  userId: string | null; functionName: string; analysisType?: string | null;
  result: { ok: boolean; provider: string; usage?: { model: string; input_tokens: number; output_tokens: number } };
}) {
  try {
    let plan = "player";
    if (row.userId) {
      const { data } = await admin.from("staff_plans").select("plan,status").eq("user_id", row.userId).maybeSingle();
      if (data && ["active", "trialing"].includes(data.status)) plan = data.plan;
    }
    const u = row.result.usage ?? { model: "", input_tokens: 0, output_tokens: 0 };
    await admin.from("ai_usage_log").insert({
      user_id: row.userId, function_name: row.functionName, analysis_type: row.analysisType ?? null,
      provider: row.result.provider, model: u.model || null, input_tokens: u.input_tokens, output_tokens: u.output_tokens,
      estimated_cost_usd: estimateCostUsd(u.model, u.input_tokens, u.output_tokens), plan, ok: row.result.ok,
    });
  } catch (e) {
    console.warn("[aiUsage] log failed", e instanceof Error ? e.message : e);
  }
}

/**
 * Cost logging for the smaller AI uses (help chat, base-stealing reps, at-bat swings, library tagging,
 * team plans). Finds the signed-in user from the request, if any. analysis_type stays null so these
 * never count toward the 30-per-hour analysis limit. Never throws.
 */
export async function logAiUsageForRequest(req: Request | null, functionName: string, result: Parameters<typeof logAiUsage>[1]["result"]) {
  try {
    const { createClient } = await import("npm:@supabase/supabase-js@2.57.2");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    let userId: string | null = null;
    const token = (req?.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (token) { const { data } = await admin.auth.getUser(token); userId = data.user?.id ?? null; }
    await logAiUsage(admin, { userId, functionName, analysisType: null, result });
  } catch (e) {
    console.warn("[aiUsage] request log failed", e instanceof Error ? e.message : e);
  }
}
