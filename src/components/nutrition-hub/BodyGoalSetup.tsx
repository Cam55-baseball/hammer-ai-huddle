import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Target, TrendingDown, TrendingUp, Activity, Scale } from 'lucide-react';
import { useAthleteGoals, type CreateGoalInput } from '@/hooks/useAthleteGoals';
import { 
  GOAL_CALORIE_ADJUSTMENTS, 
  calculateWeeklyWeightChange,
  type GoalType 
} from '@/utils/tdeeCalculations';

interface BodyGoalSetupProps {
  currentWeight?: number;
  onComplete?: () => void;
}

const GOAL_OPTIONS: { value: GoalType; label: string; description: string; icon: React.ReactNode }[] = [
  { 
    value: 'lose_weight', 
    label: 'Lose Weight', 
    description: 'Focus on overall weight loss',
    icon: <TrendingDown className="w-5 h-5" />
  },
  { 
    value: 'lose_fat', 
    label: 'Lose Fat', 
    description: 'Preserve muscle while losing fat',
    icon: <Scale className="w-5 h-5" />
  },
  { 
    value: 'maintain', 
    label: 'Maintain', 
    description: 'Keep current weight and composition',
    icon: <Activity className="w-5 h-5" />
  },
  { 
    value: 'gain_lean_muscle', 
    label: 'Gain Lean Muscle', 
    description: 'Build muscle with minimal fat gain',
    icon: <Target className="w-5 h-5" />
  },
  { 
    value: 'gain_weight', 
    label: 'Gain Weight', 
    description: 'Focus on overall weight gain',
    icon: <TrendingUp className="w-5 h-5" />
  }
];

export function BodyGoalSetup({ currentWeight, onComplete }: BodyGoalSetupProps) {
  const { createGoal, activeGoal, loading } = useAthleteGoals();
  
  const [goalType, setGoalType] = useState<GoalType>(activeGoal?.goalType || 'maintain');
  const [targetWeight, setTargetWeight] = useState(activeGoal?.targetWeightLbs?.toString() || '');
  const [targetDate, setTargetDate] = useState(activeGoal?.targetDate || '');
  const [weeklyChangeRate, setWeeklyChangeRate] = useState(activeGoal?.weeklyChangeRate || 1);
  const [saving, setSaving] = useState(false);

  const calorieAdjustment = GOAL_CALORIE_ADJUSTMENTS[goalType];
  const projectedWeeklyChange = calculateWeeklyWeightChange(calorieAdjustment);

  const handleSave = async () => {
    setSaving(true);
    try {
      const input: CreateGoalInput = {
        goalType,
        startingWeightLbs: currentWeight,
        targetWeightLbs: targetWeight ? parseFloat(targetWeight) : undefined,
        targetDate: targetDate || undefined,
        weeklyChangeRate
      };

      await createGoal(input);
      onComplete?.();
    } finally {
      setSaving(false);
    }
  };

  const needsTarget = goalType !== 'maintain';
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 7);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Set Your Body Goal
        </CardTitle>
        <CardDescription>
          Choose a goal to personalize your calorie and macro targets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Goal Type Selection */}
        <div className="space-y-3">
          <Label>Goal Type</Label>
          <RadioGroup 
            value={goalType} 
            onValueChange={(v) => setGoalType(v as GoalType)}
            className="space-y-2"
          >
            {GOAL_OPTIONS.map(option => (
              <div 
                key={option.value}
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  goalType === option.value 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:bg-accent/50'
                }`}
              >
                <RadioGroupItem value={option.value} id={option.value} />
                <div className="flex-1">
                  <Label htmlFor={option.value} className="cursor-pointer flex items-center gap-2">
                    {option.icon}
                    <span className="font-medium">{option.label}</span>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Calorie Impact Preview */}
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Daily Calorie Adjustment</span>
            <span className={`font-semibold ${
              calorieAdjustment > 0 ? 'text-green-500' : 
              calorieAdjustment < 0 ? 'text-amber-500' : 'text-foreground'
            }`}>
              {calorieAdjustment > 0 ? '+' : ''}{calorieAdjustment} cal
            </span>
          </div>
          {goalType !== 'maintain' && (
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-muted-foreground">Projected Weekly Change</span>
              <span className="text-sm">
                ~{Math.abs(projectedWeeklyChange).toFixed(1)} lb/{projectedWeeklyChange > 0 ? 'gain' : 'loss'}
              </span>
            </div>
          )}
        </div>

        {/* Target Weight (optional for non-maintain goals) */}
        {needsTarget && (
          <div className="space-y-2">
            <Label htmlFor="targetWeight">Target Weight (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="targetWeight"
                type="number"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder={currentWeight?.toString() || '180'}
                min={80}
                max={400}
              />
              <span className="text-sm text-muted-foreground">lbs</span>
            </div>
            {currentWeight && targetWeight && (
              <p className="text-xs text-muted-foreground">
                {parseFloat(targetWeight) > currentWeight ? '+' : ''}
                {(parseFloat(targetWeight) - currentWeight).toFixed(1)} lbs from current weight
              </p>
            )}
          </div>
        )}

        {/* Weekly Change Rate Slider */}
        {needsTarget && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Weekly Change Rate</Label>
              <span className="text-sm font-medium">{weeklyChangeRate} lb/week</span>
            </div>
            <Slider
              value={[weeklyChangeRate]}
              onValueChange={([val]) => setWeeklyChangeRate(val)}
              min={0.5}
              max={2}
              step={0.25}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Slow & Steady</span>
              <span>Aggressive</span>
            </div>
          </div>
        )}

        {/* Target Date (optional) */}
        {needsTarget && (
          <div className="space-y-2">
            <Label htmlFor="targetDate">Target Date (optional)</Label>
            <Input
              id="targetDate"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              min={minDate.toISOString().split('T')[0]}
            />
          </div>
        )}

        <Button 
          onClick={handleSave} 
          disabled={saving || loading} 
          className="w-full"
        >
          {saving ? 'Saving...' : activeGoal ? 'Update Goal' : 'Set Goal'}
        </Button>
      </CardContent>
    </Card>
  );
}
