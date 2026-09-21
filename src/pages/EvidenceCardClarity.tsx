/**
 * Dev-only evidence page — Step 21 card clarity.
 *
 * Renders a real movement card and a real lift card from fixture rows so the
 * fixes can be photographed at phone width:
 *   A. "Do this after your skill work" appears on the lift card only.
 *   D1. Cue sits above "Why this movement".
 *   D2. No "Block 36 · Week 2" chip — athlete words only.
 *   D3. No empty headings.
 *   D4. "Why reduced today" only when something was actually reduced.
 */
import { WkPrescriptionCard } from "@/components/hammer/WkPrescriptionCard";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";

const base = {
  plan_date: "2026-03-02",
  status: "pending",
  sets: 4,
  reps: 5,
  intensity: "RPE 7",
  rest_seconds: 150,
  sequence_order: 1,
  sequence_role: "primary_lower",
  engine: "lift",
} as const;

const why = {
  today: "Heavy lower day — you slept 8h and reported no soreness.",
  why_this: "Trap bar pulls build the hip drive that turns into ground force at foot strike.",
  progression: {
    block_number: 36,
    week_in_block: 2,
    block_phase: "intensify",
    is_deload_week: false,
    session_title: "Block 36 · Week 2 · intensify — Maximum Bat Speed",
  },
  // Step 21D4 — a day-level statement, not a reduction. It must NOT render
  // under "Why reduced today".
  reductions: [{ reason: "tissue_cost", detail: "You're rested — heavy day is on." }],
  rest_day: {
    timing: "after_skill",
    timing_note: "Do this after your skill work.",
  },
};

const liftRow = {
  ...base,
  id: "evidence-lift",
  slot: "lift",
  movement_slug: "trap_bar_deadlift",
  movement_name: "Trap Bar Deadlift",
  cue: "Push the floor away. Ribs down, chin packed, finish tall without leaning back.",
  why_payload: why,
} as unknown as WkRx;

const skillRow = {
  ...base,
  id: "evidence-skill",
  slot: "bat_speed",
  sets: 3,
  reps: 8,
  sequence_role: "overload_swing",
  movement_slug: "overload_bat_swings",
  movement_name: "Overload Bat Swings",
  cue: "Same intent as a game swing. Let the heavy bat teach the path, do not muscle it.",
  why_payload: {
    ...why,
    why_this: "Heavier bat, same intent — the swing pattern holds while the load goes up.",
    // No timing note: the after-skill-work line belongs to the lift alone.
    rest_day: {},
    // A real trim, so this one SHOULD show under "Why reduced today".
    reductions: [{ reason: "game_proximity", detail: "Game tomorrow — swing volume cut from 5 sets to 3." }],
  },
} as unknown as WkRx;

export default function EvidenceCardClarity() {
  return (
    <main className="mx-auto max-w-[390px] space-y-4 p-3">
      <h1 className="text-base font-semibold">Step 21 — card clarity</h1>

      <section className="space-y-2">
        <h2 className="text-xs font-medium text-muted-foreground">Lift card — carries the timing note</h2>
        <WkPrescriptionCard rx={liftRow} phaseDisplay="Build the Base" phaseKey="accumulation" />
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-medium text-muted-foreground">Skill card — no timing note, real trim shown</h2>
        <WkPrescriptionCard rx={skillRow} phaseDisplay="Build the Base" phaseKey="accumulation" />
      </section>
    </main>
  );
}
