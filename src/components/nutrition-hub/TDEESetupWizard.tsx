import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Calculator, Check } from 'lucide-react';
import { BirthDatePicker } from '@/components/ui/BirthDatePicker';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  calculateBMR, 
  calculateTDEE, 
  calculateAge,
  type Sex, 
  type ActivityLevel,
  ACTIVITY_MULTIPLIERS 
} from '@/utils/tdeeCalculations';

interface TDEESetupWizardProps {
  onComplete?: () => void;
  onDataSaved?: () => Promise<void> | void;
  initialData?: {
    sex?: Sex;
    dateOfBirth?: string;
    heightInches?: number;
    weightLbs?: number;
    activityLevel?: ActivityLevel;
  };
}

const STEPS = [
  { id: 'sex', title: 'Biological Sex' },
  { id: 'dob', title: 'Date of Birth' },
  { id: 'height', title: 'Height' },
  { id: 'weight', title: 'Current Weight' },
  { id: 'activity', title: 'Activity Level' },
  { id: 'results', title: 'Your Results' }
];

const ACTIVITY_LABELS: Record<ActivityLevel, { label: string; description: string }> = {
  sedentary: { label: 'Sedentary', description: 'Little or no exercise' },
  lightly_active: { label: 'Lightly Active', description: 'Light exercise 1-3 days/week' },
  moderately_active: { label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week' },
  very_active: { label: 'Very Active', description: 'Hard exercise 6-7 days/week' },
  extra_active: { label: 'Extra Active', description: 'Very hard exercise or physical job' }
};

export function TDEESetupWizard({ onComplete, onDataSaved, initialData }: TDEESetupWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [sex, setSex] = useState<Sex | ''>(initialData?.sex || '');
  const [dateOfBirth, setDateOfBirth] = useState(initialData?.dateOfBirth || '');
  const [heightFeet, setHeightFeet] = useState(initialData?.heightInches ? Math.floor(initialData.heightInches / 12).toString() : '');
  const [heightInchesRemainder, setHeightInchesRemainder] = useState(initialData?.heightInches ? (initialData.heightInches % 12).toString() : '');
  const [weightLbs, setWeightLbs] = useState(initialData?.weightLbs?.toString() || '');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | ''>(initialData?.activityLevel || '');

  const totalHeightInches = (parseInt(heightFeet) || 0) * 12 + (parseInt(heightInchesRemainder) || 0);
  const age = dateOfBirth ? calculateAge(new Date(dateOfBirth)) : 0;
  
  // Calculate results
  const canCalculate = sex && age > 0 && totalHeightInches > 0 && parseFloat(weightLbs) > 0 && activityLevel;
  const bmr = canCalculate ? calculateBMR(parseFloat(weightLbs), totalHeightInches, age, sex as Sex) : 0;
  const tdee = canCalculate ? calculateTDEE(bmr, activityLevel as ActivityLevel) : 0;

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!sex;
      case 1: return !!dateOfBirth && age >= 13 && age <= 100;
      case 2: return totalHeightInches >= 48 && totalHeightInches <= 96;
      case 3: return parseFloat(weightLbs) >= 30 && parseFloat(weightLbs) <= 500;
      case 4: return !!activityLevel;
      default: return true;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1 && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (!user?.id || !canCalculate) return;

    setSaving(true);
    try {
      // Use upsert to handle both new and existing profile rows
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          sex: sex,
          date_of_birth: dateOfBirth,
          height_inches: totalHeightInches,
          weight: String(parseFloat(weightLbs)),
          activity_level: activityLevel,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) throw error;

      toast.success('TDEE profile saved!');
      
      // Refresh the TDEE data to update isProfileComplete
      await onDataSaved?.();
      
      onComplete?.();
    } catch (error) {
      console.error('Error saving TDEE profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              This helps us calculate your basal metabolic rate accurately.
            </p>
            <RadioGroup value={sex} onValueChange={(v) => setSex(v as Sex)} className="space-y-2">
              <div 
                className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer"
                onClick={() => setSex('male' as Sex)}
              >
                <RadioGroupItem value="male" id="sex-male" />
                <Label htmlFor="sex-male" className="cursor-pointer flex-1">Male</Label>
              </div>
              <div 
                className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer"
                onClick={() => setSex('female' as Sex)}
              >
                <RadioGroupItem value="female" id="sex-female" />
                <Label htmlFor="sex-female" className="cursor-pointer flex-1">Female</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Your age affects your metabolic rate.
            </p>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <BirthDatePicker
                value={dateOfBirth ? new Date(dateOfBirth + 'T00:00:00') : undefined}
                onChange={(d) => setDateOfBirth(d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '')}
                placeholder="Select your date of birth"
              />
              {dateOfBirth && (
                <p className="text-sm text-muted-foreground">Age: {age} years old</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Enter your height in feet and inches.
            </p>
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="feet">Feet</Label>
                <Select value={heightFeet} onValueChange={setHeightFeet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Feet" />
                  </SelectTrigger>
                  <SelectContent>
                    {[4, 5, 6, 7, 8].map(ft => (
                      <SelectItem key={ft} value={ft.toString()}>{ft} ft</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="inches">Inches</Label>
                <Select value={heightInchesRemainder} onValueChange={setHeightInchesRemainder}>
                  <SelectTrigger>
                    <SelectValue placeholder="Inches" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(inch => (
                      <SelectItem key={inch} value={inch.toString()}>{inch} in</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {totalHeightInches > 0 && (
              <p className="text-sm text-muted-foreground">
                Total: {heightFeet}'{heightInchesRemainder}" ({totalHeightInches} inches)
              </p>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Enter your current weight in pounds.
            </p>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (lbs)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={weightLbs}
                onChange={(e) => setWeightLbs(e.target.value)}
                placeholder="180"
                min={30}
                max={500}
              />
              {weightLbs && (parseFloat(weightLbs) < 30 || parseFloat(weightLbs) > 500) && (
                <p className="text-xs text-destructive">Weight must be between 30 and 500 lbs</p>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              How active are you on a typical week?
            </p>
            <RadioGroup value={activityLevel} onValueChange={(v) => setActivityLevel(v as ActivityLevel)} className="space-y-2">
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map(level => (
                <div 
                  key={level}
                  className="flex items-start space-x-2 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer"
                  onClick={() => setActivityLevel(level as ActivityLevel)}
                >
                  <RadioGroupItem value={level} id={`activity-${level}`} className="mt-0.5" />
                  <Label htmlFor={`activity-${level}`} className="cursor-pointer flex-1">
                    <div className="font-medium">{ACTIVITY_LABELS[level].label}</div>
                    <div className="text-xs text-muted-foreground">{ACTIVITY_LABELS[level].description}</div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center p-6 rounded-lg bg-accent/30 border border-accent">
              <Calculator className="w-12 h-12 mx-auto mb-3 text-primary" />
              <h3 className="text-3xl font-bold text-foreground">{Math.round(tdee).toLocaleString()}</h3>
              <p className="text-muted-foreground">calories/day (TDEE)</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground">BMR</p>
                <p className="font-semibold">{Math.round(bmr).toLocaleString()} cal</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground">Activity Multiplier</p>
                <p className="font-semibold">×{ACTIVITY_MULTIPLIERS[activityLevel as ActivityLevel]}</p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-card text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sex:</span>
                <span className="capitalize">{sex}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Age:</span>
                <span>{age} years</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Height:</span>
                <span>{heightFeet}'{heightInchesRemainder}"</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weight:</span>
                <span>{weightLbs} lbs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Activity:</span>
                <span>{ACTIVITY_LABELS[activityLevel as ActivityLevel]?.label}</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-lg">{STEPS[currentStep].title}</CardTitle>
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length}
          </span>
        </div>
        <Progress value={progress} className="h-1" />
      </CardHeader>
      <CardContent className="space-y-6">
        {renderStep()}

        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          
          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={!canProceed()} className="flex-1">
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              <Check className="w-4 h-4 mr-1" />
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
