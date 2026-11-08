/**
 * Apple Push Notification service (APNs) sender — pure, testable core.
 * Token auth (ES256 provider JWT from the .p8 key) over HTTP/2.
 *
 * Rules (owner Nov 8):
 *  - TestFlight / App Store tokens use PRODUCTION first.
 *  - BadDeviceToken → retry SANDBOX once; the environment that worked is remembered.
 *  - 410 / Unregistered → the token is disabled.
 *  - Auth problems (403 InvalidProviderToken etc.) never disable tokens.
 */
export type ApnsEnv = "production" | "sandbox";

export const APNS_HOSTS: Record<ApnsEnv, string> = {
  production: "https://api.push.apple.com",
  sandbox: "https://api.sandbox.push.apple.com",
};

export interface PushMessage { title: string; body: string; link: string }
export interface PushToken { id: string; token: string; apns_env: ApnsEnv | null }

export type SendOutcome =
  | { tokenId: string; status: "sent"; env: ApnsEnv; envChanged: boolean }
  | { tokenId: string; status: "disabled"; reason: string }
  | { tokenId: string; status: "failed"; error: string };

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) =>
  Promise<{ status: number; text: () => Promise<string> }>;

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** The APNs JSON body. `link` is a custom key the app reads when the push is tapped. */
export function apnsPayload(m: PushMessage) {
  return {
    aps: { alert: { title: clip(m.title, 120), body: clip(m.body, 300) }, sound: "default" },
    link: m.link,
  };
}

/** Accepts the .p8 text with real line breaks, escaped "\n", or all on one line. */
export function normalizePem(raw: string): string {
  const s = raw.replace(/\\n/g, "\n").trim();
  const m = s.match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/);
  const body = (m ? m[1] : s).replace(/[^A-Za-z0-9+/=]/g, "");
  const lines = body.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join("\n")}\n-----END PRIVATE KEY-----\n`;
}

function reasonOf(text: string): string {
  try { return String(JSON.parse(text)?.reason ?? ""); } catch { return ""; }
}

/** Send one message to one device token, following the environment rules above. */
export async function sendToToken(
  fetchFn: FetchLike, jwt: string, topic: string, tok: PushToken, msg: PushMessage,
): Promise<SendOutcome> {
  const order: ApnsEnv[] = tok.apns_env === "sandbox" ? ["sandbox", "production"] : ["production", "sandbox"];
  const body = JSON.stringify(apnsPayload(msg));
  let last = "";
  for (let i = 0; i < order.length; i++) {
    const env = order[i];
    const res = await fetchFn(`${APNS_HOSTS[env]}/3/device/${tok.token}`, {
      method: "POST",
      headers: {
        authorization: `bearer ${jwt}`,
        "apns-topic": topic,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      },
      body,
    });
    if (res.status === 200) {
      await res.text().catch(() => "");
      return { tokenId: tok.id, status: "sent", env, envChanged: env !== tok.apns_env };
    }
    const text = await res.text().catch(() => "");
    const reason = reasonOf(text);
    if (res.status === 410 || reason === "Unregistered") return { tokenId: tok.id, status: "disabled", reason: "Unregistered" };
    if (reason === "BadDeviceToken" && i === 0) { last = "BadDeviceToken"; continue; }
    return { tokenId: tok.id, status: "failed", error: `${res.status} ${reason || text.slice(0, 120)}`.trim() };
  }
  return { tokenId: tok.id, status: "failed", error: `${last} in both environments` };
}

/** Provider tokens may be reused for up to 60 minutes; Apple rejects refreshing more than once every 20. */
export function makeProviderTokenCache(sign: () => Promise<string>, now: () => number = Date.now) {
  let cached: { jwt: string; at: number } | null = null;
  return async (): Promise<string> => {
    if (cached && now() - cached.at < 40 * 60_000) return cached.jwt;
    cached = { jwt: await sign(), at: now() };
    return cached.jwt;
  };
}
