import { memoize } from "./types";

export type ShareScope = "private" | "coach" | "org" | "external";

export interface ShareState {
  scope: ShareScope;
  granted: boolean;
  exports: Array<{ eventId: string; occurredAt: string }>;
  lastSource: string | null;
}
const PREFIXES = ["share."];

export const buildShareState = memoize<ShareState>((rows) => {
  let scope: ShareScope = "private";
  let granted = false;
  let lastSource: string | null = null;
  const exports: ShareState["exports"] = [];
  for (const r of rows) {
    const p = r.payload as { scope?: ShareScope } | undefined;
    if (r.topic_id === "share.scope_changed" && p?.scope) {
      scope = p.scope;
      lastSource = r.event_id;
    }
    if (r.topic_id === "share.granted") { granted = true; lastSource = r.event_id; }
    if (r.topic_id === "share.revoked") { granted = false; lastSource = r.event_id; }
    if (r.topic_id === "share.export_generated") {
      exports.push({ eventId: r.event_id, occurredAt: r.occurred_at });
      lastSource = r.event_id;
    }
  }
  return { scope, granted, exports, lastSource };
});

export function shareState(rows: Parameters<typeof buildShareState>[0], scope: Parameters<typeof buildShareState>[1]) {
  return buildShareState(rows, scope, PREFIXES);
}
