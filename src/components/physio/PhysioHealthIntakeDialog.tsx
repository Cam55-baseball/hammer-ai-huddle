import { useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { usePhysioProfile } from '@/hooks/usePhysioProfile';
import { Heart, Shield, Users, ChevronRight, Check, CalendarIcon, Info } from 'lucide-react';

interface PhysioHealthIntakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DIETARY_STYLES = ['Omnivore', 'Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Paleo', 'Gluten-Free', 'Dairy-Free'];
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const COMMON_CONDITIONS = ['Asthma', 'Diabetes', 'Hypertension', 'ADHD', 'Anxiety', 'Depression', 'Scoliosis', 'None'];
const CONTRACEPTIVE_TYPES = ['Pill', 'IUD', 'Implant', 'Patch', 'Ring', 'Injection', 'Barrier', 'Other'];

function calcAge(dob: Date | undefined): number | null {
  if (!dob) return null;
  const today = new Date();
  return today.getFullYear() - dob.getFullYear() -
    (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
}

function getAgeNote(age: number | null, sex: string): string {
  if (!age) return '';
  if (sex === 'male') {
    if (age < 18) return 'Your reports will prioritise growth plate recovery, sleep as the primary adaptation signal, and development-safe load management.';
    if (age <= 25) return 'Your reports will be calibrated for peak hormonal output, CNS development, and testosterone-linked recovery rhythms.';
    if (age <= 35) return 'Your reports will focus on CNS efficiency, smart durability investment, and maintaining peak performance windows.';
    return 'Your reports will weight recovery investment heavily, with emphasis on load management, durability, and long-term output sustainability.';
  }
  if (sex === 'female') {
    if (age < 18) return 'Your reports will emphasise growth plate recovery, hormonal development, and sleep as the primary adaptation signal.';
    if (age <= 25) return 'Your reports will factor in cycle phase sensitivity, iron and fuel needs, and hormonal load for peak performance.';
    if (age <= 35) return 'Your reports will account for cycle phase awareness, hormonal load sensitivity, and nutritional considerations for sustained performance.';
    return 'Your reports will emphasise recovery investment, hormonal context, and energy management tailored to your physiology.';
  }
  if (age < 18) return 'Your reports will prioritise growth plate recovery, sleep quality, and development-appropriate load management.';
  return 'Your reports will be personalised based on your profile data to support your recovery and performance.';
}

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

function SexCard({ value, label, emoji, selected, onSelect }: {
  value: string; label: string; emoji: string; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex-1 flex flex-col items-center gap-1.5 py-4 px-2 rounded-xl border-2 transition-all',
        selected
          ? 'bg-primary/10 border-primary text-primary'
          : 'bg-background border-border text-muted-foreground hover:border-primary/40'
      )}
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs font-semibold">{label}</span>
      {selected && <Check className="h-3 w-3" />}
    </button>
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
  const [dobDate, setDobDate] = useState<Date | undefined>(undefined);
  const [biologicalSex, setBiologicalSex] = useState('');
  const [enableAdult, setEnableAdult] = useState(false);
  const [contraceptiveUse, setContraceptiveUse] = useState(false);
  const [contraceptiveType, setContraceptiveType] = useState('');
  const [dobOpen, setDobOpen] = useState(false);

  const computedAge = calcAge(dobDate);
  const isAdultEligible = computedAge !== null && computedAge >= 18;

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
      const dobString = dobDate ? format(dobDate, 'yyyy-MM-dd') : null;
      const isFemaleAdult = biologicalSex === 'female' && enableAdult && isAdultEligible;

      const profileData = {
        blood_type: bloodType || null,
        dietary_style: dietaryStyle[0] || null,
        allergies: allergiesText ? allergiesText.split(',').map(s => s.trim()).filter(Boolean) : [],
        food_intolerances: intolerancesText ? intolerancesText.split(',').map(s => s.trim()).filter(Boolean) : [],
        medications: medicationsText ? medicationsText.split(',').map(s => s.trim()).filter(Boolean) : [],
        medical_conditions: conditions.filter(c => c !== 'None'),
        injury_history: injuryText ? injuryText.split(',').map(s => s.trim()).filter(Boolean) : [],
        supplements: supplementsText ? supplementsText.split(',').map(s => s.trim()).filter(Boolean) : [],
        date_of_birth: dobString,
        biological_sex: biologicalSex || null,
        contraceptive_use: isFemaleAdult ? contraceptiveUse : null,
        contraceptive_type: isFemaleAdult && contraceptiveUse ? (contraceptiveType || null) : null,
        setup_completed: true,
      };
      await saveProfile(profileData);
      if (enableAdult && isAdultEligible) {
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

  const ageNote = getAgeNote(computedAge, biologicalSex);

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

        {/* Step 3: Preferences */}
        {step === 3 && (
          <div className="space-y-5">

            {/* DOB Picker */}
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Popover open={dobOpen} onOpenChange={setDobOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dobDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dobDate ? format(dobDate, 'MMMM d, yyyy') : 'Select your date of birth'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dobDate}
                    onSelect={(d) => { setDobDate(d); setDobOpen(false); }}
                    disabled={(date) => date > new Date() || date < new Date('1920-01-01')}
                    defaultMonth={dobDate ?? new Date(new Date().getFullYear() - 20, 0)}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
              {computedAge !== null && (
                <p className="text-xs text-muted-foreground pl-1">
                  Age: <span className="font-semibold text-foreground">{computedAge}</span>
                  {!isAdultEligible && (
                    <span className="ml-2 text-amber-500/80">Adult tracking available at 18+</span>
                  )}
                </p>
              )}
            </div>

            {/* Biological Sex */}
            <div className="space-y-2">
              <Label>Biological Sex</Label>
              <div className="flex gap-2">
                <SexCard value="male" label="Male" emoji="♂" selected={biologicalSex === 'male'} onSelect={() => setBiologicalSex('male')} />
                <SexCard value="female" label="Female" emoji="♀" selected={biologicalSex === 'female'} onSelect={() => setBiologicalSex('female')} />
                <SexCard value="prefer_not_to_say" label="Prefer not to say" emoji="○" selected={biologicalSex === 'prefer_not_to_say'} onSelect={() => setBiologicalSex('prefer_not_to_say')} />
              </div>
            </div>

            {/* Age + sex tailored insight note */}
            {biologicalSex && computedAge !== null && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">{ageNote}</p>
              </div>
            )}

            {/* Adult Tracking */}
            {biologicalSex && (
              <div className="p-4 rounded-xl border border-border space-y-3">
                <div className="flex items-start gap-2">
                  <Users className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Adult Wellness Tracking (18+)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {biologicalSex === 'female'
                        ? 'Optional cycle phase, hormone awareness, and wellness tracking for more personalised recovery insights. Completely private.'
                        : 'Optional wellness consistency tracking for personalised recovery insights. Completely private.'}
                    </p>
                  </div>
                </div>

                {isAdultEligible ? (
                  <Button
                    type="button"
                    variant={enableAdult ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => { setEnableAdult(!enableAdult); setContraceptiveUse(false); setContraceptiveType(''); }}
                    className="w-full"
                  >
                    {enableAdult ? 'Cancel Adult Tracking' : 'Enable Adult Tracking'}
                  </Button>
                ) : (
                  computedAge !== null && (
                    <p className="text-xs text-center text-muted-foreground py-1">
                      Adult tracking is available at 18+
                    </p>
                  )
                )}

                {/* Contraceptive section — female, adult enabled, 18+ */}
                {biologicalSex === 'female' && enableAdult && isAdultEligible && (
                  <div className="space-y-3 pt-1 border-t border-border/50">
                    <button
                      type="button"
                      onClick={() => { setContraceptiveUse(!contraceptiveUse); setContraceptiveType(''); }}
                      className={cn(
                        'w-full py-2 rounded-lg text-sm font-medium border transition-all',
                        contraceptiveUse
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      {contraceptiveUse
                        ? <><Check className="inline h-3 w-3 mr-1" /> Currently using a contraceptive</>
                        : 'I am currently using a contraceptive'}
                    </button>

                    {contraceptiveUse && (
                      <div className="space-y-2">
                        <Label className="text-xs">Contraceptive Type (optional)</Label>
                        <ChipSelector
                          options={CONTRACEPTIVE_TYPES}
                          selected={contraceptiveType ? [contraceptiveType] : []}
                          onToggle={(val) => setContraceptiveType(val === contraceptiveType ? '' : val)}
                          multiSelect={false}
                        />
                      </div>
                    )}

                    <div className="flex items-start gap-2 p-2 bg-muted/20 rounded-lg">
                      <Info className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        This helps us factor hormonal influences on your recovery and energy patterns. Educational purposes only — not medical advice.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Summary confirmation if no sex selected */}
            {!biologicalSex && (
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-sm text-muted-foreground">
                  You're almost set! Select your date of birth and biological sex above to personalise your Physio Regulation reports, nutrition suggestions, and recovery recommendations.
                </p>
              </div>
            )}
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
              disabled={saving}
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
