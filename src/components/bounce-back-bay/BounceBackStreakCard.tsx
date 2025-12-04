import { useTranslation } from "react-i18next";
import { Flame, BookOpen, Trophy, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BounceBackStreakCardProps {
  currentStreak: number;
  longestStreak: number;
  sectionsCompleted: string[];
  totalSections: number;
  badgesEarned: number;
  totalBadges: number;
}

export function BounceBackStreakCard({
  currentStreak,
  longestStreak,
  sectionsCompleted,
  totalSections,
  badgesEarned,
  totalBadges,
}: BounceBackStreakCardProps) {
  const { t } = useTranslation();
  
  const completionPercent = totalSections > 0 
    ? Math.round((sectionsCompleted.length / totalSections) * 100) 
    : 0;

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return "text-purple-500";
    if (streak >= 14) return "text-red-500";
    if (streak >= 7) return "text-orange-500";
    return "text-yellow-500";
  };

  const getStreakBgColor = (streak: number) => {
    if (streak >= 30) return "bg-purple-500/20";
    if (streak >= 14) return "bg-red-500/20";
    if (streak >= 7) return "bg-orange-500/20";
    return "bg-yellow-500/20";
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-card/80">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Current Streak */}
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-full", getStreakBgColor(currentStreak))}>
              <Flame className={cn("h-5 w-5", getStreakColor(currentStreak))} />
            </div>
            <div>
              <p className="text-2xl font-bold">{currentStreak}</p>
              <p className="text-xs text-muted-foreground">
                {t('bounceBackBay.streak.dayStreak')}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-10 w-px bg-border hidden sm:block" />

          {/* Stats Row */}
          <div className="flex flex-wrap gap-4 flex-1">
            {/* Sections Completed */}
            <div className="flex items-center gap-2 min-w-[120px]">
              <BookOpen className="h-4 w-4 text-cyan-500" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">
                    {t('bounceBackBay.streak.sections')}
                  </span>
                  <span className="text-xs font-medium">
                    {sectionsCompleted.length}/{totalSections}
                  </span>
                </div>
                <Progress value={completionPercent} className="h-1.5" />
              </div>
            </div>

            {/* Badges Earned */}
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm font-semibold">{badgesEarned}/{totalBadges}</p>
                <p className="text-xs text-muted-foreground">
                  {t('bounceBackBay.streak.badges')}
                </p>
              </div>
            </div>

            {/* Best Streak */}
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-semibold">{longestStreak}</p>
                <p className="text-xs text-muted-foreground">
                  {t('bounceBackBay.streak.best')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Next Badge Hint */}
        {badgesEarned < totalBadges && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Target className="h-3 w-3 mr-1" />
                {t('bounceBackBay.streak.nextBadge')}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {t('bounceBackBay.streak.keepLearning')}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
