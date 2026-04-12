import { AlertTriangle, Flame, Crown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface PressureBannerProps {
  streak: number;
  completedToday: boolean;
  streakLost: boolean;
  isPerfectDay: boolean;
}

export function PressureBanner({ streak, completedToday, streakLost, isPerfectDay }: PressureBannerProps) {
  if (isPerfectDay) {
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <Crown className="h-4 w-4 text-green-500" />
        <AlertDescription className="text-green-700 dark:text-green-400 font-semibold">
          Perfect Read Day 👑
        </AlertDescription>
      </Alert>
    );
  }

  if (streakLost) {
    return (
      <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="font-semibold">
          Streak Lost. Start Again.
        </AlertDescription>
      </Alert>
    );
  }

  if (streak > 0 && !completedToday) {
    return (
      <Alert className="border-amber-500/50 bg-amber-500/10 animate-pulse [animation-duration:3s]">
        <Flame className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-amber-700 dark:text-amber-400 font-medium">
          Complete today to keep your {streak}-day streak alive 🔥
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
