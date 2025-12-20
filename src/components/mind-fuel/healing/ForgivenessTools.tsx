import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Feather, Heart, Scale, Sparkles, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ForgivenessStep {
  id: number;
  title: string;
  description: string;
  prompt: string;
}

const forgivenessSteps: ForgivenessStep[] = [
  {
    id: 1,
    title: 'Acknowledge the Hurt',
    description: 'Recognize and validate your feelings about what happened.',
    prompt: 'What happened, and how did it make you feel? Be honest about the impact.',
  },
  {
    id: 2,
    title: 'Understand the Weight',
    description: 'Recognize how holding onto this affects you.',
    prompt: 'How has holding onto this resentment affected your life, energy, or peace of mind?',
  },
  {
    id: 3,
    title: 'Seek Understanding',
    description: 'Try to see the situation from a broader perspective.',
    prompt: 'Without excusing the behavior, can you imagine what might have led to their actions? Were they acting from their own pain or limitations?',
  },
  {
    id: 4,
    title: 'Choose to Release',
    description: 'Make a conscious decision to let go for your own peace.',
    prompt: 'Write a statement of release. This isn\'t saying what happened was okay—it\'s choosing to free yourself from carrying the burden.',
  },
  {
    id: 5,
    title: 'Self-Forgiveness',
    description: 'Extend the same compassion to yourself.',
    prompt: 'Is there anything you need to forgive yourself for in this situation? Write yourself a message of compassion.',
  },
];

export default function ForgivenessTools() {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [showAffirmation, setShowAffirmation] = useState(false);

  const step = forgivenessSteps[currentStep - 1];
  const progress = ((currentStep - 1) / forgivenessSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < forgivenessSteps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowAffirmation(true);
      toast.success('You\'ve completed the forgiveness exercise');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateResponse = (text: string) => {
    setResponses({ ...responses, [step.id]: text });
  };

  const handleReset = () => {
    setCurrentStep(1);
    setResponses({});
    setShowAffirmation(false);
  };

  if (showAffirmation) {
    return (
      <div className="space-y-4">
        <Card className="bg-gradient-to-br from-wellness-lavender/20 to-wellness-rose/20 border-wellness-lavender/40">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-wellness-sage/20">
              <Check className="h-8 w-8 text-wellness-sage" />
            </div>
            <h3 className="text-xl font-bold">
              {t('mentalWellness.healing.forgiveness.complete', 'A Brave Step Toward Freedom')}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t('mentalWellness.healing.forgiveness.completeText', 'Forgiveness is a process, not a destination. You\'ve taken an important step today. Be patient with yourself as you continue to heal.')}
            </p>
            <div className="p-4 rounded-lg bg-background/50 max-w-sm mx-auto">
              <p className="text-sm italic">
                "Forgiveness is giving up the hope that the past could have been any different."
                <span className="block text-xs text-muted-foreground mt-1">— Oprah Winfrey</span>
              </p>
            </div>
            <Button onClick={handleReset} variant="outline">
              {t('mentalWellness.healing.forgiveness.startNew', 'Start Another Exercise')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Introduction */}
      <Card className="bg-gradient-to-br from-wellness-lavender/10 to-transparent border-wellness-lavender/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-wellness-lavender/20">
              <Feather className="h-5 w-5 text-wellness-lavender" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">
                {t('mentalWellness.healing.forgiveness.title', 'Forgiveness Journey')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('mentalWellness.healing.forgiveness.intro', 'Forgiveness isn\'t about excusing harmful behavior or reconciling with someone who hurt you. It\'s about releasing the burden you carry so you can move forward with peace.')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {t('mentalWellness.healing.forgiveness.step', 'Step')} {currentStep} {t('common.of', 'of')} {forgivenessSteps.length}
          </span>
          <span className="text-wellness-lavender font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-wellness-lavender transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current Step */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-wellness-lavender" />
            {step.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-sm leading-relaxed">{step.prompt}</p>
          </div>

          <Textarea
            value={responses[step.id] || ''}
            onChange={(e) => updateResponse(e.target.value)}
            placeholder={t('mentalWellness.healing.forgiveness.placeholder', 'Write your thoughts here...')}
            className="min-h-[120px] resize-none"
          />

          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              {t('common.back', 'Back')}
            </Button>
            <Button
              onClick={handleNext}
              className="bg-wellness-lavender hover:bg-wellness-lavender/90"
            >
              {currentStep === forgivenessSteps.length
                ? t('common.complete', 'Complete')
                : t('common.next', 'Next')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Insight */}
      <Card className="bg-wellness-cream/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Scale className="h-5 w-5 text-wellness-sage flex-shrink-0" />
            <div>
              <h4 className="font-medium text-sm mb-1">
                {t('mentalWellness.healing.forgiveness.keyInsight', 'Key Insight')}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t('mentalWellness.healing.forgiveness.keyInsightText', 'Forgiveness is a gift you give yourself. It doesn\'t require the other person to apologize, change, or even know about it. It\'s an internal release.')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
