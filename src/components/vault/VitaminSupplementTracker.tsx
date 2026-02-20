import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Pill, Plus, Check, ChevronDown, Trash2, Clock, Info, Leaf, Zap, Dumbbell, FlaskConical } from 'lucide-react';
import { useVitaminLogs, VitaminTiming, VitaminCategory, VitaminUnit, CreateVitaminInput } from '@/hooks/useVitaminLogs';
import { cn } from '@/lib/utils';

// ─── Reference data ──────────────────────────────────────────────────────────

interface SupplementRef {
  category: VitaminCategory;
  unit: VitaminUnit;
  note: string;
  dosageRange: string;
}

const SUPPLEMENT_REFERENCE: Record<string, SupplementRef> = {
  'Vitamin D3':      { category: 'vitamin',    unit: 'IU',      note: 'Supports bone density, immune regulation & testosterone synthesis.',          dosageRange: '1000–5000 IU' },
  'Vitamin C':       { category: 'vitamin',    unit: 'mg',      note: 'Antioxidant; accelerates collagen repair in connective tissue post-training.', dosageRange: '500–1000 mg' },
  'Vitamin B12':     { category: 'vitamin',    unit: 'mcg',     note: 'Essential for red blood cell production and nerve signal velocity.',            dosageRange: '500–1000 mcg' },
  'Vitamin K2':      { category: 'vitamin',    unit: 'mcg',     note: 'Directs calcium into bone, preventing arterial calcification.',               dosageRange: '100–200 mcg' },
  'Vitamin B6':      { category: 'vitamin',    unit: 'mg',      note: 'Critical for amino acid metabolism and neurotransmitter synthesis.',           dosageRange: '25–100 mg' },
  'Folate (B9)':     { category: 'vitamin',    unit: 'mcg',     note: 'DNA repair and cell division; critical during high training load.',            dosageRange: '400–800 mcg' },
  'Magnesium':       { category: 'mineral',    unit: 'mg',      note: 'Required for 300+ enzymatic reactions; reduces muscle cramping & aids sleep.', dosageRange: '200–400 mg' },
  'Zinc':            { category: 'mineral',    unit: 'mg',      note: 'Supports testosterone production, immune defense, and protein synthesis.',     dosageRange: '15–30 mg' },
  'Iron':            { category: 'mineral',    unit: 'mg',      note: 'Oxygen transport via hemoglobin; low iron = blunted VO2 capacity.',            dosageRange: '18–45 mg' },
  'Calcium':         { category: 'mineral',    unit: 'mg',      note: 'Bone matrix density and muscular contraction signaling.',                     dosageRange: '500–1000 mg' },
  'Potassium':       { category: 'mineral',    unit: 'mg',      note: 'Electrolyte regulating cardiac rhythm and muscle contraction.',               dosageRange: '200–400 mg' },
  'Selenium':        { category: 'mineral',    unit: 'mcg',     note: 'Thyroid hormone conversion and antioxidant enzyme co-factor.',                dosageRange: '55–200 mcg' },
  'Iodine':          { category: 'mineral',    unit: 'mcg',     note: 'Essential for thyroid hormone synthesis governing metabolic rate.',           dosageRange: '150–300 mcg' },
  'Omega-3':         { category: 'supplement', unit: 'g',       note: 'Reduces systemic inflammation; improves joint mobility and CNS recovery.',    dosageRange: '2–4 g EPA/DHA' },
  'Creatine':        { category: 'supplement', unit: 'g',       note: 'Regenerates phosphocreatine for explosive power; proven in 1000+ studies.',   dosageRange: '3–5 g' },
  'Melatonin':       { category: 'supplement', unit: 'mg',      note: 'Regulates circadian rhythm; improves deep-sleep architecture for recovery.',  dosageRange: '0.5–3 mg' },
  'CoQ10':           { category: 'supplement', unit: 'mg',      note: 'Mitochondrial electron transport; reduces oxidative stress under high load.',  dosageRange: '100–300 mg' },
  'Ashwagandha':     { category: 'herb',       unit: 'mg',      note: 'Adaptogen that lowers cortisol; improves strength output under stress.',      dosageRange: '300–600 mg' },
  'Rhodiola Rosea':  { category: 'herb',       unit: 'mg',      note: 'Reduces mental fatigue; shown to cut perceived exertion during high load.',   dosageRange: '200–400 mg' },
  'Turmeric':        { category: 'herb',       unit: 'mg',      note: 'Curcumin inhibits NF-κB inflammatory pathway for tissue repair.',            dosageRange: '500–1500 mg' },
  'Whey Protein':    { category: 'protein',    unit: 'serving', note: 'Fast-digesting; peaks plasma amino acids within 60 min for MPS trigger.',    dosageRange: '20–40 g' },
  'Casein Protein':  { category: 'protein',    unit: 'serving', note: 'Slow-release; sustains amino acid elevation 5–7 h for overnight repair.',    dosageRange: '25–40 g' },
  'Collagen':        { category: 'protein',    unit: 'g',       note: 'Stimulates tendon & ligament collagen synthesis; peak effect with Vit C.',   dosageRange: '10–15 g' },
  'Beta-Alanine':    { category: 'amino_acid', unit: 'g',       note: 'Buffers muscle acidosis (H⁺) during high-intensity sets lasting 1–4 min.',   dosageRange: '3.2–6.4 g' },
  'L-Glutamine':     { category: 'amino_acid', unit: 'g',       note: 'Gut lining integrity and immune function under heavy training stress.',       dosageRange: '5–10 g' },
  'L-Citrulline':    { category: 'amino_acid', unit: 'g',       note: 'Converts to arginine; raises NO for vasodilation and pump.',                 dosageRange: '6–8 g' },
  'BCAA':            { category: 'amino_acid', unit: 'g',       note: 'Leucine initiates mTOR signaling; reduces exercise-induced muscle damage.',   dosageRange: '5–10 g' },
  'Taurine':         { category: 'amino_acid', unit: 'mg',      note: 'Osmoregulation in muscle cells; reduces exercise-induced oxidative stress.',  dosageRange: '1000–3000 mg' },
  'Caffeine':        { category: 'supplement', unit: 'mg',      note: 'Adenosine receptor antagonist; sharpens focus and delays fatigue onset.',     dosageRange: '3–6 mg/kg BW' },
  'Electrolytes':    { category: 'mineral',    unit: 'serving', note: 'Na⁺/K⁺/Mg²⁺ balance critical for nerve signaling during sweat loss.',        dosageRange: '1 serving' },
};

const SUPPLEMENT_NAMES = Object.keys(SUPPLEMENT_REFERENCE);

// ─── Options ─────────────────────────────────────────────────────────────────

const TIMING_OPTIONS: { value: VitaminTiming; label: string }[] = [
  { value: 'morning',        label: 'Morning' },
  { value: 'with_breakfast', label: 'With Breakfast' },
  { value: 'with_lunch',     label: 'With Lunch' },
  { value: 'with_dinner',    label: 'With Dinner' },
  { value: 'evening',        label: 'Evening' },
  { value: 'before_bed',     label: 'Before Bed' },
];

const CATEGORY_OPTIONS: { value: VitaminCategory; label: string; colorClass: string }[] = [
  { value: 'vitamin',    label: 'Vitamin',    colorClass: 'text-amber-500' },
  { value: 'mineral',    label: 'Mineral',    colorClass: 'text-blue-500' },
  { value: 'supplement', label: 'Supplement', colorClass: 'text-purple-500' },
  { value: 'herb',       label: 'Herb',       colorClass: 'text-green-500' },
  { value: 'protein',    label: 'Protein',    colorClass: 'text-red-500' },
  { value: 'amino_acid', label: 'Amino Acid', colorClass: 'text-cyan-500' },
];

const UNIT_OPTIONS: VitaminUnit[] = ['mg', 'mcg', 'IU', 'g', 'ml', 'capsule', 'tablet', 'serving'];

const PURPOSE_CHIPS = ['Energy', 'Recovery', 'Immunity', 'Bone Health', 'Sleep', 'Focus', 'Hormone Support', 'Gut Health'];

const CATEGORY_ICONS: Record<VitaminCategory, React.ElementType> = {
  vitamin:    Pill,
  mineral:    FlaskConical,
  supplement: Zap,
  herb:       Leaf,
  protein:    Dumbbell,
  amino_acid: Dumbbell,
};

function getCategoryColorClass(cat: VitaminCategory) {
  return CATEGORY_OPTIONS.find(c => c.value === cat)?.colorClass ?? 'text-muted-foreground';
}

// ─── Add Form (extracted to avoid hook-in-render issues) ─────────────────────

interface AddFormProps {
  onClose: () => void;
  onAdd: (input: CreateVitaminInput) => Promise<unknown>;
}

function VitaminAddForm({ onClose, onAdd }: AddFormProps) {
  const [newName, setNewName]         = useState('');
  const [newDosage, setNewDosage]     = useState('');
  const [newUnit, setNewUnit]         = useState<VitaminUnit>('mg');
  const [newCategory, setNewCategory] = useState<VitaminCategory>('supplement');
  const [newTiming, setNewTiming]     = useState<VitaminTiming>('morning');
  const [newPurpose, setNewPurpose]   = useState('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [adding, setAdding]           = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (newName.trim().length < 1) { setSuggestions([]); return; }
    setSuggestions(
      SUPPLEMENT_NAMES.filter(n => n.toLowerCase().includes(newName.toLowerCase())).slice(0, 6)
    );
  }, [newName]);

  const applySuggestion = (name: string) => {
    const ref = SUPPLEMENT_REFERENCE[name];
    setNewName(name);
    if (ref) { setNewCategory(ref.category); setNewUnit(ref.unit); }
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await onAdd({
        vitaminName: newName.trim(),
        dosage: newDosage.trim() || undefined,
        timing: newTiming,
        isRecurring,
        category: newCategory,
        unit: newUnit,
        purpose: newPurpose.trim() || undefined,
      });
      onClose();
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
      {/* Category selector */}
      <div className="grid grid-cols-3 gap-1.5">
        {CATEGORY_OPTIONS.map(cat => {
          const Icon = CATEGORY_ICONS[cat.value];
          const active = newCategory === cat.value;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => setNewCategory(cat.value)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium border transition-colors',
                active ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
              )}
            >
              <Icon className={cn('h-3 w-3', !active && cat.colorClass)} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Name + smart suggestions */}
      <div className="relative">
        <Input
          placeholder="Supplement name"
          value={newName}
          onChange={e => { setNewName(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg overflow-hidden">
            {suggestions.map(name => {
              const ref = SUPPLEMENT_REFERENCE[name];
              return (
                <button
                  key={name}
                  type="button"
                  onMouseDown={() => applySuggestion(name)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted text-left gap-2"
                >
                  <span className="font-medium">{name}</span>
                  {ref && <span className="text-xs text-muted-foreground shrink-0">{ref.dosageRange}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Dosage + Unit */}
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Dosage (optional)"
          value={newDosage}
          onChange={e => setNewDosage(e.target.value)}
        />
        <Select value={newUnit} onValueChange={v => setNewUnit(v as VitaminUnit)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Purpose chips */}
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Purpose (optional)</p>
        <div className="flex flex-wrap gap-1.5">
          {PURPOSE_CHIPS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setNewPurpose(prev => prev === p ? '' : p)}
              className={cn(
                'px-2 py-0.5 rounded-full text-xs border transition-colors',
                newPurpose === p ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Timing */}
      <Select value={newTiming} onValueChange={v => setNewTiming(v as VitaminTiming)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {TIMING_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Recurring */}
      <div className="flex items-center gap-2">
        <Checkbox checked={isRecurring} onCheckedChange={c => setIsRecurring(c === true)} id="recurring" />
        <label htmlFor="recurring" className="text-sm">Repeat daily</label>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleAdd} disabled={adding || !newName.trim()} className="flex-1">
          {adding ? 'Adding…' : 'Add Supplement'}
        </Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface VitaminSupplementTrackerProps {
  compact?: boolean;
}

export function VitaminSupplementTracker({ compact = false }: VitaminSupplementTrackerProps) {
  const { t } = useTranslation();
  const { vitamins, weeklyAdherence, loading, takenCount, addVitamin, markVitaminTaken, deleteVitamin } = useVitaminLogs();
  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleToggle = (vitaminId: string, currentTaken: boolean) =>
    markVitaminTaken(vitaminId, !currentTaken);

  const grouped = vitamins.reduce((acc, v) => {
    const key = v.category || 'supplement';
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {} as Record<string, typeof vitamins>);

  const progressPct = vitamins.length > 0 ? Math.round((takenCount / vitamins.length) * 100) : 0;
  const today = new Date().toISOString().split('T')[0];

  if (loading && vitamins.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-muted animate-pulse" />
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  // ── Compact view ──────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">{t('vault.vitamins.title', 'Vitamins & Supplements')}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {takenCount}/{vitamins.length} {t('vault.vitamins.taken', 'taken')}
          </Badge>
        </div>

        {vitamins.length > 0 && (
          <Progress value={progressPct} className="h-1.5" indicatorClassName="bg-purple-500" />
        )}

        {vitamins.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {vitamins.map(vitamin => {
              const Icon = CATEGORY_ICONS[vitamin.category] ?? Pill;
              return (
                <div
                  key={vitamin.id}
                  onClick={() => handleToggle(vitamin.id, vitamin.taken)}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                    vitamin.taken
                      ? 'bg-green-500/20 border border-green-500/30'
                      : 'bg-muted/50 hover:bg-muted border border-transparent'
                  )}
                >
                  <Checkbox
                    checked={vitamin.taken}
                    onCheckedChange={() => handleToggle(vitamin.id, vitamin.taken)}
                    className="h-4 w-4"
                  />
                  <Icon className={cn('h-3 w-3 shrink-0', getCategoryColorClass(vitamin.category))} />
                  <div className="flex-1 min-w-0">
                    <span className={cn('text-sm block truncate', vitamin.taken && 'text-green-600 dark:text-green-400 line-through')}>
                      {vitamin.vitaminName}
                    </span>
                    {vitamin.dosage && (
                      <span className="text-xs text-muted-foreground">{vitamin.dosage} {vitamin.unit}</span>
                    )}
                  </div>
                  {vitamin.taken && <Check className="h-3 w-3 text-green-500 shrink-0" />}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center py-2 text-sm text-muted-foreground">
            {t('vault.vitamins.noVitamins', 'No supplements set up yet')}
          </p>
        )}

        {showAddForm ? (
          <VitaminAddForm onClose={() => setShowAddForm(false)} onAdd={addVitamin} />
        ) : (
          <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => setShowAddForm(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Supplement
          </Button>
        )}
      </div>
    );
  }

  // ── Full view ─────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <Card>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-purple-500" />
                  <CardTitle className="text-lg">{t('vault.vitamins.title', 'Vitamins & Supplements')}</CardTitle>
                  <Badge variant="secondary" className="text-xs">{takenCount}/{vitamins.length}</Badge>
                </div>
                <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
              </div>
              {vitamins.length > 0 && isOpen && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Today's progress</span>
                    <span>{progressPct}%</span>
                  </div>
                  <Progress value={progressPct} className="h-2" indicatorClassName="bg-purple-500" />
                </div>
              )}
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-4">
              {showAddForm ? (
                <VitaminAddForm onClose={() => setShowAddForm(false)} onAdd={addVitamin} />
              ) : (
                <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4" />
                  Add Supplement
                </Button>
              )}

              {/* 7-day stack adherence bar */}
              {weeklyAdherence.length > 0 && vitamins.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">7-day stack adherence</p>
                  <div className="flex gap-1">
                    {weeklyAdherence.map(day => {
                      const pct = day.total > 0 ? day.taken / day.total : null;
                      const isToday = day.date === today;
                      return (
                        <Tooltip key={day.date}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'flex-1 rounded-sm h-3 cursor-default transition-colors',
                                pct === null  ? 'bg-muted' :
                                pct === 1     ? 'bg-green-500' :
                                pct >= 0.5    ? 'bg-yellow-500' : 'bg-destructive/50',
                                isToday && 'ring-1 ring-offset-1 ring-primary'
                              )}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            <br />
                            {day.total > 0 ? `${day.taken}/${day.total} taken` : 'No data'}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grouped by category */}
              {CATEGORY_OPTIONS.filter(cat => grouped[cat.value]?.length > 0).map(cat => {
                const Icon = CATEGORY_ICONS[cat.value];
                return (
                  <div key={cat.value} className="space-y-2">
                    <div className={cn('flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide', cat.colorClass)}>
                      <Icon className="h-3.5 w-3.5" />
                      {cat.label}s
                    </div>
                    {grouped[cat.value].map(vitamin => {
                      const ref = SUPPLEMENT_REFERENCE[vitamin.vitaminName];
                      return (
                        <div
                          key={vitamin.id}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg transition-colors',
                            vitamin.taken
                              ? 'bg-green-500/20 border border-green-500/30'
                              : 'bg-muted/50 border border-transparent'
                          )}
                        >
                          <Checkbox
                            checked={vitamin.taken}
                            onCheckedChange={() => handleToggle(vitamin.id, vitamin.taken)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className={cn('font-medium text-sm', vitamin.taken && 'line-through text-muted-foreground')}>
                                {vitamin.vitaminName}
                              </p>
                              {ref && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3 w-3 text-muted-foreground cursor-help shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                                    {ref.note}
                                    <br />
                                    <span className="text-muted-foreground">Typical: {ref.dosageRange}</span>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {vitamin.dosage && (
                                <span className="text-xs text-muted-foreground">{vitamin.dosage} {vitamin.unit}</span>
                              )}
                              {vitamin.purpose && (
                                <Badge variant="outline" className="text-xs py-0 h-4">{vitamin.purpose}</Badge>
                              )}
                              {vitamin.timing && (
                                <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {TIMING_OPTIONS.find(t => t.value === vitamin.timing)?.label}
                                </div>
                              )}
                              {vitamin.isRecurring && (
                                <Badge variant="outline" className="text-xs py-0 h-4">Daily</Badge>
                              )}
                            </div>
                          </div>
                          {vitamin.taken && <Check className="h-4 w-4 text-green-500 shrink-0" />}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                            onClick={e => { e.stopPropagation(); deleteVitamin(vitamin.id); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {vitamins.length === 0 && !showAddForm && (
                <div className="text-center py-6 text-muted-foreground">
                  <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No supplements tracked yet</p>
                  <p className="text-xs mt-1">Add supplements to track daily intake and adherence</p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </TooltipProvider>
  );
}
