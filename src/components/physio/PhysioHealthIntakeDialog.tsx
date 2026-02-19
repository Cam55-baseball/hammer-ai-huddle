import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { usePhysioProfile } from '@/hooks/usePhysioProfile';
import { Heart, Shield, Users, ChevronRight, Check, AlertTriangle } from 'lucide-react';

interface PhysioHealthIntakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DIETARY_STYLES = ['Omnivore', 'Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Paleo', 'Gluten-Free', 'Dairy-Free'];
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const COMMON_CONDITIONS = ['Asthma', 'Diabetes', 'Hypertension', 'ADHD', 'Anxiety', 'Depression', 'Scoliosis', 'None'];

function ChipSelector({ options, selected, onToggle, multiSelect = true }: {
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
  multiSelect?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const isSelected = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
              isSelected
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border text-muted-foreground hover:border-primary/50'
            )}
          >
            {isSelected && <Check className="inline h-3 w-3 mr-1" />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function PhysioHealthIntakeDialog({ open, onOpenChange }: PhysioHealthIntakeDialogProps) {
  const { saveProfile, enableAdultFeatures } = usePhysioProfile();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  // Step 1
  const [bloodType, setBloodType] = useState('');
  const [dietaryStyle, setDietaryStyle] = useState<string[]>([]);
  const [allergiesText, setAllergiesText] = useState('');
  const [intolerancesText, setIntolerancesText] = useState('');

  // Step 2
  const [medicationsText, setMedicationsText] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [injuryText, setInjuryText] = useState('');
  const [supplementsText, setSupplementsText] = useState('');

  // Step 3
  const [adultAgreed, setAdultAgreed] = useState(false);
  const [enableAdult, setEnableAdult] = useState(false);

  const toggleItem = (list: string[], item: string, setter: (v: string[]) => void, multi = true) => {
    if (!multi) {
      setter([item]);
    } else {
      setter(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
    }
  };

  const handleSaveAndClose = async () => {
    setSaving(true);
    try {
      const profileData = {
        blood_type: bloodType || null,
        dietary_style: dietaryStyle[0] || null,
        allergies: allergiesText ? allergiesText.split(',').map(s => s.trim()).filter(Boolean) : [],
        food_intolerances: intolerancesText ? intolerancesText.split(',').map(s => s.trim()).filter(Boolean) : [],
        medications: medicationsText ? medicationsText.split(',').map(s => s.trim()).filter(Boolean) : [],
        medical_conditions: conditions.filter(c => c !== 'None'),
        injury_history: injuryText ? injuryText.split(',').map(s => s.trim()).filter(Boolean) : [],
        supplements: supplementsText ? supplementsText.split(',').map(s => s.trim()).filter(Boolean) : [],
        setup_completed: true,
      };
      await saveProfile(profileData);
      if (enableAdult && adultAgreed) {
        await enableAdultFeatures();
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { icon: <Heart className="h-5 w-5" />, label: 'Basic Health' },
    { icon: <Shield className="h-5 w-5" />, label: 'Medical History' },
    { icon: <Users className="h-5 w-5" />, label: 'Preferences' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Physio Health Setup
          </DialogTitle>
          <DialogDescription>
            This helps us personalize your Physio Regulation reports. All data is private and encrypted.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 my-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-bold transition-all',
                step > i + 1 ? 'bg-primary border-primary text-primary-foreground' :
                step === i + 1 ? 'border-primary text-primary' :
                'border-border text-muted-foreground'
              )}>
                {step > i + 1 ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn(
                'text-xs font-medium hidden sm:block',
                step === i + 1 ? 'text-foreground' : 'text-muted-foreground'
              )}>{s.label}</span>
              {i < 2 && <div className="flex-1 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Health */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Blood Type (Optional)</Label>
              <ChipSelector
                options={BLOOD_TYPES}
                selected={bloodType ? [bloodType] : []}
                onToggle={(val) => setBloodType(val === bloodType ? '' : val)}
                multiSelect={false}
              />
            </div>
            <div className="space-y-2">
              <Label>Dietary Style</Label>
              <ChipSelector
                options={DIETARY_STYLES}
                selected={dietaryStyle}
                onToggle={(val) => toggleItem(dietaryStyle, val, setDietaryStyle, false)}
                multiSelect={false}
              />
            </div>
            <div className="space-y-2">
              <Label>Food Allergies (comma-separated)</Label>
              <Input
                value={allergiesText}
                onChange={e => setAllergiesText(e.target.value)}
                placeholder="e.g. peanuts, shellfish, tree nuts"
              />
            </div>
            <div className="space-y-2">
              <Label>Food Intolerances (comma-separated)</Label>
              <Input
                value={intolerancesText}
                onChange={e => setIntolerancesText(e.target.value)}
                placeholder="e.g. lactose, gluten"
              />
            </div>
          </div>
        )}

        {/* Step 2: Medical History */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Medications (comma-separated)</Label>
              <Input
                value={medicationsText}
                onChange={e => setMedicationsText(e.target.value)}
                placeholder="e.g. Advil, Vitamin D, Creatine"
              />
            </div>
            <div className="space-y-2">
              <Label>Medical Conditions</Label>
              <ChipSelector
                options={COMMON_CONDITIONS}
                selected={conditions}
                onToggle={(val) => toggleItem(conditions, val, setConditions)}
              />
            </div>
            <div className="space-y-2">
              <Label>Injury History (comma-separated)</Label>
              <Input
                value={injuryText}
                onChange={e => setInjuryText(e.target.value)}
                placeholder="e.g. ACL tear 2022, rotator cuff 2021"
              />
            </div>
            <div className="space-y-2">
              <Label>Regular Supplements (comma-separated)</Label>
              <Input
                value={supplementsText}
                onChange={e => setSupplementsText(e.target.value)}
                placeholder="e.g. creatine, omega-3, protein powder"
              />
            </div>
          </div>
        )}

        {/* Step 3: Adult opt-in */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground">
                You're all set! Your health profile will help personalize your Physio Regulation reports, nutrition suggestions, and recovery recommendations.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-border space-y-3">
              <div className="flex items-start gap-2">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Adult Wellness Tracking (18+)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional cycle phase and wellness tracking for more personalized recovery insights. Requires age verification (18+). Completely private.
                  </p>
                </div>
              </div>
              {enableAdult && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-200">
                      By enabling adult tracking, you confirm you are 18 or older. This data is for educational purposes only and is not medical advice. Consult a healthcare professional for medical concerns.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdultAgreed(!adultAgreed)}
                    className={cn(
                      'mt-2 w-full py-1.5 rounded-lg text-sm font-semibold border transition-all',
                      adultAgreed ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground'
                    )}
                  >
                    {adultAgreed ? <><Check className="inline h-3 w-3 mr-1" /> I agree — I am 18+</> : 'I confirm I am 18 or older'}
                  </button>
                </div>
              )}
              <Button
                type="button"
                variant={enableAdult ? "destructive" : "outline"}
                size="sm"
                onClick={() => { setEnableAdult(!enableAdult); setAdultAgreed(false); }}
                className="w-full"
              >
                {enableAdult ? 'Cancel Adult Tracking' : 'Enable Adult Tracking'}
              </Button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2 mt-4">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} className="flex-1">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleSaveAndClose} 
              disabled={saving || (enableAdult && !adultAgreed)} 
              className="flex-1"
            >
              {saving ? 'Saving...' : 'Complete Setup'}
            </Button>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-2">
          You can update this information anytime in your profile settings.
        </p>
      </DialogContent>
    </Dialog>
  );
}
