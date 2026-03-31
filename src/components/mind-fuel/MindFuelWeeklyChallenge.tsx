import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showBadgeUnlockToast } from './MindFuelBadgeUnlockToast';
import { 
  Target, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  Sparkles,
  Trophy,
  Flame,
  Timer
} from 'lucide-react';

// ── Inline display map for ALL 52 challenges ──
const CHALLENGE_DISPLAY: Record<string, { title: string; description: string }> = {
  gratitude_journal: { title: 'Gratitude Journal', description: 'Write down 3 things you\'re grateful for each day.' },
  visualization_practice: { title: 'Visualization Practice', description: 'Spend 5 minutes visualizing your best performance.' },
  positive_self_talk: { title: 'Positive Self-Talk', description: 'Replace negative thoughts with positive affirmations.' },
  breathing_exercises: { title: 'Breathing Exercises', description: 'Practice 4-7-8 breathing before each session.' },
  mindful_eating: { title: 'Mindful Eating', description: 'Eat one meal per day without distractions.' },
  cold_shower: { title: 'Cold Shower Challenge', description: 'End your shower with 30 seconds of cold water.' },
  sleep_routine: { title: 'Sleep Routine', description: 'Go to bed and wake up at the same time each day.' },
  no_phone_morning: { title: 'No Phone Morning', description: 'Avoid your phone for the first 30 minutes after waking.' },
  hydration_tracker: { title: 'Hydration Tracker', description: 'Drink at least 64 oz of water daily.' },
  journaling: { title: 'Daily Journaling', description: 'Write for 10 minutes about your goals and progress.' },
  meditation: { title: 'Daily Meditation', description: 'Meditate for at least 5 minutes each day.' },
  stretch_routine: { title: 'Stretch Routine', description: 'Complete a 10-minute stretch routine daily.' },
  reading_habit: { title: 'Reading Habit', description: 'Read for 15 minutes about sports psychology or leadership.' },
  acts_of_kindness: { title: 'Acts of Kindness', description: 'Do one kind thing for a teammate each day.' },
  no_complaining: { title: 'No Complaining', description: 'Go the entire day without complaining.' },
  early_riser: { title: 'Early Riser', description: 'Wake up 30 minutes earlier than usual.' },
  digital_detox: { title: 'Digital Detox', description: 'Limit screen time to under 2 hours outside of school/work.' },
  goal_setting: { title: 'Goal Setting', description: 'Write and review your short-term and long-term goals.' },
  focus_training: { title: 'Focus Training', description: 'Practice a focus drill for 5 minutes daily.' },
  confidence_builder: { title: 'Confidence Builder', description: 'List 3 things you did well after each practice.' },
  team_first: { title: 'Team First', description: 'Encourage a teammate or help someone improve.' },
  pressure_simulation: { title: 'Pressure Simulation', description: 'Simulate high-pressure situations in practice.' },
  recovery_focus: { title: 'Recovery Focus', description: 'Prioritize active recovery with foam rolling or ice baths.' },
  nutrition_log: { title: 'Nutrition Log', description: 'Track your meals and aim for balanced nutrition.' },
  film_study: { title: 'Film Study', description: 'Watch 15 minutes of game film or technique videos.' },
  mental_reset: { title: 'Mental Reset', description: 'Practice a mental reset routine between plays.' },
  body_language: { title: 'Body Language', description: 'Maintain confident body language throughout practice.' },
  pre_game_routine: { title: 'Pre-Game Routine', description: 'Develop and follow a consistent pre-game routine.' },
  accountability_partner: { title: 'Accountability Partner', description: 'Check in with a partner about your goals daily.' },
  failure_reframe: { title: 'Failure Reframe', description: 'Reframe one failure as a learning opportunity each day.' },
  energy_management: { title: 'Energy Management', description: 'Monitor and manage your energy levels throughout the day.' },
  process_over_results: { title: 'Process Over Results', description: 'Focus on effort and technique, not outcomes.' },
  emotional_awareness: { title: 'Emotional Awareness', description: 'Identify and name your emotions 3 times daily.' },
  controlled_aggression: { title: 'Controlled Aggression', description: 'Channel intensity with composure in every session.' },
  patience_practice: { title: 'Patience Practice', description: 'Practice patience in one challenging situation daily.' },
  self_compassion: { title: 'Self-Compassion', description: 'Treat yourself with kindness after mistakes.' },
  competitive_mindset: { title: 'Competitive Mindset', description: 'Approach every drill like it\'s game day.' },
  leadership_action: { title: 'Leadership Action', description: 'Take one leadership action each day.' },
  communication_skills: { title: 'Communication Skills', description: 'Practice clear, direct communication with teammates.' },
  coachability: { title: 'Coachability', description: 'Ask for and apply one piece of feedback daily.' },
  adversity_response: { title: 'Adversity Response', description: 'Respond to adversity with composure and determination.' },
  time_management: { title: 'Time Management', description: 'Plan your day the night before.' },
  effort_consistency: { title: 'Effort Consistency', description: 'Give maximum effort on every rep, every day.' },
  mindset_shift: { title: 'Mindset Shift', description: 'Identify one limiting belief and challenge it.' },
  present_moment: { title: 'Present Moment', description: 'Stay fully present during practice — no drifting.' },
  routine_mastery: { title: 'Routine Mastery', description: 'Perfect your between-play and pre-pitch routine.' },
  fear_facing: { title: 'Face Your Fear', description: 'Do one thing that challenges your comfort zone.' },
  rest_day_discipline: { title: 'Rest Day Discipline', description: 'Honor your rest days fully — recover like a pro.' },
  teammate_appreciation: { title: 'Teammate Appreciation', description: 'Tell a teammate what you respect about their game.' },
  mental_toughness: { title: 'Mental Toughness', description: 'Push through discomfort in practice without quitting.' },
  purpose_reminder: { title: 'Purpose Reminder', description: 'Remind yourself why you play — write it down.' },
  consistency_streak: { title: 'Consistency Streak', description: 'Show up and give your best for 7 straight days.' },
};

const CATEGORY_LABELS: Record<string, string> = {
  mental_mastery: 'Mental Mastery',
  emotional_balance: 'Emotional Balance',
  leadership: 'Leadership',
  life_mastery: 'Life Mastery',
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  mental_mastery: { bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/30' },
  emotional_balance: { bg: 'bg-sky-500/20', text: 'text-sky-300', border: 'border-sky-500/30' },
  leadership: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
  life_mastery: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
};

interface ChallengeData {
  id: string;
  challenge_id: string;
  status: string;
  days_completed: number;
  total_days: number;
  started_at: string;
  completed_at: string | null;
  last_checkin_at: string | null;
}

interface ChallengeDefinition {
  id: string;
  category: string;
  totalDays: number;
}

interface WeeklyChallengeResponse {
  currentChallenge: (ChallengeData & { definition: ChallengeDefinition }) | null;
  availableChallenge: ChallengeDefinition | null;
  daysRemainingInWeek: number;
  completedChallengesCount: number;
  history: ChallengeData[];
  newBadges?: string[];
  cooldownActive?: boolean;
  cooldownEndsAt?: string | null;
}

function triggerChallengeCompleteConfetti() {
  const container = document.createElement('div');
  container.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden;`;
  document.body.appendChild(container);

  const colors = ['#f59e0b', '#f97316', '#ef4444', '#eab308', '#fb923c', '#fbbf24'];
  for (let i = 0; i < 80; i++) {
    const particle = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 12 + 6;
    particle.style.cssText = `position:absolute;width:${size}px;height:${size}px;background:${color};left:${Math.random()*100}%;top:-20px;border-radius:${Math.random()>0.5?'50%':'2px'};animation:challenge-confetti-fall ${Math.random()*2.5+2}s ease-out ${Math.random()*0.8}s forwards;transform:rotate(${Math.random()*1080}deg);`;
    container.appendChild(particle);
  }

  if (!document.getElementById('challenge-confetti-styles')) {
    const style = document.createElement('style');
    style.id = 'challenge-confetti-styles';
    style.textContent = `@keyframes challenge-confetti-fall{0%{transform:translateY(0) rotate(0deg) scale(1);opacity:1}50%{opacity:1}100%{transform:translateY(100vh) rotate(1080deg) scale(0.5);opacity:0}}`;
    document.head.appendChild(style);
  }

  if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
  setTimeout(() => container.remove(), 5000);
}

function formatCooldownTime(endsAt: string): string {
  const remaining = new Date(endsAt).getTime() - Date.now();
  if (remaining <= 0) return '';
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function getChallengeTitle(id: string | undefined, t: any): string {
  if (!id) return 'Weekly Challenge';
  const translated = t(`weeklyChallenge.challenges.${id}.title`, '');
  if (translated && translated !== '') return translated;
  return CHALLENGE_DISPLAY[id]?.title ?? id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getChallengeDescription(id: string | undefined, t: any): string {
  if (!id) return 'Complete this challenge to earn badges!';
  const translated = t(`weeklyChallenge.challenges.${id}.description`, '');
  if (translated && translated !== '') return translated;
  return CHALLENGE_DISPLAY[id]?.description ?? 'Complete this challenge to earn badges!';
}

function getCategoryLabel(category: string, t: any): string {
  const translated = t(`weeklyChallenge.categories.${category}`, '');
  if (translated && translated !== '') return translated;
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function MindFuelWeeklyChallenge() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckinLoading, setIsCheckinLoading] = useState(false);
  const [data, setData] = useState<WeeklyChallengeResponse | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<string | null>(null);

  const fetchChallenge = useCallback(async () => {
    try {
      const { data: result, error } = await supabase.functions.invoke('get-weekly-challenge', { body: {} });
      if (error) throw error;
      setData(result);
    } catch (error) {
      console.error('Error fetching challenge:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchChallenge(); }, [fetchChallenge]);

  useEffect(() => {
    if (!data?.cooldownEndsAt) { setCooldownRemaining(null); return; }
    const updateCooldown = () => {
      const remaining = new Date(data.cooldownEndsAt!).getTime() - Date.now();
      if (remaining <= 0) { setCooldownRemaining(null); fetchChallenge(); }
      else setCooldownRemaining(formatCooldownTime(data.cooldownEndsAt!));
    };
    updateCooldown();
    const interval = setInterval(updateCooldown, 60000);
    return () => clearInterval(interval);
  }, [data?.cooldownEndsAt, fetchChallenge]);

  const handleStartChallenge = async () => {
    setIsCheckinLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('get-weekly-challenge', { body: { action: 'start' } });
      if (error) throw error;
      setData(result);
      toast.success('Challenge started! Good luck!');
    } catch (error) {
      console.error('Error starting challenge:', error);
      toast.error('Failed to start challenge');
    } finally { setIsCheckinLoading(false); }
  };

  const handleCheckIn = async () => {
    setIsCheckinLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('get-weekly-challenge', { body: { action: 'check_in' } });
      if (error) throw error;
      setData(result);
      if (result.cooldownActive && result.cooldownEndsAt) {
        toast.error('Please wait before checking in again');
        return;
      }
      if (result.currentChallenge?.status === 'completed') {
        triggerChallengeCompleteConfetti();
        toast.success('Challenge completed! 🎉');
        if (result.newBadges?.length > 0) {
          result.newBadges.forEach((badgeKey: string, index: number) => {
            setTimeout(() => showBadgeUnlockToast({ badgeKey }), 1000 + index * 1500);
          });
        }
      } else {
        toast.success('Day checked in!');
      }
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error('Failed to check in');
    } finally { setIsCheckinLoading(false); }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 border-amber-500/20">
        <CardHeader className="pb-2"><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-10 w-full" /></CardContent>
      </Card>
    );
  }

  const currentChallenge = data?.currentChallenge;
  const availableChallenge = data?.availableChallenge;
  const challengeId = currentChallenge?.challenge_id || availableChallenge?.id;
  const isCompleted = currentChallenge?.status === 'completed';
  const progressPercent = currentChallenge ? Math.round((currentChallenge.days_completed / currentChallenge.total_days) * 100) : 0;
  const isCooldownActive = !!cooldownRemaining;

  return (
    <Card className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 border-amber-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-amber-500" />
          Weekly Challenge
          {data && (
            <Badge variant="secondary" className="ml-2">
              {data.completedChallengesCount} completed
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
          <div className="flex items-start justify-between mb-3">
            <div>
              {(() => {
                const category = currentChallenge?.definition?.category || availableChallenge?.category || 'mental_mastery';
                const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.mental_mastery;
                return (
                  <Badge className={`${colors.bg} ${colors.text} ${colors.border} mb-2`}>
                    {getCategoryLabel(category, t)}
                  </Badge>
                );
              })()}
              <h3 className="font-semibold text-foreground">
                {getChallengeTitle(challengeId, t)}
              </h3>
            </div>
            {isCompleted && (
              <div className="p-2 rounded-full bg-green-500/20">
                <Trophy className="h-5 w-5 text-green-400" />
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            {getChallengeDescription(challengeId, t)}
          </p>

          {currentChallenge && !isCompleted && (
            <>
              <div className="flex items-center gap-1.5 mb-3">
                {Array.from({ length: currentChallenge.total_days }).map((_, i) => (
                  <div key={i} className={`h-3 w-3 rounded-full transition-all ${i < currentChallenge.days_completed ? 'bg-amber-500' : 'bg-muted/50'}`} />
                ))}
                <span className="ml-2 text-sm text-muted-foreground">
                  Day {currentChallenge.days_completed} of {currentChallenge.total_days}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2 mb-4" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {data?.daysRemainingInWeek || 0} days remaining
                </div>
                <Button
                  onClick={handleCheckIn}
                  disabled={isCheckinLoading || isCooldownActive}
                  size="sm"
                  className={isCooldownActive
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500"
                  }
                >
                  {isCooldownActive ? (
                    <><Timer className="h-4 w-4 mr-2" />Next in {cooldownRemaining}</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4 mr-2" />Check In Today</>
                  )}
                </Button>
              </div>
            </>
          )}

          {isCompleted && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <Sparkles className="h-5 w-5 text-green-400" />
              <span className="text-sm text-green-400 font-medium">Challenge completed! Great job!</span>
            </div>
          )}

          {!currentChallenge && availableChallenge && (
            <Button onClick={handleStartChallenge} disabled={isCheckinLoading} className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500">
              <Flame className="h-4 w-4 mr-2" />Start This Week's Challenge
            </Button>
          )}
        </div>

        {data?.history && data.history.length > 0 && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-2"><Trophy className="h-4 w-4" />Challenge History</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {data.history.slice(0, 5).map((challenge) => (
                <div key={challenge.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <span className="text-sm font-medium">{getChallengeTitle(challenge.challenge_id, t)}</span>
                    <div className="text-xs text-muted-foreground">{challenge.days_completed}/{challenge.total_days} days</div>
                  </div>
                  <Badge
                    variant={challenge.status === 'completed' ? 'default' : 'secondary'}
                    className={challenge.status === 'completed' ? 'bg-green-500/20 text-green-400' : ''}
                  >
                    {challenge.status === 'completed' ? 'Completed' : 'Incomplete'}
                  </Badge>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
