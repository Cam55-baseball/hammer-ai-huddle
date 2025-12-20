import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Scan, ChevronRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type BodyPart = 'head' | 'shoulders' | 'arms' | 'chest' | 'stomach' | 'back' | 'legs' | 'feet';

interface BodyPartConfig {
  id: BodyPart;
  labelKey: string;
  instruction: string;
  duration: number; // seconds to focus on this part
}

const bodyParts: BodyPartConfig[] = [
  { id: 'head', labelKey: 'head', instruction: 'Notice any tension in your forehead, jaw, or neck...', duration: 15 },
  { id: 'shoulders', labelKey: 'shoulders', instruction: 'Feel the weight in your shoulders, let them drop and relax...', duration: 15 },
  { id: 'arms', labelKey: 'arms', instruction: 'Scan from shoulders to fingertips, releasing any tightness...', duration: 15 },
  { id: 'chest', labelKey: 'chest', instruction: 'Notice your breathing, feel your chest rise and fall...', duration: 15 },
  { id: 'stomach', labelKey: 'stomach', instruction: 'Soften your belly, release any holding...', duration: 15 },
  { id: 'back', labelKey: 'back', instruction: 'Feel the length of your spine, let it relax...', duration: 15 },
  { id: 'legs', labelKey: 'legs', instruction: 'Scan from hips to feet, noticing any sensations...', duration: 15 },
  { id: 'feet', labelKey: 'feet', instruction: 'Feel your feet grounded, connected to the earth...', duration: 15 },
];

export default function BodyScanGuide() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [partTimer, setPartTimer] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [moodAfter, setMoodAfter] = useState<number | null>(null);

  const currentPart = bodyParts[currentPartIndex];
  const totalDuration = bodyParts.reduce((sum, p) => sum + p.duration, 0);
  const elapsedDuration = bodyParts.slice(0, currentPartIndex).reduce((sum, p) => sum + p.duration, 0) + partTimer;

  useEffect(() => {
    if (!isActive || isComplete) return;

    const interval = setInterval(() => {
      setPartTimer((prev) => {
        if (prev >= currentPart.duration - 1) {
          // Move to next body part
          if (currentPartIndex < bodyParts.length - 1) {
            setCurrentPartIndex(currentPartIndex + 1);
            return 0;
          } else {
            // Scan complete
            setIsActive(false);
            setIsComplete(true);
            return prev;
          }
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, currentPartIndex, currentPart, isComplete]);

  const handleMoodSelect = (mood: number) => {
    if (!isActive && !isComplete) {
      setMoodBefore(mood);
      setIsActive(true);
    } else if (isComplete && !moodAfter) {
      setMoodAfter(mood);
      saveSession(mood);
    }
  };

  const saveSession = async (afterMood: number) => {
    if (!user) return;
    try {
      await supabase.from('mindfulness_sessions').insert({
        user_id: user.id,
        session_type: 'body_scan',
        technique: 'full_body_scan',
        duration_seconds: totalDuration,
        completed: true,
        mood_before: moodBefore,
        mood_after: afterMood,
      });
      toast.success(t('mindfulness.bodyScan.saved', 'Body scan completed!'));
    } catch (error) {
      console.error('Error saving body scan:', error);
    }
  };

  const resetScan = () => {
    setIsActive(false);
    setCurrentPartIndex(0);
    setPartTimer(0);
    setIsComplete(false);
    setMoodBefore(null);
    setMoodAfter(null);
  };

  const overallProgress = (elapsedDuration / totalDuration) * 100;
  const partProgress = (partTimer / currentPart.duration) * 100;

  // Pre-scan mood check
  if (!moodBefore && !isActive && !isComplete) {
    return (
      <Card className="border-wellness-sage/30 bg-gradient-to-br from-wellness-cream to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Scan className="h-5 w-5 text-wellness-sage" />
            {t('mindfulness.bodyScan.title', 'Body Scan Guide')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6 py-4">
          <p className="text-muted-foreground">
            {t('mindfulness.bodyScan.intro', 'A 2-minute guided body scan to release tension and increase awareness.')}
          </p>
          
          <h3 className="font-medium">
            {t('mindfulness.bodyScan.moodCheck', 'How are you feeling before we begin?')}
          </h3>
          
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((mood) => (
              <Button
                key={mood}
                variant="outline"
                size="lg"
                onClick={() => handleMoodSelect(mood)}
                className="w-12 h-12 text-xl"
              >
                {['😔', '😕', '😐', '🙂', '😊'][mood - 1]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Post-scan mood check
  if (isComplete && !moodAfter) {
    return (
      <Card className="border-wellness-sage/30 bg-gradient-to-br from-wellness-cream to-white">
        <CardContent className="text-center space-y-6 py-8">
          <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
          <h3 className="text-xl font-semibold text-green-700">
            {t('mindfulness.bodyScan.complete', 'Scan Complete')}
          </h3>
          
          <h4 className="font-medium">
            {t('mindfulness.bodyScan.moodAfter', 'How do you feel now?')}
          </h4>
          
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((mood) => (
              <Button
                key={mood}
                variant="outline"
                size="lg"
                onClick={() => handleMoodSelect(mood)}
                className="w-12 h-12 text-xl"
              >
                {['😔', '😕', '😐', '🙂', '😊'][mood - 1]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Final completion
  if (isComplete && moodAfter) {
    const improvement = moodAfter - (moodBefore || 3);
    return (
      <Card className="border-wellness-sage/30 bg-gradient-to-br from-wellness-cream to-white">
        <CardContent className="text-center space-y-6 py-8">
          <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
          <h3 className="text-xl font-semibold">
            {t('mindfulness.bodyScan.wellDone', 'Well Done!')}
          </h3>
          
          {improvement > 0 && (
            <p className="text-green-600">
              {t('mindfulness.bodyScan.improved', 'Your mood improved by {{points}} points!', { points: improvement })}
            </p>
          )}
          
          <Button onClick={resetScan} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('mindfulness.bodyScan.doAgain', 'Do Another Scan')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Active scan
  return (
    <Card className="border-wellness-sage/30 bg-gradient-to-br from-wellness-cream to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scan className="h-5 w-5 text-wellness-sage" />
          {t('mindfulness.bodyScan.title', 'Body Scan Guide')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{t('mindfulness.bodyScan.progress', 'Progress')}</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Body Part Visual */}
        <div className="flex justify-center py-4">
          <div className="relative">
            {/* Simple body outline with highlighted part */}
            <div className="w-24 h-48 relative">
              {bodyParts.map((part, index) => {
                const isCurrentPart = index === currentPartIndex;
                const isCompletedPart = index < currentPartIndex;
                
                const positions: Record<BodyPart, string> = {
                  head: 'top-0 left-1/2 -translate-x-1/2',
                  shoulders: 'top-8 left-1/2 -translate-x-1/2',
                  arms: 'top-12 left-1/2 -translate-x-1/2',
                  chest: 'top-16 left-1/2 -translate-x-1/2',
                  stomach: 'top-20 left-1/2 -translate-x-1/2',
                  back: 'top-24 left-1/2 -translate-x-1/2',
                  legs: 'top-32 left-1/2 -translate-x-1/2',
                  feet: 'top-40 left-1/2 -translate-x-1/2',
                };

                return (
                  <div
                    key={part.id}
                    className={cn(
                      'absolute w-16 h-6 rounded-full transition-all duration-500',
                      positions[part.id],
                      isCurrentPart && 'bg-wellness-sage animate-pulse scale-110',
                      isCompletedPart && 'bg-green-300',
                      !isCurrentPart && !isCompletedPart && 'bg-gray-200'
                    )}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Current Part Info */}
        <div className="text-center space-y-3">
          <h3 className="text-xl font-semibold">
            {t(`mindfulness.bodyScan.parts.${currentPart.id}`, currentPart.id.charAt(0).toUpperCase() + currentPart.id.slice(1))}
          </h3>
          <p className="text-muted-foreground">
            {t(`mindfulness.bodyScan.instructions.${currentPart.id}`, currentPart.instruction)}
          </p>
          
          {/* Part Progress */}
          <Progress value={partProgress} className="h-1" />
        </div>

        {/* Part Navigation */}
        <div className="flex justify-center gap-1">
          {bodyParts.map((_, index) => (
            <div
              key={index}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                index === currentPartIndex && 'bg-wellness-sage',
                index < currentPartIndex && 'bg-green-500',
                index > currentPartIndex && 'bg-gray-300'
              )}
            />
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={resetScan} className="w-full">
          {t('common.cancel', 'Cancel')}
        </Button>
      </CardContent>
    </Card>
  );
}
