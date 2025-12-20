import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Award, 
  Flame, 
  Star, 
  Heart, 
  Brain, 
  Zap,
  Trophy,
  Target,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  progress: number;
  target: number;
  unlocked: boolean;
  category: 'streak' | 'activity' | 'growth';
}

export default function ProgressMilestones() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [totalBadges, setTotalBadges] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMilestones();
    }
  }, [user]);

  const fetchMilestones = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Fetch streak data
      const { data: streakData } = await supabase
        .from('mind_fuel_streaks')
        .select('current_streak, longest_streak, total_visits, lessons_collected, badges_earned')
        .eq('user_id', user.id)
        .single();

      // Fetch journal entries count
      const { count: journalCount } = await supabase
        .from('mental_health_journal')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch mindfulness sessions count
      const { count: mindfulnessCount } = await supabase
        .from('mindfulness_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', true);

      const currentStreak = streakData?.current_streak || 0;
      const totalVisits = streakData?.total_visits || 0;
      const journalEntries = journalCount || 0;
      const sessions = mindfulnessCount || 0;
      const badgesEarned = streakData?.badges_earned || [];

      setTotalBadges(badgesEarned.length);

      // Define milestones
      const generatedMilestones: Milestone[] = [
        {
          id: 'streak-7',
          title: t('insights.milestone7Day', '7-Day Streak'),
          description: t('insights.milestone7DayDesc', 'Visit Mind Fuel 7 days in a row'),
          icon: <Flame className="h-5 w-5" />,
          progress: Math.min(currentStreak, 7),
          target: 7,
          unlocked: currentStreak >= 7,
          category: 'streak'
        },
        {
          id: 'streak-30',
          title: t('insights.milestone30Day', '30-Day Streak'),
          description: t('insights.milestone30DayDesc', 'Visit Mind Fuel 30 days in a row'),
          icon: <Flame className="h-5 w-5" />,
          progress: Math.min(currentStreak, 30),
          target: 30,
          unlocked: currentStreak >= 30,
          category: 'streak'
        },
        {
          id: 'journal-10',
          title: t('insights.milestone10Journal', 'Reflective Writer'),
          description: t('insights.milestone10JournalDesc', 'Write 10 journal entries'),
          icon: <Heart className="h-5 w-5" />,
          progress: Math.min(journalEntries, 10),
          target: 10,
          unlocked: journalEntries >= 10,
          category: 'activity'
        },
        {
          id: 'mindful-5',
          title: t('insights.milestone5Mindful', 'Mindful Beginner'),
          description: t('insights.milestone5MindfulDesc', 'Complete 5 mindfulness sessions'),
          icon: <Brain className="h-5 w-5" />,
          progress: Math.min(sessions, 5),
          target: 5,
          unlocked: sessions >= 5,
          category: 'activity'
        },
        {
          id: 'visits-50',
          title: t('insights.milestone50Visits', 'Dedicated Learner'),
          description: t('insights.milestone50VisitsDesc', 'Visit Mind Fuel 50 times'),
          icon: <Star className="h-5 w-5" />,
          progress: Math.min(totalVisits, 50),
          target: 50,
          unlocked: totalVisits >= 50,
          category: 'growth'
        },
        {
          id: 'badges-5',
          title: t('insights.milestone5Badges', 'Badge Collector'),
          description: t('insights.milestone5BadgesDesc', 'Earn 5 wellness badges'),
          icon: <Award className="h-5 w-5" />,
          progress: Math.min(badgesEarned.length, 5),
          target: 5,
          unlocked: badgesEarned.length >= 5,
          category: 'growth'
        }
      ];

      setMilestones(generatedMilestones);
    } catch (error) {
      console.error('Error fetching milestones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'streak': return 'text-orange-500';
      case 'activity': return 'text-blue-500';
      case 'growth': return 'text-purple-500';
      default: return 'text-primary';
    }
  };

  const unlockedCount = milestones.filter(m => m.unlocked).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Trophy className="h-6 w-6 text-amber-500" />
            <div>
              <p className="text-2xl font-bold text-foreground">{unlockedCount}/{milestones.length}</p>
              <p className="text-xs text-muted-foreground">
                {t('insights.milestonesUnlocked', 'Milestones Unlocked')}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Award className="h-6 w-6 text-purple-500" />
            <div>
              <p className="text-2xl font-bold text-foreground">{totalBadges}</p>
              <p className="text-xs text-muted-foreground">
                {t('insights.totalBadges', 'Total Badges')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestones List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            {t('insights.yourMilestones', 'Your Milestones')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              {t('common.loading', 'Loading...')}
            </div>
          ) : (
            milestones.map((milestone) => (
              <div 
                key={milestone.id}
                className={`p-3 rounded-lg border ${milestone.unlocked ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${milestone.unlocked ? 'bg-primary/10' : 'bg-muted'} ${getCategoryColor(milestone.category)}`}>
                    {milestone.unlocked ? milestone.icon : <Lock className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground">{milestone.title}</h4>
                      {milestone.unlocked && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{milestone.description}</p>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(milestone.progress / milestone.target) * 100} 
                        className="h-2 flex-1"
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        {milestone.progress}/{milestone.target}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Category Legend */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Badge variant="outline" className="text-orange-500 border-orange-500/30">
          <Flame className="h-3 w-3 mr-1" />
          {t('insights.categoryStreak', 'Streak')}
        </Badge>
        <Badge variant="outline" className="text-blue-500 border-blue-500/30">
          <Zap className="h-3 w-3 mr-1" />
          {t('insights.categoryActivity', 'Activity')}
        </Badge>
        <Badge variant="outline" className="text-purple-500 border-purple-500/30">
          <Target className="h-3 w-3 mr-1" />
          {t('insights.categoryGrowth', 'Growth')}
        </Badge>
      </div>
    </div>
  );
}
