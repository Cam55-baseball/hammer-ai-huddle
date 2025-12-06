import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock, Award } from 'lucide-react';

interface MindFuelBadgesProps {
  earnedBadges: string[];
  currentStreak: number;
  categoriesExplored: Record<string, number>;
}

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  type: 'streak' | 'category' | 'special';
  requirement?: number;
  category?: string;
}

const ALL_BADGES: BadgeDefinition[] = [
  // Streak badges
  { id: 'mind_starter', name: 'Mind Starter', description: 'Complete your first day of mental training', emoji: '🧠', type: 'streak', requirement: 1 },
  { id: 'week_focus', name: 'Week of Focus', description: '7 consecutive days of mental fuel', emoji: '⚡', type: 'streak', requirement: 7 },
  { id: 'consistency_champ', name: 'Consistency Champ', description: '30 days of mental mastery', emoji: '🏆', type: 'streak', requirement: 30 },
  { id: 'mental_warrior', name: 'Mental Warrior', description: '60 days of discipline', emoji: '⚔️', type: 'streak', requirement: 60 },
  { id: 'limitless_leader', name: 'Limitless Leader', description: '100 days of transformation', emoji: '👑', type: 'streak', requirement: 100 },
  { id: 'unbreakable_mind', name: 'Unbreakable Mind', description: 'One full year of mental training', emoji: '💎', type: 'streak', requirement: 365 },
  
  // Category mastery badges
  { id: 'focus_master', name: 'Focus Master', description: 'Explore 20+ mental mastery lessons', emoji: '🎯', type: 'category', category: 'mental_mastery', requirement: 20 },
  { id: 'peace_practitioner', name: 'Peace Practitioner', description: 'Explore 20+ emotional balance lessons', emoji: '☮️', type: 'category', category: 'emotional_balance', requirement: 20 },
  { id: 'leadership_elite', name: 'Leadership Elite', description: 'Explore 20+ leadership lessons', emoji: '🦁', type: 'category', category: 'leadership', requirement: 20 },
  { id: 'discipline_engine', name: 'Discipline Engine', description: 'Explore 20+ life mastery lessons', emoji: '⚙️', type: 'category', category: 'life_mastery', requirement: 20 },
  
  // Special badges
  { id: 'mind_shift', name: 'The Mind Shift', description: 'Returned after a streak break', emoji: '🔄', type: 'special' },
  { id: 'breakthrough_day', name: 'Breakthrough Day', description: 'Collected 50 lessons', emoji: '💥', type: 'special' },
  { id: 'unlocked_potential', name: 'Unlocked Potential', description: 'Explored all categories', emoji: '🔓', type: 'special' },
  { id: 'the_reset', name: 'The Reset Badge', description: 'Started again after 7+ day break', emoji: '🔁', type: 'special' },
];

export default function MindFuelBadges({ earnedBadges, currentStreak, categoriesExplored }: MindFuelBadgesProps) {
  const { t } = useTranslation();

  const getBadgeProgress = (badge: BadgeDefinition): { current: number; required: number } | null => {
    if (badge.type === 'streak' && badge.requirement) {
      return { current: currentStreak, required: badge.requirement };
    }
    if (badge.type === 'category' && badge.category && badge.requirement) {
      return { current: categoriesExplored[badge.category] || 0, required: badge.requirement };
    }
    return null;
  };

  const streakBadges = ALL_BADGES.filter(b => b.type === 'streak');
  const categoryBadges = ALL_BADGES.filter(b => b.type === 'category');
  const specialBadges = ALL_BADGES.filter(b => b.type === 'special');

  const renderBadge = (badge: BadgeDefinition) => {
    const isEarned = earnedBadges.includes(badge.id);
    const progress = getBadgeProgress(badge);

    return (
      <TooltipProvider key={badge.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`relative flex flex-col items-center p-3 rounded-xl transition-all ${
                isEarned
                  ? 'bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30'
                  : 'bg-muted/30 border border-border/50 opacity-60'
              }`}
            >
              <span className={`text-2xl sm:text-3xl ${!isEarned && 'grayscale'}`}>
                {badge.emoji}
              </span>
              {!isEarned && (
                <div className="absolute -top-1 -right-1 bg-muted rounded-full p-1">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <span className={`text-xs mt-1 text-center line-clamp-1 ${isEarned ? 'text-foreground' : 'text-muted-foreground'}`}>
                {badge.name}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-semibold">{badge.name}</p>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
              {progress && !isEarned && (
                <p className="text-xs text-violet-400">
                  {progress.current} / {progress.required}
                </p>
              )}
              {isEarned && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                  {t('mindFuel.badges.earned', 'Earned!')}
                </Badge>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Award className="h-5 w-5 text-violet-500" />
          {t('mindFuel.badges.title', 'Achievement Badges')}
          <Badge variant="secondary" className="ml-2">
            {earnedBadges.length} / {ALL_BADGES.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Streak Badges */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            {t('mindFuel.badges.streakBadges', 'Streak Milestones')}
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            {streakBadges.map(renderBadge)}
          </div>
        </div>

        {/* Category Mastery Badges */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            {t('mindFuel.badges.categoryBadges', 'Category Mastery')}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {categoryBadges.map(renderBadge)}
          </div>
        </div>

        {/* Special Badges */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            {t('mindFuel.badges.specialBadges', 'Special Achievements')}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {specialBadges.map(renderBadge)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
