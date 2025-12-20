import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Heart, Wind, Eye, Hand, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = 'intro' | 'breathing' | 'grounding' | 'affirmation' | 'complete';

const affirmations = [
  'This feeling will pass.',
  'I am safe right now.',
  'I can handle this.',
  'I am stronger than my anxiety.',
  'I breathe in calm, I breathe out tension.',
];

export default function PanicCalmingProtocol() {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<Step>('intro');
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathCount, setBreathCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [groundingItems, setGroundingItems] = useState<string[]>([]);
  const [currentAffirmation, setCurrentAffirmation] = useState(0);

  const targetBreaths = 5;
  const breathDuration = { inhale: 4, hold: 4, exhale: 6 };

  // Breathing animation
  useEffect(() => {
    if (currentStep !== 'breathing') return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        const phaseDuration = breathDuration[breathPhase];
        if (prev >= phaseDuration) {
          // Move to next phase
          if (breathPhase === 'inhale') {
            setBreathPhase('hold');
          } else if (breathPhase === 'hold') {
            setBreathPhase('exhale');
          } else {
            setBreathPhase('inhale');
            setBreathCount((c) => c + 1);
          }
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentStep, breathPhase]);

  // Check if breathing is complete
  useEffect(() => {
    if (breathCount >= targetBreaths) {
      setCurrentStep('grounding');
    }
  }, [breathCount]);

  const handleGroundingInput = (item: string) => {
    if (item.trim() && groundingItems.length < 3) {
      setGroundingItems([...groundingItems, item.trim()]);
    }
    if (groundingItems.length >= 2) {
      setTimeout(() => setCurrentStep('affirmation'), 500);
    }
  };

  const handleAffirmationNext = () => {
    if (currentAffirmation < affirmations.length - 1) {
      setCurrentAffirmation(currentAffirmation + 1);
    } else {
      setCurrentStep('complete');
    }
  };

  const resetProtocol = () => {
    setCurrentStep('intro');
    setBreathPhase('inhale');
    setBreathCount(0);
    setTimer(0);
    setGroundingItems([]);
    setCurrentAffirmation(0);
  };

  const getProgress = () => {
    switch (currentStep) {
      case 'intro': return 0;
      case 'breathing': return 25;
      case 'grounding': return 50;
      case 'affirmation': return 75;
      case 'complete': return 100;
    }
  };

  return (
    <Card className="border-wellness-warning/30 bg-gradient-to-br from-red-50 to-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-wellness-warning" />
          {t('stressManagement.panic.title', 'Panic Calming Protocol')}
        </CardTitle>
        <Progress value={getProgress()} className="h-2 mt-2" />
      </CardHeader>
      <CardContent>
        {/* Intro Step */}
        {currentStep === 'intro' && (
          <div className="text-center space-y-6 py-4">
            <div className="space-y-2">
              <Heart className="h-12 w-12 mx-auto text-red-400 animate-pulse" />
              <h3 className="text-xl font-semibold">
                {t('stressManagement.panic.introTitle', 'Take a moment')}
              </h3>
              <p className="text-muted-foreground">
                {t('stressManagement.panic.introDesc', 'This guided exercise will help calm your nervous system. It takes about 3-5 minutes.')}
              </p>
            </div>
            <Button onClick={() => setCurrentStep('breathing')} size="lg" className="bg-red-500 hover:bg-red-600">
              {t('stressManagement.panic.start', 'Start Calming Protocol')}
            </Button>
          </div>
        )}

        {/* Breathing Step */}
        {currentStep === 'breathing' && (
          <div className="text-center space-y-6 py-4">
            <div className="space-y-2">
              <Wind className="h-10 w-10 mx-auto text-blue-400" />
              <h3 className="text-lg font-semibold">
                {t('stressManagement.panic.breathingTitle', 'Calming Breaths')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('stressManagement.panic.breathingDesc', 'Follow the breathing pattern')}
              </p>
            </div>

            {/* Breathing Animation */}
            <div className="relative w-40 h-40 mx-auto">
              <div
                className={cn(
                  'absolute inset-0 rounded-full transition-all duration-1000 flex items-center justify-center',
                  breathPhase === 'inhale' && 'scale-110 bg-blue-200',
                  breathPhase === 'hold' && 'scale-110 bg-purple-200',
                  breathPhase === 'exhale' && 'scale-90 bg-green-200'
                )}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {breathPhase === 'inhale' && t('stressManagement.panic.inhale', 'Inhale')}
                    {breathPhase === 'hold' && t('stressManagement.panic.hold', 'Hold')}
                    {breathPhase === 'exhale' && t('stressManagement.panic.exhale', 'Exhale')}
                  </div>
                  <div className="text-lg">{breathDuration[breathPhase] - timer}</div>
                </div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              {t('stressManagement.panic.breathProgress', 'Breath {{current}} of {{total}}', {
                current: breathCount + 1,
                total: targetBreaths,
              })}
            </div>
          </div>
        )}

        {/* Grounding Step */}
        {currentStep === 'grounding' && (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <Eye className="h-10 w-10 mx-auto text-green-500" />
              <h3 className="text-lg font-semibold">
                {t('stressManagement.panic.groundingTitle', 'Quick Grounding')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('stressManagement.panic.groundingDesc', 'Name 3 things you can see right now')}
              </p>
            </div>

            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  {groundingItems[i] ? (
                    <div className="flex-1 p-3 bg-green-100 rounded-lg flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>{groundingItems[i]}</span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder={t('stressManagement.panic.groundingPlaceholder', 'I can see...')}
                      className="flex-1 p-3 border rounded-lg"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleGroundingInput((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value) {
                          handleGroundingInput(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      autoFocus={i === groundingItems.length}
                      disabled={i !== groundingItems.length}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Affirmation Step */}
        {currentStep === 'affirmation' && (
          <div className="text-center space-y-6 py-4">
            <div className="space-y-2">
              <Hand className="h-10 w-10 mx-auto text-purple-500" />
              <h3 className="text-lg font-semibold">
                {t('stressManagement.panic.affirmationTitle', 'Affirm & Ground')}
              </h3>
            </div>

            <div className="p-6 bg-purple-100 rounded-xl">
              <p className="text-xl font-medium text-purple-800">
                "{t(`stressManagement.panic.affirmations.a${currentAffirmation}`, affirmations[currentAffirmation])}"
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              {t('stressManagement.panic.repeatSilently', 'Repeat this silently to yourself')}
            </p>

            <Button onClick={handleAffirmationNext} className="bg-purple-500 hover:bg-purple-600">
              {currentAffirmation < affirmations.length - 1
                ? t('common.next', 'Next')
                : t('stressManagement.panic.finish', 'Finish')}
            </Button>

            <div className="flex justify-center gap-1">
              {affirmations.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-2 h-2 rounded-full',
                    i <= currentAffirmation ? 'bg-purple-500' : 'bg-purple-200'
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {/* Complete Step */}
        {currentStep === 'complete' && (
          <div className="text-center space-y-6 py-4">
            <div className="space-y-2">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
              <h3 className="text-xl font-semibold text-green-700">
                {t('stressManagement.panic.completeTitle', 'Well Done')}
              </h3>
              <p className="text-muted-foreground">
                {t('stressManagement.panic.completeDesc', 'Take a moment to notice how you feel now. You successfully calmed your nervous system.')}
              </p>
            </div>

            <div className="space-y-3">
              <Button onClick={resetProtocol} variant="outline" className="w-full">
                {t('stressManagement.panic.doAgain', 'Do Again')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
