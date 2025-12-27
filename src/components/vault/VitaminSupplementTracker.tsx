import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Pill, Plus, Check, ChevronDown, Trash2, Clock } from 'lucide-react';
import { useVitaminLogs, VitaminTiming, CreateVitaminInput } from '@/hooks/useVitaminLogs';
import { cn } from '@/lib/utils';

const TIMING_OPTIONS: { value: VitaminTiming; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'with_breakfast', label: 'With Breakfast' },
  { value: 'with_lunch', label: 'With Lunch' },
  { value: 'with_dinner', label: 'With Dinner' },
  { value: 'evening', label: 'Evening' },
  { value: 'before_bed', label: 'Before Bed' },
];

interface VitaminSupplementTrackerProps {
  compact?: boolean;
}

export function VitaminSupplementTracker({ compact = false }: VitaminSupplementTrackerProps) {
  const { t } = useTranslation();
  const { vitamins, loading, takenCount, addVitamin, markVitaminTaken, deleteVitamin } = useVitaminLogs();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newTiming, setNewTiming] = useState<VitaminTiming>('morning');
  const [isRecurring, setIsRecurring] = useState(true);
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    
    setAdding(true);
    try {
      const input: CreateVitaminInput = {
        vitaminName: newName.trim(),
        dosage: newDosage.trim() || undefined,
        timing: newTiming,
        isRecurring,
      };
      
      await addVitamin(input);
      setNewName('');
      setNewDosage('');
      setShowAddForm(false);
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (vitaminId: string, currentTaken: boolean) => {
    await markVitaminTaken(vitaminId, !currentTaken);
  };

  const handleDelete = async (vitaminId: string) => {
    await deleteVitamin(vitaminId);
  };

  // Group by timing
  const groupedVitamins = vitamins.reduce((acc, v) => {
    const key = v.timing || 'morning';
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {} as Record<string, typeof vitamins>);

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
        
        {vitamins.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {vitamins.map((vitamin) => (
              <div 
                key={vitamin.id}
                onClick={() => handleToggle(vitamin.id, vitamin.taken)}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
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
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "text-sm block truncate",
                    vitamin.taken && 'text-green-600 dark:text-green-400 line-through'
                  )}>
                    {vitamin.vitaminName}
                  </span>
                  {vitamin.dosage && (
                    <span className="text-xs text-muted-foreground">{vitamin.dosage}</span>
                  )}
                </div>
                {vitamin.taken && <Check className="h-3 w-3 text-green-500 flex-shrink-0" />}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-2 text-sm text-muted-foreground">
            {t('vault.vitamins.noVitamins', 'No vitamins set up yet')}
          </p>
        )}
        
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          {t('vault.vitamins.add', 'Add Vitamin')}
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-lg">{t('vault.vitamins.title', 'Vitamins & Supplements')}</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {takenCount}/{vitamins.length}
                </Badge>
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Add form */}
            {showAddForm ? (
              <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
                <Input
                  placeholder={t('vault.vitamins.namePlaceholder', 'Vitamin name')}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder={t('vault.vitamins.dosagePlaceholder', 'Dosage (optional)')}
                    value={newDosage}
                    onChange={(e) => setNewDosage(e.target.value)}
                  />
                  <Select value={newTiming} onValueChange={(v) => setNewTiming(v as VitaminTiming)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMING_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isRecurring}
                    onCheckedChange={(c) => setIsRecurring(c === true)}
                    id="recurring"
                  />
                  <label htmlFor="recurring" className="text-sm">
                    {t('vault.vitamins.recurring', 'Repeat daily')}
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAdd} disabled={adding || !newName.trim()} className="flex-1">
                    {adding ? 'Adding...' : t('vault.vitamins.add', 'Add')}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    {t('common.cancel', 'Cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-4 w-4" />
                {t('vault.vitamins.add', 'Add Vitamin')}
              </Button>
            )}

            {/* Vitamins grouped by timing */}
            {TIMING_OPTIONS.filter(opt => groupedVitamins[opt.value]?.length > 0).map(timing => (
              <div key={timing.value} className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {timing.label}
                </div>
                {groupedVitamins[timing.value].map(vitamin => (
                  <div 
                    key={vitamin.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors",
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
                      <p className={cn(
                        "font-medium",
                        vitamin.taken && 'line-through text-muted-foreground'
                      )}>
                        {vitamin.vitaminName}
                      </p>
                      {vitamin.dosage && (
                        <p className="text-xs text-muted-foreground">{vitamin.dosage}</p>
                      )}
                    </div>
                    {vitamin.isRecurring && (
                      <Badge variant="outline" className="text-xs">Daily</Badge>
                    )}
                    {vitamin.taken && <Check className="h-4 w-4 text-green-500" />}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(vitamin.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ))}

            {vitamins.length === 0 && !showAddForm && (
              <div className="text-center py-6 text-muted-foreground">
                <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('vault.vitamins.empty', 'No vitamins tracked yet')}</p>
                <p className="text-xs mt-1">{t('vault.vitamins.emptyHint', 'Add vitamins to track daily intake')}</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
