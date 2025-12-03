import { useTranslation } from 'react-i18next';
import { Award, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NutritionBadgesProps {
  earnedBadges: string[];
  currentStreak: number;
}

export function NutritionBadges({ earnedBadges, currentStreak }: NutritionBadgesProps) {
  const { t } = useTranslation();

  const BADGE_MILESTONES = [
    { days: 3, id: 'starter', name: t('nutrition.badges.starter'), emoji: '🌱', description: t('nutrition.badges.starterDesc') },
    { days: 7, id: 'week_warrior', name: t('nutrition.badges.weekWarrior'), emoji: '⚡', description: t('nutrition.badges.weekWarriorDesc') },
    { days: 14, id: 'iron_will', name: t('nutrition.badges.ironWill'), emoji: '💪', description: t('nutrition.badges.ironWillDesc') },
    { days: 30, id: 'iron_horse', name: t('nutrition.badges.ironHorse'), emoji: '🏇', description: t('nutrition.badges.ironHorseDesc') },
    { days: 60, id: 'elite', name: t('nutrition.badges.elite'), emoji: '🏆', description: t('nutrition.badges.eliteDesc') },
    { days: 100, id: 'legendary', name: t('nutrition.badges.legendary'), emoji: '👑', description: t('nutrition.badges.legendaryDesc') },
  ];

  // Find next badge to earn
  const nextBadge = BADGE_MILESTONES.find(b => !earnedBadges.includes(b.id));
  const daysToNext = nextBadge ? nextBadge.days - currentStreak : 0;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          {t('nutrition.milestoneBadges')}
          {nextBadge && daysToNext > 0 && (
            <Badge variant="outline" className="ml-auto text-xs">
              {t('nutrition.daysToUnlock', { days: daysToNext })} {nextBadge.emoji}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 overflow-hidden">
        <TooltipProvider>
          <div className="flex flex-wrap gap-2 max-w-full">
            {BADGE_MILESTONES.map((badge) => {
              const isEarned = earnedBadges.includes(badge.id);
              
              return (
                <Tooltip key={badge.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={`
                        relative p-2 rounded-lg border transition-all cursor-default
                        ${isEarned 
                          ? 'bg-primary/10 border-primary/30 hover:bg-primary/20' 
                          : 'bg-muted/30 border-border/30 opacity-50'
                        }
                      `}
                    >
                      <span className="text-xl">{badge.emoji}</span>
                      {!isEarned && (
                        <Lock className="absolute -top-1 -right-1 h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">{badge.name}</p>
                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                    {!isEarned && (
                      <p className="text-xs text-primary mt-1">
                        {t('nutrition.moreDaysToUnlock', { days: badge.days - currentStreak })}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
