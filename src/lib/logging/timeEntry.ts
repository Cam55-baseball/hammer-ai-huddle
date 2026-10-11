/**
 * Time entry for activity logs. Players never type decimal minutes: every time
 * is entered in segments that fit the exercise and stored as seconds
 * (stopwatch times keep hundredths, i.e. 10 ms precision).
 */
export type TimeKind = "seconds" | "mmss" | "hmmss" | "sshh";

/** Pick the entry style from what is timed and the prescribed target (seconds). */
export function timeKindFor(opts: { stopwatch: boolean; targetSeconds: number | null | undefined }): TimeKind {
  if (opts.stopwatch) return "sshh";
  const t = opts.targetSeconds ?? 0;
  if (t >= 3600) return "hmmss";
  if (t > 90) return "mmss";
  return "seconds";
}

export type TimeSegments = string[];

/** Seconds → editable segments for the kind. Empty input stays empty. */
export function toSegments(kind: TimeKind, seconds: number | null | undefined): TimeSegments {
  const blank = kind === "seconds" ? [""] : kind === "hmmss" ? ["", "", ""] : ["", ""];
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return blank;
  if (kind === "seconds") return [String(Math.round(seconds))];
  if (kind === "sshh") {
    const cs = Math.round(seconds * 100);
    return [String(Math.floor(cs / 100)), String(cs % 100).padStart(2, "0")];
  }
  const whole = Math.round(seconds);
  if (kind === "mmss") return [String(Math.floor(whole / 60)), String(whole % 60).padStart(2, "0")];
  return [String(Math.floor(whole / 3600)), String(Math.floor((whole % 3600) / 60)).padStart(2, "0"), String(whole % 60).padStart(2, "0")];
}

/** Segments → seconds, or null when every segment is empty. */
export function fromSegments(kind: TimeKind, segs: TimeSegments): number | null {
  if (segs.every((s) => s.trim() === "")) return null;
  const n = (s: string | undefined) => { const v = Number((s ?? "").replace(/\D/g, "")); return Number.isFinite(v) ? v : 0; };
  if (kind === "seconds") return n(segs[0]);
  if (kind === "sshh") {
    const hh = (segs[1] ?? "").replace(/\D/g, "");
    const cs = hh === "" ? 0 : hh.length === 1 ? Number(hh) * 10 : Number(hh.slice(0, 2));
    return Math.round((n(segs[0]) * 100 + cs)) / 100;
  }
  if (kind === "mmss") return n(segs[0]) * 60 + Math.min(59, n(segs[1]));
  return n(segs[0]) * 3600 + Math.min(59, n(segs[1])) * 60 + Math.min(59, n(segs[2]));
}

/** Plain label for a target, e.g. "45 s", "2:30", "1:05:00", "4.50 s". */
export function formatTime(kind: TimeKind, seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "";
  const s = toSegments(kind, seconds);
  if (kind === "seconds") return `${s[0]} s`;
  if (kind === "sshh") return `${s[0]}.${s[1]} s`;
  return s.join(":");
}
