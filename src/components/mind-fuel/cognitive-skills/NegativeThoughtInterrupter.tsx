import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Hand, Eye, Ear, Wind, Heart, RotateCcw, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = 'intro' | 'stop' | 'breathe' | 'observe' | 'proceed' | 'complete';

interface StopStep {
  key: Step;
  letter: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  duration?: number;
}

export default function NegativeThoughtInterrupter() {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<Step>('intro');
  const [countdown, setCountdown] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const steps: StopStep[] = [
    {
      key: 'stop',
      letter: 'S',
      title: t('mentalWellness.cognitiveSkills.interrupter.stop.title', 'STOP'),
      description: t('mentalWellness.cognitiveSkills.interrupter.stop.desc', 'Mentally say "STOP" to interrupt the thought spiral. Visualize a stop sign.'),
      icon: Hand,
      color: 'wellness-coral',
      duration: 3
    },
    {
      key: 'breathe',
      letter: 'T',
      title: t('mentalWellness.cognitiveSkills.interrupter.take.title', 'TAKE A BREATH'),
      description: t('mentalWellness.cognitiveSkills.interrupter.take.desc', 'Take a slow, deep breath. Inhale for 4 counts, hold for 4, exhale for 4.'),
      icon: Wind,
      color: 'wellness-sky',
      duration: 12
    },
    {
      key: 'observe',
      letter: 'O',
      title: t('mentalWellness.cognitiveSkills.interrupter.observe.title', 'OBSERVE'),
      description: t('mentalWellness.cognitiveSkills.interrupter.observe.desc', 'Notice your thoughts without judgment. What triggered this? Is it fact or feeling?'),
      icon: Eye,
      color: 'wellness-lavender',
      duration: 10
    },
    {
      key: 'proceed',
      letter: 'P',
      title: t('mentalWellness.cognitiveSkills.interrupter.proceed.title', 'PROCEED'),
      description: t('mentalWellness.cognitiveSkills.interrupter.proceed.desc', 'Choose how to move forward mindfully. What\'s one small positive action you can take?'),
      icon: Heart,
      color: 'wellness-sage',
      duration: 8
    }
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0 && isActive) {
      setIsActive(false);
    }

    return () => clearInterval(interval);
  }, [countdown, isActive]);

  const handleStart = () => {
    setCurrentStep('stop');
    const stepData = steps.find(s => s.key === 'stop');
    if (stepData?.duration) {
      setCountdown(stepData.duration);
      setIsActive(true);
    }
  };

  const handleNextStep = () => {
    const currentIndex = steps.findIndex(s => s.key === currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      setCurrentStep(nextStep.key);
      if (nextStep.duration) {
        setCountdown(nextStep.duration);
        setIsActive(true);
      }
    } else {
      setCurrentStep('complete');
    }
  };

  const handleReset = () => {
    setCurrentStep('intro');
    setCountdown(0);
    setIsActive(false);
  };

  const currentStepData = steps.find(s => s.key === currentStep);

  if (currentStep === 'intro') {
    return (
      <Card className="bg-gradient-to-br from-wellness-coral/20 to-wellness-lavender/20 border-wellness-coral/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Hand className="h-5 w-5 text-wellness-coral" />
            {t('mentalWellness.cognitiveSkills.interrupter.title', 'STOP Technique')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {t('mentalWellness.cognitiveSkills.interrupter.intro', 'Use the STOP technique to interrupt negative thought spirals and regain control of your mind.')}
          </p>

          <div className="grid grid-cols-4 gap-2">
            {steps.map((step) => (
              <div key={step.key} className="text-center">
                <div className={`h-12 w-12 mx-auto rounded-full bg-${step.color}/20 flex items-center justify-center`}
                     style={{ backgroundColor: `hsl(var(--${step.color}) / 0.2)` }}>
                  <span className="text-xl font-bold" style={{ color: `hsl(var(--${step.color}))` }}>
                    {step.letter}
                  </span>
                </div>
                <p className="text-xs mt-1 text-muted-foreground">
                  {step.letter === 'S' ? 'Stop' : step.letter === 'T' ? 'Take' : step.letter === 'O' ? 'Observe' : 'Proceed'}
                </p>
              </div>
            ))}
          </div>

          <Button onClick={handleStart} className="w-full bg-wellness-coral hover:bg-wellness-coral/90">
            {t('mentalWellness.cognitiveSkills.interrupter.start', 'Start STOP Technique')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'complete') {
    return (
      <Card className="bg-gradient-to-br from-wellness-sage/20 to-wellness-sky/20 border-wellness-sage/30">
        <CardContent className="pt-6 text-center space-y-6">
          <div className="h-20 w-20 mx-auto rounded-full bg-wellness-sage/20 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-wellness-sage" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">
              {t('mentalWellness.cognitiveSkills.interrupter.complete.title', 'Well Done!')}
            </h3>
            <p className="text-muted-foreground">
              {t('mentalWellness.cognitiveSkills.interrupter.complete.desc', 'You\'ve successfully interrupted the negative thought pattern. Remember, you can use this technique anytime.')}
            </p>
          </div>
          <Button onClick={handleReset} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            {t('common.startOver', 'Start Over')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const Icon = currentStepData?.icon || Hand;

  return (
    <Card className={cn(
      "transition-colors duration-500",
      `border-${currentStepData?.color}/50`
    )}>
      <CardContent className="pt-6 space-y-6">
        {/* Progress */}
        <div className="flex gap-2">
          {steps.map((step, index) => {
            const currentIndex = steps.findIndex(s => s.key === currentStep);
            return (
              <div
                key={step.key}
                className={cn(
                  "h-2 flex-1 rounded-full transition-colors",
                  index <= currentIndex ? `bg-${step.color}` : "bg-muted"
                )}
                style={index <= currentIndex ? { backgroundColor: `hsl(var(--${step.color}))` } : undefined}
              />
            );
          })}
        </div>

        {/* Current step */}
        <div className="text-center space-y-4">
          <div 
            className={`h-24 w-24 mx-auto rounded-full flex items-center justify-center transition-all duration-300`}
            style={{ backgroundColor: `hsl(var(--${currentStepData?.color}) / 0.2)` }}
          >
            {isActive ? (
              <span className="text-4xl font-bold" style={{ color: `hsl(var(--${currentStepData?.color}))` }}>
                {countdown}
              </span>
            ) : (
              <Icon className="h-12 w-12" style={{ color: `hsl(var(--${currentStepData?.color}))` }} />
            )}
          </div>

          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span 
                className="text-3xl font-bold"
                style={{ color: `hsl(var(--${currentStepData?.color}))` }}
              >
                {currentStepData?.letter}
              </span>
              <h3 className="text-xl font-bold">{currentStepData?.title}</h3>
            </div>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {currentStepData?.description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            onClick={handleNextStep} 
            disabled={isActive}
            className="flex-1"
            style={{ 
              backgroundColor: !isActive ? `hsl(var(--${currentStepData?.color}))` : undefined 
            }}
          >
            {isActive 
              ? t('mentalWellness.cognitiveSkills.interrupter.wait', 'Wait...') 
              : t('common.next', 'Next')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
