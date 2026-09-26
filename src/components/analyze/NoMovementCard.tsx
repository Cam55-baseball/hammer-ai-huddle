import { SearchX } from "lucide-react";
import { Card } from "@/components/ui/card";

interface NoMovementCardProps {
  module: string;
  sport?: string;
  reason: "no_movement_detected" | "body_not_tracked";
}

const MOVE: Record<string, { noun: string; label: string }> = {
  hitting: { noun: "swing", label: "Hitting" },
  pitching: { noun: "pitch", label: "Pitching" },
  throwing: { noun: "throw", label: "Throwing" },
};

/**
 * The single result shown when the movement gate refuses a clip. Not an
 * error — a useful answer: nothing was analysed because nothing moved.
 */
export function NoMovementCard({ module, sport, reason }: NoMovementCardProps) {
  const m = MOVE[module] ?? { noun: "movement", label: module };
  const sportLabel = sport === "softball" ? "Softball" : "Baseball";
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-muted">
          <SearchX className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">
            {reason === "no_movement_detected"
              ? `We couldn't find a ${m.noun} in this clip`
              : `We couldn't follow the body in this clip`}
          </h3>
          <p className="text-sm text-muted-foreground">
            You chose <span className="font-medium text-foreground">{sportLabel} {m.label}</span>.{" "}
            {reason === "no_movement_detected"
              ? `The player is in frame, but they don't move enough for a ${m.noun} to be in this clip.`
              : `We couldn't track the player's body well enough to tell whether a ${m.noun} happened.`}
          </p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Check the clip actually contains the {m.noun} — not the wait before it.</li>
            <li>Keep the player's whole body in frame, head to feet.</li>
            <li>Make sure you picked the right module for this clip.</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            No score, faults or drills were made from this clip. Pick another clip to try again.
          </p>
        </div>
      </div>
    </Card>
  );
}
