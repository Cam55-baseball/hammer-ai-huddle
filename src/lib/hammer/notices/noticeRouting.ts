/**
 * Step 24 item 2 — where a load or volume notice is allowed to appear.
 *
 * A notice only ever shows on the card it is about. A swing cap belongs on
 * the hitting card, a throwing note on the throwing card, and only genuinely
 * lift-related notices may sit on the lift card. Every notice, whatever its
 * subject, also shows in the "Before you start" drawer, where the athlete
 * checks it off as read.
 *
 * Pure and interpretive: it classifies text that generation already wrote.
 * It never authors a reason of its own.
 */

export type NoticeSurface = "lift" | "swing" | "throw" | "speed" | "jump" | "conditioning" | "day";

export interface Notice {
  reason: string;
  detail: string;
}

const RULES: Array<{ surface: NoticeSurface; test: RegExp }> = [
  { surface: "swing", test: /\bswing|swings|hitting|bat speed|bat-speed\b/i },
  { surface: "throw", test: /\bthrow|throwing|throws|pitch|pitching|arm care\b/i },
  { surface: "speed", test: /\bsprint|sprints|speed|yards|acceleration|max velocity\b/i },
  { surface: "jump", test: /\bjump|jumps|plyo|plyos|contacts\b/i },
  { surface: "conditioning", test: /\bconditioning|tempo run|aerobic\b/i },
  { surface: "lift", test: /\blift|lifts|lifting|hard sets|sets|squat|press|pull|deadlift\b/i },
];

/** Which card a single notice belongs on. Unknown subjects stay day-level. */
export function surfaceForNotice(notice: Notice | null | undefined): NoticeSurface {
  const text = `${notice?.reason ?? ""} ${notice?.detail ?? ""}`;
  for (const rule of RULES) if (rule.test.test(text)) return rule.surface;
  return "day";
}

/** The notices a given card is allowed to render. */
export function noticesForSurface(
  notices: ReadonlyArray<Notice> | null | undefined,
  surface: NoticeSurface,
): Notice[] {
  return (notices ?? []).filter((n) => surfaceForNotice(n) === surface);
}

/** Stable key used to remember that an athlete has read a notice today. */
export function noticeKey(planDate: string, notice: Notice): string {
  return `${planDate}|${notice.reason}|${notice.detail}`;
}
