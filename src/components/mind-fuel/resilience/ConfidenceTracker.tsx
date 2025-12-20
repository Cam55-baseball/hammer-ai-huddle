import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { TrendingUp, Save, Calendar, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';

interface ConfidenceEntry {
  date: string;
  level: number;
}

export default function ConfidenceTracker() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [confidenceLevel, setConfidenceLevel] = useState(5);
  const [isSaving, setIsSaving] = useState(false);
  const [recentEntries, setRecentEntries] = useState<ConfidenceEntry[]>([]);
  const [todayLogged, setTodayLogged] = useState(false);

  useEffect(() => {
    loadRecentEntries();
  }, []);

  const loadRecentEntries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('vault_focus_quizzes')
        .select('entry_date, mental_readiness')
        .eq('user_id', user.id)
        .gte('entry_date', sevenDaysAgo)
        .order('entry_date', { ascending: false });

      if (error) throw error;

      const entries = data?.map(d => ({
        date: d.entry_date,
        level: d.mental_readiness
      })) || [];

      setRecentEntries(entries);
      
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayEntry = entries.find(e => e.date === today);
      if (todayEntry) {
        setTodayLogged(true);
        setConfidenceLevel(todayEntry.level);
      }
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const today = format(new Date(), 'yyyy-MM-dd');

      const { error } = await supabase.from('vault_focus_quizzes').upsert({
        user_id: user.id,
        entry_date: today,
        quiz_type: 'confidence',
        mental_readiness: confidenceLevel,
        physical_readiness: 5,
        emotional_state: 5
      }, {
        onConflict: 'user_id,entry_date,quiz_type'
      });

      if (error) throw error;

      setTodayLogged(true);
      toast({
        title: t('mentalWellness.resilience.confidence.saved', 'Confidence Logged'),
        description: t('mentalWellness.resilience.confidence.savedDesc', 'Keep tracking to see your progress!')
      });
      
      loadRecentEntries();
    } catch (error) {
      console.error('Error saving confidence:', error);
      toast({
        title: t('common.error', 'Error'),
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getConfidenceLabel = (level: number) => {
    if (level <= 2) return t('mentalWellness.resilience.confidence.levels.veryLow', 'Very Low');
    if (level <= 4) return t('mentalWellness.resilience.confidence.levels.low', 'Low');
    if (level <= 6) return t('mentalWellness.resilience.confidence.levels.moderate', 'Moderate');
    if (level <= 8) return t('mentalWellness.resilience.confidence.levels.high', 'High');
    return t('mentalWellness.resilience.confidence.levels.veryHigh', 'Very High');
  };

  const getConfidenceColor = (level: number) => {
    if (level <= 2) return 'bg-red-500';
    if (level <= 4) return 'bg-orange-500';
    if (level <= 6) return 'bg-yellow-500';
    if (level <= 8) return 'bg-wellness-sage';
    return 'bg-green-500';
  };

  const averageConfidence = recentEntries.length > 0
    ? (recentEntries.reduce((sum, e) => sum + e.level, 0) / recentEntries.length).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-wellness-coral/20 to-wellness-lavender/20 border-wellness-coral/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-wellness-coral" />
            {t('mentalWellness.resilience.confidence.title', 'Confidence Tracker')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('mentalWellness.resilience.confidence.intro', 'Track your daily confidence levels to understand patterns and build self-belief over time.')}
          </p>
        </CardContent>
      </Card>

      {/* Today's entry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            {t('mentalWellness.resilience.confidence.today', "Today's Confidence")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className={`inline-flex items-center justify-center h-20 w-20 rounded-full ${getConfidenceColor(confidenceLevel)} text-white mb-2`}>
              <span className="text-3xl font-bold">{confidenceLevel}</span>
            </div>
            <p className="text-lg font-medium">{getConfidenceLabel(confidenceLevel)}</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
            <Slider
              value={[confidenceLevel]}
              onValueChange={(v) => setConfidenceLevel(v[0])}
              min={1}
              max={10}
              step={1}
              disabled={todayLogged}
              className="py-4"
            />
          </div>

          <Button 
            onClick={handleSave}
            disabled={isSaving || todayLogged}
            className="w-full bg-wellness-coral hover:bg-wellness-coral/90 gap-2"
          >
            <Save className="h-4 w-4" />
            {todayLogged 
              ? t('mentalWellness.resilience.confidence.alreadyLogged', 'Already Logged Today')
              : isSaving 
                ? t('common.saving', 'Saving...') 
                : t('common.save', 'Save')}
          </Button>
        </CardContent>
      </Card>

      {/* Stats */}
      {recentEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-wellness-sage" />
              {t('mentalWellness.resilience.confidence.weeklyStats', '7-Day Overview')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-wellness-cream/50 rounded-lg">
                <p className="text-2xl font-bold text-wellness-coral">{averageConfidence}</p>
                <p className="text-xs text-muted-foreground">
                  {t('mentalWellness.resilience.confidence.average', 'Average')}
                </p>
              </div>
              <div className="text-center p-3 bg-wellness-cream/50 rounded-lg">
                <p className="text-2xl font-bold text-wellness-sage">{recentEntries.length}</p>
                <p className="text-xs text-muted-foreground">
                  {t('mentalWellness.resilience.confidence.daysLogged', 'Days Logged')}
                </p>
              </div>
            </div>

            {/* Mini chart */}
            <div className="flex items-end gap-1 h-16">
              {recentEntries.slice(0, 7).reverse().map((entry, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className={`w-full rounded-t ${getConfidenceColor(entry.level)}`}
                    style={{ height: `${entry.level * 10}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(entry.date), 'EEE').charAt(0)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
