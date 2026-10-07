/**
 * Step 9 — program retirement redirects. Switched ON by the owner 2026-10-07.
 * Only the page addresses redirect; menu items, pricing/help text and data are
 * untouched (those need a separate owner OK). Nothing is deleted.
 * Destinations are the daily plan, which now holds each program's content.
 */
export const PROGRAM_REDIRECTS_ENABLED = true as const;

export const PROGRAM_REDIRECT_TARGET = "/my-daily-game-plan";

export const PROGRAM_REDIRECTS: ReadonlyArray<{ from: string; to: string; program: string; card: string }> = [
  { from: "/speed-lab", to: PROGRAM_REDIRECT_TARGET, program: "Speed Lab", card: "Speed card" },
  { from: "/explosive-conditioning", to: PROGRAM_REDIRECT_TARGET, program: "Explosive Conditioning", card: "Conditioning card" },
  { from: "/the-unicorn", to: PROGRAM_REDIRECT_TARGET, program: "The Unicorn", card: "Lift card" },
  { from: "/production-lab", to: PROGRAM_REDIRECT_TARGET, program: "Iron Bambino", card: "Lift card" },
  { from: "/production-studio", to: PROGRAM_REDIRECT_TARGET, program: "Heat Factory", card: "Throwing card" },
];

export function programRedirectFor(path: string): string | null {
  if (!PROGRAM_REDIRECTS_ENABLED) return null;
  return PROGRAM_REDIRECTS.find((r) => r.from === path)?.to ?? null;
}
