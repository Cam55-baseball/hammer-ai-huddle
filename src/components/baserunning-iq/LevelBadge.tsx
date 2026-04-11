import { Trophy, Star, Zap, Crown, Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { type BaserunningLevel } from "@/utils/baserunningLevel";

const TIER_ICONS: Record<string, React.ElementType> = {
  rookie: Star,
  reactive: Zap,
  instinctive: Trophy,
  elite: Crown,
  top: Flame,
};

export function LevelBadge({ level }: { level: BaserunningLevel }) {
  const Icon = TIER_ICONS[level.tier] ?? Star;

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${level.gradient} text-white`}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm uppercase tracking-wide">{level.label}</span>
        </div>
        <span className="text-xs text-muted-foreground font-medium">{level.points} pts</span>
      </div>
      <div className="space-y-1">
        <Progress
          value={level.progressToNext}
          className="h-2"
          indicatorClassName={`bg-gradient-to-r ${level.gradient}`}
        />
        {level.nextThreshold !== null ? (
          <p className="text-[11px] text-muted-foreground text-right">
            {level.progressToNext}% to {level.nextThreshold === 1000 ? "0.01%" : level.nextThreshold + " pts"}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground text-right">Max level reached</p>
        )}
      </div>
    </Card>
  );
}
