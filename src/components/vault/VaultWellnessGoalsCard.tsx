import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Target, Smile, AlertTriangle, Sword, Bell, Check, AlertCircle, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { startOfWeek, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface WeeklyGoals {
  id?: string;
  target_mood_level: number;
  target_stress_level: number;
  target_discipline_level: number;
  notification_enabled: boolean;
}

interface WeeklyAverages {
  mood: number | null;
  stress: number | null;
  discipline: number | null;
}

export function VaultWellnessGoalsCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goals, setGoals] = useState<WeeklyGoals>({
    target_mood_level: 4,
    target_stress_level: 2,
    target_discipline_level: 4,
    notification_enabled: true
  });
  const [averages, setAverages] = useState<WeeklyAverages>({ mood: null, stress: null, discipline: null });
  const [hasExistingGoals, setHasExistingGoals] = useState(false);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch existing goals for this week
      const { data: goalsData } = await supabase
        .from('vault_wellness_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start_date', weekStartStr)
        .maybeSingle();

      if (goalsData) {
        setGoals({
          id: goalsData.id,
          target_mood_level: goalsData.target_mood_level || 4,
          target_stress_level: goalsData.target_stress_level || 2,
          target_discipline_level: goalsData.target_discipline_level || 4,
          notification_enabled: goalsData.notification_enabled ?? true
        });
        setHasExistingGoals(true);
      }

      // Fetch this week's quiz averages
      const weekEnd = new Date();
      const { data: quizData } = await supabase
        .from('vault_focus_quizzes')
        .select('mood_level, stress_level, discipline_level')
        .eq('user_id', user.id)
        .eq('quiz_type', 'morning')
        .gte('entry_date', weekStartStr)
        .lte('entry_date', format(weekEnd, 'yyyy-MM-dd'));

      if (quizData && quizData.length > 0) {
        const moodVals = quizData.filter(q => q.mood_level != null).map(q => q.mood_level!);
        const stressVals = quizData.filter(q => q.stress_level != null).map(q => q.stress_level!);
        const disciplineVals = quizData.filter(q => q.discipline_level != null).map(q => q.discipline_level!);

        setAverages({
          mood: moodVals.length > 0 ? Math.round((moodVals.reduce((a, b) => a + b, 0) / moodVals.length) * 10) / 10 : null,
          stress: stressVals.length > 0 ? Math.round((stressVals.reduce((a, b) => a + b, 0) / stressVals.length) * 10) / 10 : null,
          discipline: disciplineVals.length > 0 ? Math.round((disciplineVals.reduce((a, b) => a + b, 0) / disciplineVals.length) * 10) / 10 : null
        });
      }

      setLoading(false);
    };

    fetchData();
  }, [user, weekStartStr]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      week_start_date: weekStartStr,
      target_mood_level: goals.target_mood_level,
      target_stress_level: goals.target_stress_level,
      target_discipline_level: goals.target_discipline_level,
      notification_enabled: goals.notification_enabled
    };

    const { error } = await supabase
      .from('vault_wellness_goals')
      .upsert(payload, { onConflict: 'user_id,week_start_date' });

    setSaving(false);

    if (error) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive'
      });
    } else {
      setHasExistingGoals(true);
      toast({
        title: t('vault.wellnessGoals.savedSuccess'),
        description: t('vault.wellnessGoals.goalsUpdated')
      });
    }
  };

  const getStatusIcon = (current: number | null, target: number, isStress: boolean = false) => {
    if (current === null) return null;
    
    if (isStress) {
      // For stress, lower is better
      if (current <= target) return <Check className="h-4 w-4 text-green-500" />;
      if (current <= target + 0.5) return <AlertCircle className="h-4 w-4 text-amber-500" />;
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    } else {
      // For mood/discipline, higher is better
      if (current >= target) return <Check className="h-4 w-4 text-green-500" />;
      if (current >= target - 0.5) return <AlertCircle className="h-4 w-4 text-amber-500" />;
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = (current: number | null, target: number, isStress: boolean = false) => {
    if (current === null) return t('vault.wellnessGoals.noDataYet');
    
    if (isStress) {
      if (current <= target) return t('vault.wellnessGoals.onTrack');
      if (current <= target + 0.5) return t('vault.wellnessGoals.slightlyOff');
      return t('vault.wellnessGoals.offTrack');
    } else {
      if (current >= target) return t('vault.wellnessGoals.exceedingGoal');
      if (current >= target - 0.5) return t('vault.wellnessGoals.slightlyOff');
      return t('vault.wellnessGoals.offTrack');
    }
  };

  const getStatusColor = (current: number | null, target: number, isStress: boolean = false) => {
    if (current === null) return 'text-muted-foreground';
    
    if (isStress) {
      if (current <= target) return 'text-green-500';
      if (current <= target + 0.5) return 'text-amber-500';
      return 'text-red-500';
    } else {
      if (current >= target) return 'text-green-500';
      if (current >= target - 0.5) return 'text-amber-500';
      return 'text-red-500';
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/20">
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-emerald-500" />
          {t('vault.wellnessGoals.title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('vault.wellnessGoals.subtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Target Mood */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Smile className="h-4 w-4 text-yellow-500" />
              {t('vault.wellnessGoals.targetMood')}
            </Label>
            <span className="text-lg font-bold text-yellow-500">{goals.target_mood_level}</span>
          </div>
          <Slider
            value={[goals.target_mood_level]}
            onValueChange={([val]) => setGoals({ ...goals, target_mood_level: val })}
            min={1}
            max={5}
            step={1}
            className="w-full"
          />
          {averages.mood !== null && (
            <div className={cn("flex items-center gap-2 text-xs", getStatusColor(averages.mood, goals.target_mood_level))}>
              {getStatusIcon(averages.mood, goals.target_mood_level)}
              <span>{t('vault.wellnessGoals.currentAvg')}: {averages.mood}</span>
              <span>•</span>
              <span>{getStatusText(averages.mood, goals.target_mood_level)}</span>
            </div>
          )}
        </div>

        {/* Max Stress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              {t('vault.wellnessGoals.maxStress')}
            </Label>
            <span className="text-lg font-bold text-orange-500">{goals.target_stress_level}</span>
          </div>
          <Slider
            value={[goals.target_stress_level]}
            onValueChange={([val]) => setGoals({ ...goals, target_stress_level: val })}
            min={1}
            max={5}
            step={1}
            className="w-full"
          />
          {averages.stress !== null && (
            <div className={cn("flex items-center gap-2 text-xs", getStatusColor(averages.stress, goals.target_stress_level, true))}>
              {getStatusIcon(averages.stress, goals.target_stress_level, true)}
              <span>{t('vault.wellnessGoals.currentAvg')}: {averages.stress}</span>
              <span>•</span>
              <span>{getStatusText(averages.stress, goals.target_stress_level, true)}</span>
            </div>
          )}
        </div>

        {/* Target Discipline */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Sword className="h-4 w-4 text-blue-500" />
              {t('vault.wellnessGoals.targetDiscipline')}
            </Label>
            <span className="text-lg font-bold text-blue-500">{goals.target_discipline_level}</span>
          </div>
          <Slider
            value={[goals.target_discipline_level]}
            onValueChange={([val]) => setGoals({ ...goals, target_discipline_level: val })}
            min={1}
            max={5}
            step={1}
            className="w-full"
          />
          {averages.discipline !== null && (
            <div className={cn("flex items-center gap-2 text-xs", getStatusColor(averages.discipline, goals.target_discipline_level))}>
              {getStatusIcon(averages.discipline, goals.target_discipline_level)}
              <span>{t('vault.wellnessGoals.currentAvg')}: {averages.discipline}</span>
              <span>•</span>
              <span>{getStatusText(averages.discipline, goals.target_discipline_level)}</span>
            </div>
          )}
        </div>

        {/* Notifications Toggle */}
        <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">{t('vault.wellnessGoals.notifications')}</p>
              <p className="text-xs text-muted-foreground">{t('vault.wellnessGoals.notificationsDesc')}</p>
            </div>
          </div>
          <Switch
            checked={goals.notification_enabled}
            onCheckedChange={(checked) => setGoals({ ...goals, notification_enabled: checked })}
          />
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          {saving ? t('common.loading') : hasExistingGoals ? t('vault.wellnessGoals.updateGoals') : t('vault.wellnessGoals.setGoals')}
        </Button>
      </CardContent>
    </Card>
  );
}

// Off-track notification checker - to be called after morning quiz submission
export async function checkWellnessGoalsAndNotify(
  userId: string,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  // Get goals
  const { data: goalsData } = await supabase
    .from('vault_wellness_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start_date', weekStartStr)
    .maybeSingle();

  if (!goalsData || !goalsData.notification_enabled) return;

  // Get this week's averages
  const { data: quizData } = await supabase
    .from('vault_focus_quizzes')
    .select('mood_level, stress_level, discipline_level')
    .eq('user_id', userId)
    .eq('quiz_type', 'morning')
    .gte('entry_date', weekStartStr);

  if (!quizData || quizData.length < 2) return; // Need at least 2 data points

  const moodVals = quizData.filter(q => q.mood_level != null).map(q => q.mood_level!);
  const stressVals = quizData.filter(q => q.stress_level != null).map(q => q.stress_level!);
  const disciplineVals = quizData.filter(q => q.discipline_level != null).map(q => q.discipline_level!);

  const avgMood = moodVals.length > 0 ? moodVals.reduce((a, b) => a + b, 0) / moodVals.length : null;
  const avgStress = stressVals.length > 0 ? stressVals.reduce((a, b) => a + b, 0) / stressVals.length : null;
  const avgDiscipline = disciplineVals.length > 0 ? disciplineVals.reduce((a, b) => a + b, 0) / disciplineVals.length : null;

  // Check for off-track conditions
  if (avgMood !== null && avgMood < goalsData.target_mood_level - 0.5) {
    toast({
      title: '💛 ' + t('vault.wellnessGoals.moodAlert'),
      description: t('vault.wellnessGoals.moodAlertDesc'),
      variant: 'default'
    });
  }

  if (avgStress !== null && avgStress > goalsData.target_stress_level + 0.5) {
    toast({
      title: '🧘 ' + t('vault.wellnessGoals.stressAlert'),
      description: t('vault.wellnessGoals.stressAlertDesc'),
      variant: 'default'
    });
  }

  if (avgDiscipline !== null && avgDiscipline < goalsData.target_discipline_level - 0.5) {
    toast({
      title: '⚔️ ' + t('vault.wellnessGoals.disciplineAlert'),
      description: t('vault.wellnessGoals.disciplineAlertDesc'),
      variant: 'default'
    });
  }
}
