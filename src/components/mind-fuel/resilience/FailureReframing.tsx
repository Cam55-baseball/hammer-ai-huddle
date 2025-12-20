import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, Lightbulb, ArrowRight, Check, Sparkles } from 'lucide-react';

interface ReframeStep {
  key: string;
  question: string;
  placeholder: string;
}

export default function FailureReframing() {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [showSummary, setShowSummary] = useState(false);

  const steps: ReframeStep[] = [
    {
      key: 'failure',
      question: t('mentalWellness.resilience.failure.step1.question', 'Describe a recent failure or setback'),
      placeholder: t('mentalWellness.resilience.failure.step1.placeholder', 'I missed the game-winning shot...')
    },
    {
      key: 'feelings',
      question: t('mentalWellness.resilience.failure.step2.question', 'What emotions did you feel?'),
      placeholder: t('mentalWellness.resilience.failure.step2.placeholder', 'Embarrassed, frustrated, disappointed...')
    },
    {
      key: 'lesson',
      question: t('mentalWellness.resilience.failure.step3.question', 'What can you learn from this experience?'),
      placeholder: t('mentalWellness.resilience.failure.step3.placeholder', 'I need to practice more under pressure...')
    },
    {
      key: 'growth',
      question: t('mentalWellness.resilience.failure.step4.question', 'How will this make you stronger?'),
      placeholder: t('mentalWellness.resilience.failure.step4.placeholder', 'I\'ll be more mentally prepared next time...')
    },
    {
      key: 'action',
      question: t('mentalWellness.resilience.failure.step5.question', 'What specific action will you take?'),
      placeholder: t('mentalWellness.resilience.failure.step5.placeholder', 'Practice clutch situations 3x per week...')
    }
  ];

  const currentResponse = responses[steps[currentStep]?.key] || '';

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowSummary(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setResponses({});
    setCurrentStep(0);
    setShowSummary(false);
  };

  if (showSummary) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-wellness-sage/20 to-wellness-sky/20 border-wellness-sage/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-wellness-sage" />
              {t('mentalWellness.resilience.failure.summaryTitle', 'Your Growth Reframe')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="p-3 bg-destructive/10 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">
                  {t('mentalWellness.resilience.failure.theSetback', 'The Setback')}
                </p>
                <p className="text-sm">{responses.failure}</p>
              </div>

              <div className="flex items-center gap-2 text-wellness-sage">
                <ArrowRight className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t('mentalWellness.resilience.failure.transformed', 'Transformed Into')}
                </span>
              </div>

              <div className="p-3 bg-wellness-sage/10 rounded-lg space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t('mentalWellness.resilience.failure.lesson', 'Lesson Learned')}
                  </p>
                  <p className="text-sm font-medium">{responses.lesson}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t('mentalWellness.resilience.failure.howGrow', 'How I\'ll Grow')}
                  </p>
                  <p className="text-sm font-medium">{responses.growth}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t('mentalWellness.resilience.failure.myAction', 'My Action')}
                  </p>
                  <p className="text-sm font-medium">{responses.action}</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-wellness-cream/50 rounded-lg border border-wellness-sage/20">
              <p className="text-sm italic text-center">
                "{t('mentalWellness.resilience.failure.quote', 'Every setback is a setup for a comeback.')}"
              </p>
            </div>

            <Button onClick={handleReset} variant="outline" className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              {t('mentalWellness.resilience.failure.reframeAnother', 'Reframe Another Setback')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-wellness-coral/20 to-wellness-sage/20 border-wellness-coral/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className="h-5 w-5 text-wellness-coral" />
            {t('mentalWellness.resilience.failure.title', 'Failure Reframing')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('mentalWellness.resilience.failure.intro', 'Transform setbacks into stepping stones. Every failure contains a seed of growth.')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Progress */}
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < currentStep ? 'bg-wellness-sage' : 
                  i === currentStep ? 'bg-wellness-coral' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Current step */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-wellness-coral/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-wellness-coral">{currentStep + 1}</span>
              </div>
              <div>
                <h3 className="font-medium">{steps[currentStep].question}</h3>
              </div>
            </div>

            <Textarea
              value={currentResponse}
              onChange={(e) => setResponses({ ...responses, [steps[currentStep].key]: e.target.value })}
              placeholder={steps[currentStep].placeholder}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              {t('common.back', 'Back')}
            </Button>
            <Button
              onClick={handleNext}
              disabled={!currentResponse.trim()}
              className="gap-2 bg-wellness-coral hover:bg-wellness-coral/90"
            >
              {currentStep < steps.length - 1 ? (
                <>
                  {t('common.next', 'Next')}
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  {t('common.complete', 'Complete')}
                  <Check className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tip */}
      <Card className="bg-wellness-cream/50 border-wellness-sage/20">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-wellness-sage shrink-0" />
            <div>
              <p className="text-sm font-medium">{t('mentalWellness.resilience.failure.tipTitle', 'Mindset Shift')}</p>
              <p className="text-sm text-muted-foreground">
                {t('mentalWellness.resilience.failure.tipText', 'The most successful athletes have the most failures. What separates them is how they respond.')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
