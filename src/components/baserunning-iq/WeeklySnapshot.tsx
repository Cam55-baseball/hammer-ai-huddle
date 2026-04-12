import { Card } from "@/components/ui/card";
import { Target, Clock, Flame, BarChart3 } from "lucide-react";

interface WeeklySnapshotProps {
  stats: { accuracy: number; avgTime: number; total: number };
  streak: number;
}

function getInsight(accuracy: number, avgTime: number): string {
  if (accuracy >= 80 && avgTime < 5000) return "You're reacting faster than most players — elite instincts forming";
  if (accuracy >= 80) return "Strong reads — now work on speeding up your decisions";
  if (accuracy >= 50) return "You're guessing — slow down and read the play earlier";
  return "Focus on the fundamentals — review lessons before your next session";
}

export function WeeklySnapshot({ stats, streak }: WeeklySnapshotProps) {
  if (stats.total === 0) return null;

  const insight = getInsight(stats.accuracy, stats.avgTime);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold">Your Last 7 Days</h3>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <StatCell icon={<Target className="h-4 w-4" />} value={`${stats.accuracy}%`} label="Accuracy" />
        <StatCell icon={<BarChart3 className="h-4 w-4" />} value={String(stats.total)} label="Decisions" />
        <StatCell icon={<Clock className="h-4 w-4" />} value={`${(stats.avgTime / 1000).toFixed(1)}s`} label="Avg Time" />
        <StatCell icon={<Flame className="h-4 w-4" />} value={`${streak}d`} label="Streak" />
      </div>

      <p className="text-sm text-muted-foreground italic text-center">{insight}</p>
    </Card>
  );
}

function StatCell({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50 border">
      <div className="text-primary">{icon}</div>
      <span className="text-base font-bold">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
