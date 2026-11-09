/**
 * Release A3 (owner Nov 9): real logging times for Apple Health workouts, recorded on this phone at
 * the moment each set or drill is logged (focus mode and the normal loggers share these save paths).
 * Kept tiny and import-light: the website's log save paths call noteWorkTime, which does nothing
 * unless this is the iPhone app with healthkit_write_v1 on and the player's save switch on.
 */
import { isNativeIos, nativeFlagOn } from "./nativeFlags";

export type TimeSpan = { first: number; last: number };

let switchMemo: { uid: string; on: boolean } | null = null;

/** Mirrors the per-phone "Save my Hammers workouts to Apple Health" switch (set by healthWorkouts.ts). */
export function setJournalSwitch(userId: string | null, on: boolean) {
  switchMemo = userId ? { uid: userId, on } : null;
}

export function healthWriteJournalOn(userId: string | null | undefined): boolean {
  return !!userId && isNativeIos() && nativeFlagOn("healthkit_write_v1") && switchMemo?.uid === userId && switchMemo.on;
}

const journalKey = (uid: string) => `hm.hw.times.v1.${uid}`;
type Journal = Record<string, Record<string, [number, number]>>;

function readJournal(uid: string): Journal {
  try { const v = JSON.parse(localStorage.getItem(journalKey(uid)) ?? "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}

/** Never throws; records nothing unless saving to Apple Health is on. */
export function noteWorkTime(userId: string | null | undefined, planDate: string | null | undefined, key: string | null | undefined, at = Date.now()): void {
  try {
    if (!userId || !planDate || !key || !healthWriteJournalOn(userId)) return;
    const all = readJournal(userId);
    const day = all[planDate] ?? {};
    const cur = day[key];
    day[key] = cur ? [Math.min(cur[0], at), Math.max(cur[1], at)] : [at, at];
    all[planDate] = day;
    const pruned: Journal = {};
    for (const d of Object.keys(all).sort().slice(-4)) pruned[d] = all[d];
    localStorage.setItem(journalKey(userId), JSON.stringify(pruned));
  } catch { /* storage unavailable: that card is simply skipped later */ }
}

export function workTimes(userId: string, planDate: string, keys: readonly string[]): TimeSpan[] {
  const day = readJournal(userId)[planDate] ?? {};
  return keys.map((k) => day[k]).filter((v): v is [number, number] => Array.isArray(v)).map(([first, last]) => ({ first, last }));
}
