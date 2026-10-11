/**
 * Spray chart data — one dot per batted ball, by the same exit_direction
 * codes the FieldDirectionPicker stores (LF, LCF, CF, RCF, RF, 3B, SS, 2B,
 * 1B, P, C). Pure: no Supabase, no React, so the report engine and tests
 * share it.
 */

export interface SprayBall {
  direction: string;
  /** batted_ball_type (grounder, line_drive, fly, popup …) or null */
  type: string | null;
}

/** x / y in a 200x200 viewBox, home plate bottom-center (same map as the picker). */
export const SPRAY_SPOTS: Record<string, { x: number; y: number }> = {
  LF: { x: 38, y: 52 },
  LCF: { x: 74, y: 33 },
  CF: { x: 100, y: 26 },
  RCF: { x: 126, y: 33 },
  RF: { x: 162, y: 52 },
  "3B": { x: 58, y: 108 },
  SS: { x: 78, y: 88 },
  "2B": { x: 122, y: 88 },
  "1B": { x: 142, y: 108 },
  P: { x: 100, y: 112 },
  C: { x: 100, y: 168 },
};

/**
 * Build the dot list from at-bat rows. Rows with no direction are skipped
 * (never fabricated — a missing direction stays missing).
 */
export function sprayBalls(
  atBats: Array<{ exit_direction?: unknown; batted_ball_type?: unknown }>,
): SprayBall[] {
  const out: SprayBall[] = [];
  for (const a of atBats) {
    const d = String(a.exit_direction ?? "").trim().toUpperCase();
    if (!d || !SPRAY_SPOTS[d]) continue;
    const t = String(a.batted_ball_type ?? "").trim();
    out.push({ direction: d, type: t || null });
  }
  return out;
}

/**
 * Deterministic offset so several balls to the same spot fan out instead of
 * stacking into one dot. Index is the ball's position among balls at that spot.
 */
export function sprayOffset(index: number): { dx: number; dy: number } {
  if (index === 0) return { dx: 0, dy: 0 };
  const angle = (index * 137.5 * Math.PI) / 180; // golden angle spread
  const r = 4 + 2 * Math.floor(index / 6);
  return { dx: Math.round(Math.cos(angle) * r), dy: Math.round(Math.sin(angle) * r) };
}
