// Owner Nov 10 (evening): only the scheduled job may start tcs-shadow-run.
// Accepts the existing Vault job credential (`wk_daily_plan_job_token`, sent as
// x-job-token; only its SHA-256 digest lives here, the same digest wk-daily-plan-job,
// renewal-reminders and intel-recheck-job check) or the service-role key as Bearer.
// The credential is never logged or echoed.

export const JOB_TOKEN_SHA256 = "92a0d7f956decec62aeaf2c309a150a936afda73572d8755f9b3999fc91325c9";

async function sha256Hex(v: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sameHex(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.min(a.length, b.length); i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function jobCallerAllowed(
  headers: Headers,
  serviceRoleKey: string | undefined,
  tokenDigest: string = JOB_TOKEN_SHA256,
): Promise<boolean> {
  const token = headers.get("x-job-token");
  if (token && sameHex(await sha256Hex(token), tokenDigest)) return true;
  const auth = headers.get("Authorization") ?? headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (bearer && serviceRoleKey && sameHex(await sha256Hex(bearer), await sha256Hex(serviceRoleKey))) return true;
  return false;
}
