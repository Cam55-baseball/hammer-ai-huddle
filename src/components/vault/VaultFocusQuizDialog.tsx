import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Heart, Zap, Moon, Sun, Dumbbell, Sparkles, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VaultFocusQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizType: 'pre_lift' | 'night' | 'morning';
  onSubmit: (data: {
    mental_readiness: number;
    emotional_state: number;
    physical_readiness: number;
    reflection_did_well?: string;
    reflection_improve?: string;
    reflection_learned?: string;
    reflection_motivation?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function VaultFocusQuizDialog({
  open,
  onOpenChange,
  quizType,
  onSubmit,
}: VaultFocusQuizDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  
  const [mentalReadiness, setMentalReadiness] = useState(3);
  const [emotionalState, setEmotionalState] = useState(3);
  const [physicalReadiness, setPhysicalReadiness] = useState(3);
  
  // Night quiz reflections
  const [didWell, setDidWell] = useState('');
  const [couldImprove, setCouldImprove] = useState('');
  const [learned, setLearned] = useState('');
  const [motivation, setMotivation] = useState('');

  const getQuizIcon = () => {
    switch (quizType) {
      case 'pre_lift': return <Dumbbell className="h-5 w-5 text-orange-500" />;
      case 'night': return <Moon className="h-5 w-5 text-indigo-500" />;
      case 'morning': return <Sun className="h-5 w-5 text-amber-500" />;
    }
  };

  const getQuizTitle = () => {
    switch (quizType) {
      case 'pre_lift': return t('vault.quiz.preLiftTitle');
      case 'night': return t('vault.quiz.nightTitle');
      case 'morning': return t('vault.quiz.morningTitle');
    }
  };

  const getLevelLabel = (value: number) => {
    const labels = [
      t('vault.quiz.level1'),
      t('vault.quiz.level2'),
      t('vault.quiz.level3'),
      t('vault.quiz.level4'),
      t('vault.quiz.level5'),
    ];
    return labels[value - 1] || '';
  };

  const getLevelColor = (value: number) => {
    if (value <= 2) return 'text-red-500';
    if (value === 3) return 'text-amber-500';
    return 'text-green-500';
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    const data: any = {
      mental_readiness: mentalReadiness,
      emotional_state: emotionalState,
      physical_readiness: physicalReadiness,
    };

    if (quizType === 'night') {
      data.reflection_did_well = didWell || undefined;
      data.reflection_improve = couldImprove || undefined;
      data.reflection_learned = learned || undefined;
      data.reflection_motivation = motivation || undefined;
    }

    const result = await onSubmit(data);
    setLoading(false);
    
    if (result.success) {
      // Reset form
      setMentalReadiness(3);
      setEmotionalState(3);
      setPhysicalReadiness(3);
      setDidWell('');
      setCouldImprove('');
      setLearned('');
      setMotivation('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-lg p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            {getQuizIcon()}
            <DialogTitle className="text-lg sm:text-xl">{getQuizTitle()}</DialogTitle>
          </div>
          <DialogDescription>
            {t('vault.quiz.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* Mental Readiness */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                {t('vault.quiz.mentalReadiness')}
              </Label>
              <span className={cn("text-sm font-medium", getLevelColor(mentalReadiness))}>
                {getLevelLabel(mentalReadiness)}
              </span>
            </div>
            <Slider
              value={[mentalReadiness]}
              onValueChange={([value]) => setMentalReadiness(value)}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
          </div>

          {/* Emotional State */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                {t('vault.quiz.emotionalState')}
              </Label>
              <span className={cn("text-sm font-medium", getLevelColor(emotionalState))}>
                {getLevelLabel(emotionalState)}
              </span>
            </div>
            <Slider
              value={[emotionalState]}
              onValueChange={([value]) => setEmotionalState(value)}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
          </div>

          {/* Physical Readiness */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                {t('vault.quiz.physicalReadiness')}
              </Label>
              <span className={cn("text-sm font-medium", getLevelColor(physicalReadiness))}>
                {getLevelLabel(physicalReadiness)}
              </span>
            </div>
            <Slider
              value={[physicalReadiness]}
              onValueChange={([value]) => setPhysicalReadiness(value)}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
          </div>

          {/* Night Quiz Reflections */}
          {quizType === 'night' && (
            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {t('vault.quiz.reflectionTitle')}
              </h4>

              <div className="space-y-2">
                <Label>{t('vault.quiz.didWell')}</Label>
                <Textarea
                  value={didWell}
                  onChange={(e) => setDidWell(e.target.value)}
                  placeholder={t('vault.quiz.didWellPlaceholder')}
                  className="min-h-[60px]"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('vault.quiz.couldImprove')}</Label>
                <Textarea
                  value={couldImprove}
                  onChange={(e) => setCouldImprove(e.target.value)}
                  placeholder={t('vault.quiz.couldImprovePlaceholder')}
                  className="min-h-[60px]"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('vault.quiz.learned')}</Label>
                <Textarea
                  value={learned}
                  onChange={(e) => setLearned(e.target.value)}
                  placeholder={t('vault.quiz.learnedPlaceholder')}
                  className="min-h-[60px]"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('vault.quiz.motivation')}</Label>
                <Textarea
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  placeholder={t('vault.quiz.motivationPlaceholder')}
                  className="min-h-[60px]"
                />
              </div>

              {/* Sleep tip */}
              <Alert className="bg-indigo-500/10 border-indigo-500/30">
                <Info className="h-4 w-4 text-indigo-500" />
                <AlertDescription className="text-xs">
                  {t('vault.quiz.sleepTip')}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Morning Quiz Tip */}
          {quizType === 'morning' && (
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <Info className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-xs">
                {t('vault.quiz.morningTip')}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-border">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              {loading ? t('common.loading') : t('vault.quiz.submit')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="sm:w-auto"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
