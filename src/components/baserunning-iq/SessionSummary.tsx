import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, AlertTriangle, Target, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionSummaryProps {
  correctCount: number;
  totalCount: number;
  avgTimeMs?: number;
  onContinue: () => void;
  onDismiss?: () => void;
}

export function SessionSummary({ correctCount, totalCount, avgTimeMs, onContinue, onDismiss }: SessionSummaryProps) {
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const isElite = accuracy >= 80;

  return (
    <Card className="p-6 space-y-5 border-primary/20">
      <div className="text-center space-y-2">
        <div className={cn(
          "inline-flex items-center justify-center w-14 h-14 rounded-full mx-auto",
          isElite ? "bg-green-500/15" : "bg-amber-500/15"
        )}>
          {isElite
            ? <Trophy className="h-7 w-7 text-green-500" />
            : <AlertTriangle className="h-7 w-7 text-amber-500" />
          }
        </div>
        <h3 className="text-xl font-bold">Session Complete</h3>
        <p className={cn(
          "text-sm font-semibold",
          isElite ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
        )}>
          {isElite ? "Elite Reads Today" : "Needs Sharpening"}
        </p>
      </div>

      <div className={cn("grid gap-3 text-center", avgTimeMs ? "grid-cols-3" : "grid-cols-2")}>
        <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/50 border">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-lg font-bold">{accuracy}%</span>
          <span className="text-xs text-muted-foreground">Accuracy</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/50 border">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span className="text-lg font-bold">{correctCount}/{totalCount}</span>
          <span className="text-xs text-muted-foreground">Correct</span>
        </div>
        {avgTimeMs && (
          <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/50 border">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-lg font-bold">{(avgTimeMs / 1000).toFixed(1)}s</span>
            <span className="text-xs text-muted-foreground">Avg Time</span>
          </div>
        )}
      </div>

      <div className={cn(
        "p-3 rounded-lg text-sm",
        isElite ? "bg-green-500/10" : "bg-amber-500/10"
      )}>
        <p className={cn(
          "font-medium",
          isElite ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"
        )}>
          {isElite
            ? "You're seeing the game early — keep trusting your reads"
            : "You're reacting late — focus on reading angles earlier"
          }
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button onClick={onContinue} className="w-full">Continue Training</Button>
        {onDismiss && (
          <Button variant="ghost" onClick={onDismiss} className="w-full text-muted-foreground">
            Come Back Tomorrow
          </Button>
        )}
      </div>
    </Card>
  );
}
