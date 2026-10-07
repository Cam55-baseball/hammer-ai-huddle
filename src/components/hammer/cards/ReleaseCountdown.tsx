/**
 * ReleaseCountdown — Round 8 Step 1. Screen only; never changes the plan.
 * Counts down to the next local midnight (when tomorrow's plan shows) in the
 * player's own time zone. Uses the server clock (Date header) to correct a
 * wrong device clock, and Intl so daylight-saving days (23h/25h) are right.
 */
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

/** Milliseconds until the next 00:00 in `timeZone`, from instant `nowMs`. */
export function msUntilLocalMidnight(nowMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(nowMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const elapsed = (get("hour") * 3600 + get("minute") * 60 + get("second")) * 1000 + (nowMs % 1000);
  // Step forward by the naive remainder, then correct for any DST shift.
  let target = nowMs + 86_400_000 - elapsed;
  for (let i = 0; i < 3; i++) {
    const p = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(target));
    const h = Number(p.find((x) => x.type === "hour")?.value ?? 0);
    const m = Number(p.find((x) => x.type === "minute")?.value ?? 0);
    const off = (h >= 12 ? h * 60 + m - 1440 : h * 60 + m) * 60_000;
    if (off === 0) break;
    target -= off;
  }
  return Math.max(0, target - nowMs);
}

let skewMs = 0;
let skewLoaded = false;
async function loadSkew() {
  if (skewLoaded || !SUPABASE_URL) return;
  skewLoaded = true;
  try {
    const t0 = Date.now();
    const r = await fetch(`${SUPABASE_URL}/auth/v1/health`, { method: "GET" });
    const d = r.headers.get("date");
    if (d) skewMs = new Date(d).getTime() + (Date.now() - t0) / 2 - Date.now();
  } catch { /* offline: use device clock */ }
}

export function ReleaseCountdown({ timeZone }: { readonly timeZone?: string }) {
  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [left, setLeft] = useState(() => msUntilLocalMidnight(Date.now(), tz));
  useEffect(() => {
    void loadSkew();
    const id = window.setInterval(() => setLeft(msUntilLocalMidnight(Date.now() + skewMs, tz)), 1000);
    return () => window.clearInterval(id);
  }, [tz]);
  const s = Math.floor(left / 1000);
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground" data-release-countdown>
      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>Tomorrow's plan opens in</span>
      <span className="font-mono font-semibold tabular-nums text-foreground">{pad(hh)}:{pad(mm)}:{pad(ss)}</span>
    </div>
  );
}
