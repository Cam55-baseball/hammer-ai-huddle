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

// Reusable Rating Button Group Component
interface RatingButtonGroupProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  icon: React.ReactNode;
  getLevelLabel: (value: number) => string;
}

function RatingButtonGroup({ value, onChange, label, icon, getLevelLabel }: RatingButtonGroupProps) {
  const getButtonStyles = (num: number, isSelected: boolean) => {
    const baseStyles = "flex-1 min-h-[48px] rounded-xl font-bold text-lg transition-all duration-200 border-2";
    
    const colorStyles = {
      1: isSelected 
        ? "bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/30" 
        : "bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30",
      2: isSelected 
        ? "bg-orange-500 text-white border-orange-600 shadow-lg shadow-orange-500/30" 
        : "bg-orange-500/20 text-orange-500 border-orange-500/30 hover:bg-orange-500/30",
      3: isSelected 
        ? "bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/30" 
        : "bg-amber-500/20 text-amber-500 border-amber-500/30 hover:bg-amber-500/30",
      4: isSelected 
        ? "bg-lime-500 text-white border-lime-600 shadow-lg shadow-lime-500/30" 
        : "bg-lime-500/20 text-lime-600 border-lime-500/30 hover:bg-lime-500/30",
      5: isSelected 
        ? "bg-green-500 text-white border-green-600 shadow-lg shadow-green-500/30" 
        : "bg-green-500/20 text-green-600 border-green-500/30 hover:bg-green-500/30",
    };
    
    const scaleStyle = isSelected ? "scale-105" : "scale-100 opacity-70";
    
    return cn(baseStyles, colorStyles[num as keyof typeof colorStyles], scaleStyle);
  };

  const handleClick = (num: number) => {
    if (navigator.vibrate) navigator.vibrate(10);
    onChange(num);
  };

  const getLevelColor = (val: number) => {
    if (val <= 2) return 'text-red-500';
    if (val === 3) return 'text-amber-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-4 p-4 bg-card/50 rounded-2xl border border-border/50">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-base font-semibold">
          {icon}
          {label}
        </Label>
        <span className={cn("text-sm font-bold px-3 py-1 rounded-full bg-background", getLevelColor(value))}>
          {getLevelLabel(value)}
        </span>
      </div>
      
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleClick(num)}
            className={getButtonStyles(num, value === num)}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
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
      case 'pre_lift': return <Dumbbell className="h-6 w-6 text-orange-500" />;
      case 'night': return <Moon className="h-6 w-6 text-indigo-500" />;
      case 'morning': return <Sun className="h-6 w-6 text-amber-500" />;
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
        <DialogHeader className="space-y-3 pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              {getQuizIcon()}
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold">{getQuizTitle()}</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                {t('vault.quiz.description')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          {/* Mental Readiness */}
          <RatingButtonGroup
            value={mentalReadiness}
            onChange={setMentalReadiness}
            label={t('vault.quiz.mentalReadiness')}
            icon={<Brain className="h-5 w-5 text-purple-500" />}
            getLevelLabel={getLevelLabel}
          />

          {/* Emotional State */}
          <RatingButtonGroup
            value={emotionalState}
            onChange={setEmotionalState}
            label={t('vault.quiz.emotionalState')}
            icon={<Heart className="h-5 w-5 text-pink-500" />}
            getLevelLabel={getLevelLabel}
          />

          {/* Physical Readiness */}
          <RatingButtonGroup
            value={physicalReadiness}
            onChange={setPhysicalReadiness}
            label={t('vault.quiz.physicalReadiness')}
            icon={<Zap className="h-5 w-5 text-yellow-500" />}
            getLevelLabel={getLevelLabel}
          />

          {/* Night Quiz Reflections */}
          {quizType === 'night' && (
            <div className="space-y-4 pt-6 mt-6 border-t border-border">
              <h4 className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {t('vault.quiz.reflectionTitle')}
              </h4>

              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('vault.quiz.didWell')}</Label>
                <Textarea
                  value={didWell}
                  onChange={(e) => setDidWell(e.target.value)}
                  placeholder={t('vault.quiz.didWellPlaceholder')}
                  className="min-h-[80px] resize-none"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('vault.quiz.couldImprove')}</Label>
                <Textarea
                  value={couldImprove}
                  onChange={(e) => setCouldImprove(e.target.value)}
                  placeholder={t('vault.quiz.couldImprovePlaceholder')}
                  className="min-h-[80px] resize-none"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('vault.quiz.learned')}</Label>
                <Textarea
                  value={learned}
                  onChange={(e) => setLearned(e.target.value)}
                  placeholder={t('vault.quiz.learnedPlaceholder')}
                  className="min-h-[80px] resize-none"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('vault.quiz.motivation')}</Label>
                <Textarea
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  placeholder={t('vault.quiz.motivationPlaceholder')}
                  className="min-h-[80px] resize-none"
                />
              </div>

              {/* Sleep tip */}
              <Alert className="bg-indigo-500/10 border-indigo-500/30 mt-4">
                <Info className="h-4 w-4 text-indigo-500" />
                <AlertDescription className="text-sm">
                  {t('vault.quiz.sleepTip')}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Morning Quiz Tip */}
          {quizType === 'morning' && (
            <Alert className="bg-amber-500/10 border-amber-500/30 mt-2">
              <Info className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm">
                {t('vault.quiz.morningTip')}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-4 border-t border-border">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 h-12 text-base font-semibold"
            >
              {loading ? t('common.loading') : t('vault.quiz.submit')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="sm:w-auto h-12"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
