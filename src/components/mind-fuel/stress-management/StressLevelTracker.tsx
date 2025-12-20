import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, TrendingDown, Minus, Calendar, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StressEntry {
  id: string;
  score: number;
  severity: string;
  assessment_date: string;
  recommendations: string[];
}

const stressLabels = [
  { level: 1, label: 'Very Low', color: 'bg-green-500' },
  { level: 2, label: 'Low', color: 'bg-green-400' },
  { level: 3, label: 'Mild', color: 'bg-yellow-400' },
  { level: 4, label: 'Moderate', color: 'bg-orange-400' },
  { level: 5, label: 'High', color: 'bg-orange-500' },
  { level: 6, label: 'Very High', color: 'bg-red-400' },
  { level: 7, label: 'Severe', color: 'bg-red-500' },
  { level: 8, label: 'Extreme', color: 'bg-red-600' },
  { level: 9, label: 'Critical', color: 'bg-red-700' },
  { level: 10, label: 'Crisis', color: 'bg-red-800' },
];

export default function StressLevelTracker() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stressLevel, setStressLevel] = useState<number[]>([5]);
  const [notes, setNotes] = useState('');
  const [recentEntries, setRecentEntries] = useState<StressEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRecentEntries();
    }
  }, [user]);

  const fetchRecentEntries = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('stress_assessments')
        .select('*')
        .eq('user_id', user.id)
        .eq('assessment_type', 'daily_stress')
        .order('assessment_date', { ascending: false })
        .limit(7);

      if (error) throw error;
      setRecentEntries(data || []);
    } catch (error) {
      console.error('Error fetching stress entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverity = (level: number): string => {
    if (level <= 2) return 'low';
    if (level <= 4) return 'mild';
    if (level <= 6) return 'moderate';
    if (level <= 8) return 'high';
    return 'severe';
  };

  const getRecommendations = (level: number): string[] => {
    if (level <= 2) {
      return [
        t('stressManagement.tracker.recs.low1', 'Great job managing stress!'),
        t('stressManagement.tracker.recs.low2', 'Keep up your current routine'),
      ];
    }
    if (level <= 4) {
      return [
        t('stressManagement.tracker.recs.mild1', 'Try a quick breathing exercise'),
        t('stressManagement.tracker.recs.mild2', 'Take a short walk'),
      ];
    }
    if (level <= 6) {
      return [
        t('stressManagement.tracker.recs.mod1', 'Practice box breathing for 5 minutes'),
        t('stressManagement.tracker.recs.mod2', 'Consider talking to someone'),
      ];
    }
    if (level <= 8) {
      return [
        t('stressManagement.tracker.recs.high1', 'Use grounding techniques'),
        t('stressManagement.tracker.recs.high2', 'Reach out to your support system'),
      ];
    }
    return [
      t('stressManagement.tracker.recs.severe1', 'Consider professional support'),
      t('stressManagement.tracker.recs.severe2', 'Use crisis resources if needed'),
    ];
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const level = stressLevel[0];
      const { error } = await supabase.from('stress_assessments').insert({
        user_id: user.id,
        assessment_type: 'daily_stress',
        score: level,
        severity: getSeverity(level),
        recommendations: getRecommendations(level),
        responses: notes ? { notes } : null,
      });

      if (error) throw error;

      toast.success(t('stressManagement.tracker.saved', 'Stress level logged'));
      setNotes('');
      fetchRecentEntries();
    } catch (error) {
      console.error('Error saving stress level:', error);
      toast.error(t('common.error', 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const getTrend = () => {
    if (recentEntries.length < 2) return null;
    const recent = recentEntries[0].score;
    const previous = recentEntries[1].score;
    if (recent < previous) return 'down';
    if (recent > previous) return 'up';
    return 'stable';
  };

  const currentLabel = stressLabels[stressLevel[0] - 1];
  const trend = getTrend();

  return (
    <Card className="border-wellness-lavender/30 bg-gradient-to-br from-wellness-cream to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-wellness-lavender" />
          {t('stressManagement.tracker.title', 'Stress Level Tracker')}
          {trend && (
            <Badge variant="outline" className="ml-auto">
              {trend === 'down' && <TrendingDown className="h-3 w-3 mr-1 text-green-500" />}
              {trend === 'up' && <TrendingUp className="h-3 w-3 mr-1 text-red-500" />}
              {trend === 'stable' && <Minus className="h-3 w-3 mr-1 text-yellow-500" />}
              {trend === 'down' && t('stressManagement.tracker.improving', 'Improving')}
              {trend === 'up' && t('stressManagement.tracker.increasing', 'Increasing')}
              {trend === 'stable' && t('stressManagement.tracker.stable', 'Stable')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Level Display */}
        <div className="text-center space-y-2">
          <div className="text-5xl font-bold">{stressLevel[0]}</div>
          <Badge className={cn(currentLabel.color, 'text-white')}>
            {t(`stressManagement.tracker.levels.${currentLabel.label.toLowerCase().replace(' ', '')}`, currentLabel.label)}
          </Badge>
        </div>

        {/* Slider */}
        <div className="space-y-3">
          <Slider
            value={stressLevel}
            onValueChange={setStressLevel}
            min={1}
            max={10}
            step={1}
            className="py-4"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('stressManagement.tracker.calm', 'Calm')}</span>
            <span>{t('stressManagement.tracker.overwhelmed', 'Overwhelmed')}</span>
          </div>
        </div>

        {/* Notes */}
        <Textarea
          placeholder={t('stressManagement.tracker.notesPlaceholder', 'What\'s contributing to your stress? (optional)')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        {/* Save Button */}
        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {isSaving 
            ? t('common.loading', 'Loading...') 
            : t('stressManagement.tracker.logStress', 'Log Stress Level')}
        </Button>

        {/* Recent Entries */}
        {recentEntries.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('stressManagement.tracker.recent', 'Recent Entries')}
            </h4>
            <div className="flex gap-2 flex-wrap">
              {recentEntries.slice(0, 7).map((entry) => {
                const label = stressLabels[entry.score - 1];
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white',
                      label.color
                    )}
                    title={new Date(entry.assessment_date).toLocaleDateString()}
                  >
                    {entry.score}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
