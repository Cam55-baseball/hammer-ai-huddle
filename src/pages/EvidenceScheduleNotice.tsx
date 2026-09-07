/**
 * Dev-only evidence page — renders ScheduleAdjustmentNotice in isolation with a
 * realistic payload, so the copy and the override button can be seen rather
 * than assumed. Not routed outside development.
 */
import { ScheduleAdjustmentNotice } from "@/components/hammer/ScheduleAdjustmentNotice";

const PAYLOAD = {
  headline: "Lighter today — you have a game Friday 6pm.",
  driving_game: {
    id: "00000000-0000-0000-0000-000000000001",
    date: "2026-09-11",
    time: "18:00",
    assumedTime: true,
    label: "vs Riverside",
    source: "gp_games" as const,
    whenLabel: "Friday 6pm",
  },
  primer_only: true,
  override_available: true,
  override_applied: false,
  lift_removed: false,
  assumed_game_time: true,
  reasons: [
    "Lighter today — you have a game Friday 6pm. Nothing above a primer until it's played (30h out).",
    "That game has no start time on it, so we assumed 6pm. Add the real time and this adjusts.",
  ],
};

export default function EvidenceScheduleNotice() {
  return (
    <main className="mx-auto max-w-sm space-y-4 p-4">
      <h1 className="text-lg font-semibold">Schedule notice — isolated render</h1>
      <ScheduleAdjustmentNotice schedule={PAYLOAD} />
    </main>
  );
}
