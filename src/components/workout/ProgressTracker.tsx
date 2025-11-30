import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Calendar, CheckCircle2, Sparkles } from "lucide-react";
import { getDailyQuote } from "@/lib/motivationalQuotes";

interface ProgressTrackerProps {
  completionPercentage: number;
  completedWorkouts: number;
  totalWorkouts: number;
  currentBlock: number;
  daysRemaining: number;
}

export function ProgressTracker({
  completionPercentage,
  completedWorkouts,
  totalWorkouts,
  currentBlock,
  daysRemaining,
}: ProgressTrackerProps) {
  const canUnlockNextBlock = completionPercentage >= 70;
  const quote = getDailyQuote();

  return (
    <Card className="p-4 sm:p-6 space-y-4">
      {/* Daily Motivational Quote */}
      <div className="pb-3 border-b">
        <div className="flex items-start gap-2">
          <Sparkles className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm sm:text-base font-medium bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent leading-relaxed">
              "{quote.text}"
            </p>
            <p className="text-xs text-muted-foreground mt-1">— {quote.author}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Your Progress</h3>
        <Trophy className={canUnlockNextBlock ? "h-5 w-5 text-primary" : "h-5 w-5 text-muted-foreground"} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Completion</span>
          <span className="font-medium">{completionPercentage.toFixed(0)}%</span>
        </div>
        <Progress value={completionPercentage} className="h-2" />
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs sm:text-sm">Workouts</span>
          </div>
          <p className="text-lg sm:text-xl font-bold">{completedWorkouts}/{totalWorkouts}</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-xs sm:text-sm">Days Left</span>
          </div>
          <p className="text-lg sm:text-xl font-bold">{daysRemaining}</p>
        </div>
      </div>

      {canUnlockNextBlock ? (
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-primary">
            <Trophy className="h-5 w-5" />
            <p className="text-sm font-medium">Ready to unlock Block {currentBlock + 1}!</p>
          </div>
        </div>
      ) : (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Complete {Math.ceil((70 - completionPercentage) * totalWorkouts / 100)} more workouts to unlock the next block
          </p>
        </div>
      )}
    </Card>
  );
}