/**
 * HammerCheckInCard — surfaces a Vault Focus Quiz (morning / pre_lift / night)
 * as a discrete card inside the Hammers Today plan so athletes can check-in
 * at the right moment of the day without leaving the plan.
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sun, Dumbbell, Moon, ArrowRight } from "lucide-react";
import type { VaultQuizType } from "@/hooks/useVaultQuizzesForDate";

const META: Record<
  VaultQuizType,
  {
    title: string;
    subtitle: string;
    Icon: typeof Sun;
    accent: string;
    slot: string;
  }
> = {
  morning: {
    title: "Morning check-in",
    subtitle: "Sleep, mood, discipline — set the tone before the day starts.",
    Icon: Sun,
    accent: "text-amber-500",
    slot: "First thing today",
  },
  pre_lift: {
    title: "Pre-workout check-in",
    subtitle: "CNS, pain, intent — Hammer tunes today's load before you lift.",
    Icon: Dumbbell,
    accent: "text-orange-500",
    slot: "Before training",
  },
  night: {
    title: "Night check-in",
    subtitle: "Reflection + tomorrow's setup. Last task of the day.",
    Icon: Moon,
    accent: "text-indigo-400",
    slot: "End of day",
  },
};

export function HammerCheckInCard({
  quizType,
  completed,
  onOpen,
}: {
  quizType: VaultQuizType;
  completed: boolean;
  onOpen: () => void;
}) {
  const meta = META[quizType];
  const { Icon } = meta;

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        completed
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-primary/25 bg-primary/5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <div
            className={`shrink-0 rounded-md border border-border/60 bg-background p-1.5 ${meta.accent}`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">{meta.title}</span>
              <Badge variant="outline" className="text-[10px]">
                {meta.slot}
              </Badge>
              {completed && (
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-transparent"
                >
                  Completed
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {meta.subtitle}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          {completed ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={onOpen}
              className="h-8 px-2 text-xs gap-1 text-emerald-600 dark:text-emerald-300"
              title="View / edit today's check-in"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Done
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onOpen}
              className="h-8 px-3 text-xs gap-1"
            >
              Open
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
