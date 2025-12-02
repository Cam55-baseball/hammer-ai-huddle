import { Award, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const BADGE_MILESTONES = [
  { days: 3, id: 'starter', name: 'Getting Started', emoji: '🌱', description: '3-day streak' },
  { days: 7, id: 'week_warrior', name: 'Week Warrior', emoji: '⚡', description: '7-day streak' },
  { days: 14, id: 'iron_will', name: 'Iron Will', emoji: '💪', description: '14-day streak' },
  { days: 30, id: 'iron_horse', name: 'Iron Horse', emoji: '🏇', description: '30-day streak' },
  { days: 60, id: 'elite', name: 'Elite Performer', emoji: '🏆', description: '60-day streak' },
  { days: 100, id: 'legendary', name: 'Legendary', emoji: '👑', description: '100-day streak' },
];

interface NutritionBadgesProps {
  earnedBadges: string[];
  currentStreak: number;
}

export function NutritionBadges({ earnedBadges, currentStreak }: NutritionBadgesProps) {
  // Find next badge to earn
  const nextBadge = BADGE_MILESTONES.find(b => !earnedBadges.includes(b.id));
  const daysToNext = nextBadge ? nextBadge.days - currentStreak : 0;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          Milestone Badges
          {nextBadge && daysToNext > 0 && (
            <Badge variant="outline" className="ml-auto text-xs">
              {daysToNext} day{daysToNext !== 1 ? 's' : ''} to {nextBadge.emoji}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <TooltipProvider>
          <div className="flex flex-wrap gap-2">
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
                        {badge.days - currentStreak} more day{badge.days - currentStreak !== 1 ? 's' : ''} to unlock
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
