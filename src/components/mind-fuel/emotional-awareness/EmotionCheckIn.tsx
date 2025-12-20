import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EmotionWheel from './EmotionWheel';
import { Loader2, TrendingUp, TrendingDown, Minus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecentQuizData {
  mood_level: number | null;
  stress_level: number | null;
  entry_date: string;
}

interface EmotionCheckInProps {
  onComplete?: () => void;
}

export default function EmotionCheckIn({ onComplete }: EmotionCheckInProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [step, setStep] = useState<'context' | 'emotion' | 'intensity' | 'notes' | 'complete'>('context');
  const [recentData, setRecentData] = useState<RecentQuizData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedEmotion, setSelectedEmotion] = useState<{ primary: string; secondary?: string } | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchRecentQuizData();
  }, []);

  const fetchRecentQuizData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('vault_focus_quizzes')
        .select('mood_level, stress_level, entry_date')
        .eq('user_id', user.id)
        .gte('entry_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('entry_date', { ascending: false })
        .limit(7);

      if (error) throw error;
      setRecentData(data || []);
    } catch (error) {
      console.error('Error fetching quiz data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMoodTrend = () => {
    if (recentData.length < 2) return null;
    const validMoods = recentData.filter(d => d.mood_level !== null);
    if (validMoods.length < 2) return null;
    
    const recent = validMoods[0].mood_level!;
    const older = validMoods[validMoods.length - 1].mood_level!;
    
    if (recent > older) return 'up';
    if (recent < older) return 'down';
    return 'stable';
  };

  const getAverageMood = () => {
    const validMoods = recentData.filter(d => d.mood_level !== null);
    if (validMoods.length === 0) return null;
    const sum = validMoods.reduce((acc, d) => acc + (d.mood_level || 0), 0);
    return Math.round(sum / validMoods.length);
  };

  const getAverageStress = () => {
    const validStress = recentData.filter(d => d.stress_level !== null);
    if (validStress.length === 0) return null;
    const sum = validStress.reduce((acc, d) => acc + (d.stress_level || 0), 0);
    return Math.round(sum / validStress.length);
  };

  const handleEmotionSelect = (primary: string, secondary?: string) => {
    setSelectedEmotion({ primary, secondary });
  };

  const handleSave = async () => {
    if (!selectedEmotion) return;
    
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase.from('emotion_tracking').insert({
        user_id: user.id,
        emotion: selectedEmotion.secondary || selectedEmotion.primary,
        intensity,
        trigger_description: notes || null,
      });

      setStep('complete');
      toast({
        title: t('emotionalAwareness.checkIn.saved', 'Check-in saved'),
        description: t('emotionalAwareness.checkIn.savedDesc', 'Your emotional check-in has been recorded.'),
      });
      onComplete?.();
    } catch (error) {
      console.error('Error saving check-in:', error);
      toast({
        title: t('common.error', 'Error'),
        description: t('emotionalAwareness.checkIn.saveError', 'Failed to save check-in'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStep('context');
    setSelectedEmotion(null);
    setIntensity(5);
    setNotes('');
  };

  const moodTrend = getMoodTrend();
  const avgMood = getAverageMood();
  const avgStress = getAverageStress();

  return (
    <Card className="border-wellness-lavender/30 bg-gradient-to-br from-wellness-cream/50 to-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">💭</span>
          {t('emotionalAwareness.checkIn.title', 'Emotion Check-In')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('emotionalAwareness.checkIn.subtitle', "Take a moment to check in with how you're feeling")}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step: Context */}
        {step === 'context' && (
          <div className="space-y-4 animate-fade-in">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentData.length > 0 ? (
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium">
                  {t('emotionalAwareness.checkIn.recentActivity', 'Based on your recent activity...')}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {avgMood !== null && (
                    <div className="bg-background rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-sm text-muted-foreground">
                          {t('emotionalAwareness.checkIn.avgMood', 'Avg Mood')}
                        </span>
                        {moodTrend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                        {moodTrend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                        {moodTrend === 'stable' && <Minus className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <span className="text-xl font-bold">{avgMood}/10</span>
                    </div>
                  )}
                  {avgStress !== null && (
                    <div className="bg-background rounded-lg p-3 text-center">
                      <span className="text-sm text-muted-foreground block mb-1">
                        {t('emotionalAwareness.checkIn.avgStress', 'Avg Stress')}
                      </span>
                      <span className="text-xl font-bold">{avgStress}/10</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-muted/30 rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {t('emotionalAwareness.checkIn.noRecentData', 'No recent check-ins. Complete your daily quiz in the Vault to see trends!')}
                </p>
              </div>
            )}
            
            <div className="text-center pt-2">
              <h3 className="text-lg font-semibold mb-2">
                {t('emotionalAwareness.checkIn.howFeeling', 'How are you feeling right now?')}
              </h3>
              <Button onClick={() => setStep('emotion')}>
                {t('emotionalAwareness.checkIn.letsCheckIn', "Let's Check In")}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Emotion Selection */}
        {step === 'emotion' && (
          <div className="space-y-4 animate-fade-in">
            <EmotionWheel 
              onEmotionSelect={handleEmotionSelect}
              selectedEmotion={selectedEmotion || undefined}
            />
            {selectedEmotion && (
              <div className="flex justify-end">
                <Button onClick={() => setStep('intensity')}>
                  {t('common.next', 'Next')}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step: Intensity */}
        {step === 'intensity' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                {t('emotionalAwareness.checkIn.intensity', 'How intense is this feeling?')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('emotionalAwareness.checkIn.intensityDesc', '1 = barely noticeable, 10 = overwhelming')}
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{t('emotionalAwareness.checkIn.mild', 'Mild')}</span>
                <span className="font-bold text-lg text-foreground">{intensity}</span>
                <span>{t('emotionalAwareness.checkIn.intense', 'Intense')}</span>
              </div>
              <Slider
                value={[intensity]}
                onValueChange={(v) => setIntensity(v[0])}
                min={1}
                max={10}
                step={1}
                className="py-4"
              />
            </div>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('emotion')}>
                {t('common.back', 'Back')}
              </Button>
              <Button onClick={() => setStep('notes')}>
                {t('common.next', 'Next')}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Notes */}
        {step === 'notes' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                {t('emotionalAwareness.checkIn.addNotes', 'Add any notes (optional)')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('emotionalAwareness.checkIn.notesDesc', 'What might be contributing to this feeling?')}
              </p>
            </div>
            
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('emotionalAwareness.checkIn.notesPlaceholder', 'Write anything that comes to mind...')}
              rows={4}
            />
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('intensity')}>
                {t('common.back', 'Back')}
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                {t('emotionalAwareness.checkIn.save', 'Save Check-In')}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && (
          <div className="text-center space-y-4 animate-fade-in py-4">
            <div className="w-16 h-16 rounded-full bg-wellness-sage/30 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-wellness-sage" />
            </div>
            <h3 className="text-lg font-semibold">
              {t('emotionalAwareness.checkIn.complete', 'Check-In Complete!')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('emotionalAwareness.checkIn.completeDesc', 'Great job taking time to check in with yourself.')}
            </p>
            <Button variant="outline" onClick={handleReset}>
              {t('emotionalAwareness.checkIn.another', 'Do Another Check-In')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
