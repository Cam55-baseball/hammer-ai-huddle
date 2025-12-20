import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Eye, Ear, Hand, Wind, Apple, Check, RotateCcw } from 'lucide-react';

interface SenseStep {
  id: string;
  icon: React.ReactNode;
  emoji: string;
  count: number;
  color: string;
}

const SENSE_STEPS: SenseStep[] = [
  { id: 'see', icon: <Eye className="w-5 h-5" />, emoji: '👁️', count: 5, color: 'bg-wellness-sky' },
  { id: 'hear', icon: <Ear className="w-5 h-5" />, emoji: '👂', count: 4, color: 'bg-wellness-lavender' },
  { id: 'feel', icon: <Hand className="w-5 h-5" />, emoji: '🖐️', count: 3, color: 'bg-wellness-sage' },
  { id: 'smell', icon: <Wind className="w-5 h-5" />, emoji: '👃', count: 2, color: 'bg-wellness-coral' },
  { id: 'taste', icon: <Apple className="w-5 h-5" />, emoji: '👅', count: 1, color: 'bg-wellness-cream' },
];

interface SensoryGroundingProps {
  onComplete?: () => void;
}

export default function SensoryGrounding({ onComplete }: SensoryGroundingProps) {
  const { t } = useTranslation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string[]>>({});
  const [currentInput, setCurrentInput] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const currentStep = SENSE_STEPS[currentStepIndex];
  const currentResponses = responses[currentStep?.id] || [];
  const isStepComplete = currentResponses.length >= (currentStep?.count || 0);

  const handleAddResponse = () => {
    if (!currentInput.trim() || !currentStep) return;

    const newResponses = [...currentResponses, currentInput.trim()];
    setResponses((prev) => ({
      ...prev,
      [currentStep.id]: newResponses,
    }));
    setCurrentInput('');

    // Check if this step is now complete
    if (newResponses.length >= currentStep.count) {
      // Auto-advance after a short delay
      setTimeout(() => {
        if (currentStepIndex < SENSE_STEPS.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          handleComplete();
        }
      }, 500);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddResponse();
    }
  };

  const handleComplete = async () => {
    setIsComplete(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('mindfulness_sessions').insert({
        user_id: user.id,
        session_type: 'grounding',
        technique: '5_4_3_2_1_sensory',
        duration_seconds: 180, // Approximate
        completed: true,
        notes: JSON.stringify(responses),
      });
    } catch (error) {
      console.error('Error saving session:', error);
    }

    onComplete?.();
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setResponses({});
    setCurrentInput('');
    setIsComplete(false);
  };

  const getStepLabel = (step: SenseStep) => {
    const labels: Record<string, string> = {
      see: t('emotionalAwareness.grounding.sensory.see', '5 things you can SEE'),
      hear: t('emotionalAwareness.grounding.sensory.hear', '4 things you can HEAR'),
      feel: t('emotionalAwareness.grounding.sensory.feel', '3 things you can FEEL'),
      smell: t('emotionalAwareness.grounding.sensory.smell', '2 things you can SMELL'),
      taste: t('emotionalAwareness.grounding.sensory.taste', '1 thing you can TASTE'),
    };
    return labels[step.id];
  };

  const getProgress = () => {
    const totalItems = SENSE_STEPS.reduce((sum, step) => sum + step.count, 0);
    const completedItems = SENSE_STEPS.reduce(
      (sum, step) => sum + (responses[step.id]?.length || 0),
      0
    );
    return Math.round((completedItems / totalItems) * 100);
  };

  return (
    <Card className="border-wellness-lavender/30 bg-gradient-to-br from-wellness-cream/50 to-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">🌈</span>
          {t('emotionalAwareness.grounding.sensory.title', '5-4-3-2-1 Sensory Grounding')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('emotionalAwareness.grounding.sensory.description', 'Ground yourself using your five senses')}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Steps */}
        <div className="flex justify-between items-center gap-2">
          {SENSE_STEPS.map((step, index) => {
            const stepResponses = responses[step.id]?.length || 0;
            const isActive = index === currentStepIndex && !isComplete;
            const isDone = stepResponses >= step.count;

            return (
              <div key={step.id} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300",
                    isDone ? step.color : isActive ? "bg-primary text-primary-foreground" : "bg-muted",
                    isActive && "ring-2 ring-primary ring-offset-2 scale-110"
                  )}
                >
                  {isDone ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-lg">{step.emoji}</span>
                  )}
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {stepResponses}/{step.count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-wellness-lavender to-wellness-sage transition-all duration-500"
            style={{ width: `${getProgress()}%` }}
          />
        </div>

        {/* Current Step */}
        {!isComplete ? (
          <div className="space-y-4 animate-fade-in">
            <div className={cn("rounded-xl p-4 text-center", currentStep.color)}>
              <span className="text-4xl mb-2 block">{currentStep.emoji}</span>
              <h3 className="text-lg font-semibold">{getStepLabel(currentStep)}</h3>
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <Input
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('emotionalAwareness.grounding.sensory.enterItem', 'Enter something...')}
                className="flex-1"
                disabled={isStepComplete}
              />
              <Button 
                onClick={handleAddResponse} 
                disabled={!currentInput.trim() || isStepComplete}
              >
                {t('emotionalAwareness.grounding.add', 'Add')}
              </Button>
            </div>

            {/* Current Step Responses */}
            {currentResponses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {currentResponses.map((response, index) => (
                  <span
                    key={index}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium animate-scale-in",
                      currentStep.color
                    )}
                  >
                    {currentStep.emoji} {response}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Completion */
          <div className="text-center space-y-4 animate-fade-in">
            <div className="bg-gradient-to-br from-wellness-sage/30 to-wellness-lavender/30 rounded-xl p-6">
              <Check className="w-12 h-12 mx-auto text-wellness-sage mb-3" />
              <h3 className="text-lg font-semibold mb-2">
                {t('emotionalAwareness.grounding.sensory.wellDone', 'Well Done!')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('emotionalAwareness.grounding.completed', 'Well done! Take a moment to notice how you feel.')}
              </p>
            </div>

            {/* All Responses Summary */}
            <div className="space-y-3 text-left">
              {SENSE_STEPS.map((step) => {
                const stepResponses = responses[step.id] || [];
                if (stepResponses.length === 0) return null;
                return (
                  <div key={step.id} className="text-sm">
                    <span className="font-medium">{step.emoji} {step.id.toUpperCase()}:</span>
                    <span className="text-muted-foreground ml-2">
                      {stepResponses.join(', ')}
                    </span>
                  </div>
                );
              })}
            </div>

            <Button onClick={handleReset} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              {t('emotionalAwareness.grounding.startAgain', 'Start Again')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
