const JOB_DIGEST = "92a0d7f956decec62aeaf2c309a150a936afda73572d8755f9b3999fc91325c9";
export async function validAnalysisJobToken(token: string | null) {
  if (!token) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const actual = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,"0")).join("");
  let difference = 0;
  for (let i=0;i<JOB_DIGEST.length;i++) difference |= actual.charCodeAt(i) ^ JOB_DIGEST.charCodeAt(i);
  return difference === 0;
}
export function canaryDelegationAllowed(config: { video_id: string; owner_id: string; enabled: boolean; paused_reason: string | null; lease_id: string | null; lease_until: string | null } | null, request: { videoId: string; userId: string; leaseId: string }, now = Date.now()) {
  return !!config?.enabled && !config.paused_reason && config.video_id === request.videoId && config.owner_id === request.userId && config.lease_id === request.leaseId && Date.parse(config.lease_until ?? "") > now;
}