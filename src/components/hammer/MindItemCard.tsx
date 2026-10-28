import { Card, CardContent } from "@/components/ui/card";
import { Brain } from "lucide-react";
import { dailyMindItem, type MindKind } from "@/lib/hammer/week/weeklyVolume";

const COPY: Record<MindKind, { title: string; how: string }> = {
  situations: { title: "Game situations", how: "Pick 3 game spots (runner on 2nd, 1 out). Say out loud what you'd do before the pitch." },
  film_study: { title: "Film study", how: "Watch one of your clips or a pro at-bat. Write one thing you'd copy." },
  tex_vision: { title: "Tex Vision", how: "Do today's Tex Vision session from your plan." },
  breathing: { title: "Breathing reset", how: "Breathe in 4 seconds, hold 4, out 6. Do it 5 times." },
  focus_routine: { title: "Focus routine", how: "Practice your between-pitch routine 5 times: breathe, look at a spot, one word cue." },
  journaling: { title: "Journal", how: "Write 3 lines: what went well, what to fix, how you feel." },
};

/** One non-physical item every day, rest days included. Never adds physical work. */
export function MindItemCard({ planDate, texVisionPrescribed = false }: { planDate: string; texVisionPrescribed?: boolean }) {
  const day = Math.floor(new Date(`${planDate}T12:00:00Z`).getTime() / 86_400_000);
  if (!Number.isFinite(day)) return null;
  const item = COPY[dailyMindItem(day, texVisionPrescribed).kind];
  return (
    <Card aria-label="Today's Mind item">
      <CardContent className="flex gap-3 p-4">
        <Brain className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mind · no physical work</p>
          <p className="font-semibold">{item.title}</p>
          <p className="text-sm text-muted-foreground">{item.how}</p>
        </div>
      </CardContent>
    </Card>
  );
}
