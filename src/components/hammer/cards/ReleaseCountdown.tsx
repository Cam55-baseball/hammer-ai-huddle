/**
 * ReleaseCountdown — Round 8 Step 1. Screen only; never changes the plan.
 * Counts down to the next local midnight (when tomorrow's plan shows) in the
 * player's own time zone. Uses the server clock (Date header) to correct a
 * wrong device clock, and Intl so daylight-saving days (23h/25h) are right.
 */
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

/** Local plan date (YYYY-MM-DD) of the instant `nowMs` in `tz`. */
export function localDateOf(nowMs: number, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(nowMs));
}

/** Same hour the daily job starts building tomorrow (wk-daily-plan-job PREBUILD_FROM_LOCAL_HOUR). */
export const PREBUILD_FROM_LOCAL_HOUR = 12;
const JOB_EVERY_MS = 10 * 60_000;

/**
 * What the release line may honestly say.
 *  - "ready": tomorrow's plan is already saved → count down to local midnight.
 *  - "building": not saved yet → count down to the expected build time
 *    (the later of local noon + one job run, and the next job run from now).
 *    Never counts down to a midnight with no plan behind it.
 */
export function releaseState(nowMs: number, tz: string, tomorrowBuilt: boolean):
  { kind: "ready"; ms: number } | { kind: "building"; ms: number; readyAt: number } {
  const toMidnight = msUntilLocalMidnight(nowMs, tz);
  if (tomorrowBuilt) return { kind: "ready", ms: toMidnight };
  const midnight = nowMs + toMidnight;
  const noon = midnight - (24 - PREBUILD_FROM_LOCAL_HOUR) * 3_600_000; // DST shifts happen near 02:00, not between noon and midnight
  const nextRun = Math.ceil((nowMs + 1) / JOB_EVERY_MS) * JOB_EVERY_MS;
  const readyAt = Math.max(noon + JOB_EVERY_MS, nextRun);
  return { kind: "building", ms: Math.max(0, readyAt - nowMs), readyAt };
}

function hms(ms: number) {
  const s = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function ReleaseCountdown({ timeZone }: { readonly timeZone?: string }) {
  const { user } = useAuth();
  const [profileTz, setProfileTz] = useState<string | null>(null);
  const tz = timeZone || profileTz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [now, setNow] = useState(() => Date.now());
  const [built, setBuilt] = useState<boolean | null>(null);
  const tomorrow = localDateOf(now + msUntilLocalMidnight(now, tz) + 60_000, tz);

  useEffect(() => {
    void loadSkew();
    const id = window.setInterval(() => setNow(Date.now() + skewMs), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user?.id || timeZone) return;
    void supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.timezone) setProfileTz(String(data.timezone)); });
  }, [user?.id, timeZone]);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    const check = async () => {
      const { count } = await supabase.from("wk_prescriptions").select("plan_date", { count: "exact", head: true })
        .eq("user_id", user.id).eq("plan_date", tomorrow);
      if (alive) setBuilt((count ?? 0) > 0);
    };
    void check();
    const id = window.setInterval(() => { if (!document.hidden) void check(); }, 60_000);
    return () => { alive = false; window.clearInterval(id); };
  }, [user?.id, tomorrow]);

  if (built === null) return null; // never show a countdown before we know a plan exists
  // Owner rule: plans are delivered at local midnight. The internal pre-build
  // time is never shown to players.
  const ms = msUntilLocalMidnight(now, tz);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground" data-release-countdown={built ? "ready" : "building"}>
      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{RELEASE_LINE}</span>
      <span className="font-mono font-semibold tabular-nums text-foreground" aria-label="Time until midnight">Time until midnight: {hms(ms)}</span>
    </div>
  );
}

/** The only plan-time wording players see. */
export const RELEASE_LINE = "Tomorrow's plan becomes visible at midnight";

function localToday(nowMs: number, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(nowMs));
}

/** Ms from now until 00:00 local on plan date `date` (DST-safe, server-clock corrected). */
export function msUntilLocalDate(nowMs: number, date: string, tz: string): number {
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${localToday(nowMs, tz)}T00:00:00Z`)) / 86_400_000);
  if (days <= 0) return 0;
  let t = nowMs;
  for (let i = 0; i < days; i++) t += msUntilLocalMidnight(t, tz) + (i < days - 1 ? 1 : 0);
  return t - nowMs + (days > 1 ? -(days - 1) : 0) + 0;
}

export function formatLeft(ms: number): string {
  const m = Math.round(ms / 60_000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  return h > 0 ? `${h}h ${m % 60}m` : `${m % 60}m`;
}

/** "Next lift in 1d 14h" — the date comes from the server's rule check only. */
export function NextReleaseLine({ label, date, timeZone }: { readonly label: string; readonly date: string | null | undefined; readonly timeZone?: string }) {
  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    void loadSkew();
    const id = window.setInterval(() => setNow(Date.now() + skewMs), 30_000);
    return () => window.clearInterval(id);
  }, []);
  if (!date) return <span>Not on today's plan.</span>;
  return <span data-next-release>{`Next ${label} in ${formatLeft(msUntilLocalDate(now, date, tz))}`}</span>;
}
