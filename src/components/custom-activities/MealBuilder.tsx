import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Apple, Pill, Sparkles, Droplets, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MealData, MealItem, Vitamin, Supplement, HydrationData } from '@/types/customActivity';
import { cn } from '@/lib/utils';
import { useMealVaultSync } from '@/hooks/useMealVaultSync';
import { toast } from 'sonner';

interface MealBuilderProps {
  meals: MealData;
  onChange: (meals: MealData) => void;
  showVaultSync?: boolean;
}

const HYDRATION_UNITS = ['oz', 'ml', 'cups', 'liters'] as const;

export function MealBuilder({ meals, onChange, showVaultSync = false }: MealBuilderProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('items');
  const [syncToVault, setSyncToVault] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { syncAll } = useMealVaultSync();

  // Ensure hydration exists
  const hydration = meals.hydration || { amount: 0, unit: 'oz' as const, goal: 64 };

  const addItem = () => {
    const newItem: MealItem = {
      id: crypto.randomUUID(),
      name: '',
      quantity: 1,
    };
    onChange({ ...meals, items: [...meals.items, newItem] });
  };

  const updateItem = (id: string, updates: Partial<MealItem>) => {
    onChange({
      ...meals,
      items: meals.items.map(item => item.id === id ? { ...item, ...updates } : item),
    });
  };

  const removeItem = (id: string) => {
    onChange({ ...meals, items: meals.items.filter(item => item.id !== id) });
  };

  const addVitamin = () => {
    const newVitamin: Vitamin = {
      id: crypto.randomUUID(),
      name: '',
      timing: 'morning',
    };
    onChange({ ...meals, vitamins: [...meals.vitamins, newVitamin] });
  };

  const updateVitamin = (id: string, updates: Partial<Vitamin>) => {
    onChange({
      ...meals,
      vitamins: meals.vitamins.map(v => v.id === id ? { ...v, ...updates } : v),
    });
  };

  const removeVitamin = (id: string) => {
    onChange({ ...meals, vitamins: meals.vitamins.filter(v => v.id !== id) });
  };

  const addSupplement = () => {
    const newSupplement: Supplement = {
      id: crypto.randomUUID(),
      name: '',
    };
    onChange({ ...meals, supplements: [...meals.supplements, newSupplement] });
  };

  const updateSupplement = (id: string, updates: Partial<Supplement>) => {
    onChange({
      ...meals,
      supplements: meals.supplements.map(s => s.id === id ? { ...s, ...updates } : s),
    });
  };

  const removeSupplement = (id: string) => {
    onChange({ ...meals, supplements: meals.supplements.filter(s => s.id !== id) });
  };

  const updateHydration = (updates: Partial<HydrationData>) => {
    onChange({
      ...meals,
      hydration: { ...hydration, ...updates },
    });
  };

  const addHydrationEntry = () => {
    const entries = hydration.entries || [];
    const newEntry = {
      id: crypto.randomUUID(),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      amount: 8,
    };
    updateHydration({ entries: [...entries, newEntry] });
  };

  const updateHydrationEntry = (id: string, updates: Partial<{ time: string; amount: number }>) => {
    const entries = hydration.entries || [];
    updateHydration({
      entries: entries.map(e => e.id === id ? { ...e, ...updates } : e),
    });
  };

  const removeHydrationEntry = (id: string) => {
    const entries = hydration.entries || [];
    updateHydration({ entries: entries.filter(e => e.id !== id) });
  };

  const handleSyncToVault = async () => {
    setSyncing(true);
    try {
      await syncAll(meals, { syncToVault: true });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Vault Sync Option */}
      {showVaultSync && (
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            <div>
              <Label className="text-sm font-medium">
                {t('customActivity.meals.syncToVault', 'Sync to Nutrition Tracker')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('customActivity.meals.syncToVaultDesc', 'Log this data to The Vault')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={syncToVault}
              onCheckedChange={setSyncToVault}
            />
            {syncToVault && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleSyncToVault}
                disabled={syncing}
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            )}
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="items" className="gap-1.5 text-xs">
            <Apple className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('customActivity.meals.food')}</span> ({meals.items.length})
          </TabsTrigger>
          <TabsTrigger value="vitamins" className="gap-1.5 text-xs">
            <Pill className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('customActivity.meals.vitamins')}</span> ({meals.vitamins.length})
          </TabsTrigger>
          <TabsTrigger value="supplements" className="gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('customActivity.meals.supplements')}</span> ({meals.supplements.length})
          </TabsTrigger>
          <TabsTrigger value="hydration" className="gap-1.5 text-xs">
            <Droplets className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('customActivity.meals.hydration.title')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-3 mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="w-full gap-1"
          >
            <Plus className="h-4 w-4" />
            {t('customActivity.meals.addFood')}
          </Button>

          {meals.items.map(item => (
            <div key={item.id} className="flex items-start gap-2 p-3 rounded-lg border bg-background/50">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(item.id, { name: e.target.value })}
                    placeholder={t('customActivity.meals.foodName')}
                    className="h-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={item.quantity || ''}
                    onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || undefined })}
                    placeholder="Qty"
                    className="h-9 w-20"
                    min={0}
                  />
                  <Input
                    value={item.unit || ''}
                    onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                    placeholder="Unit"
                    className="h-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    value={item.calories || ''}
                    onChange={(e) => updateItem(item.id, { calories: parseInt(e.target.value) || undefined })}
                    placeholder="Cal"
                    className="h-9"
                    min={0}
                  />
                  <Input
                    type="number"
                    value={item.protein || ''}
                    onChange={(e) => updateItem(item.id, { protein: parseInt(e.target.value) || undefined })}
                    placeholder="Protein (g)"
                    className="h-9"
                    min={0}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {meals.items.length === 0 && (
            <p className="text-center py-6 text-muted-foreground text-sm">
              {t('customActivity.meals.emptyFood')}
            </p>
          )}
        </TabsContent>

        <TabsContent value="vitamins" className="space-y-3 mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addVitamin}
            className="w-full gap-1"
          >
            <Plus className="h-4 w-4" />
            {t('customActivity.meals.addVitamin')}
          </Button>

          {meals.vitamins.map(vitamin => (
            <div key={vitamin.id} className="flex items-center gap-2 p-3 rounded-lg border bg-background/50">
              <div className="flex-1 grid grid-cols-3 gap-2">
                <Input
                  value={vitamin.name}
                  onChange={(e) => updateVitamin(vitamin.id, { name: e.target.value })}
                  placeholder={t('customActivity.meals.vitaminName')}
                  className="h-9 col-span-2"
                />
                <Select
                  value={vitamin.timing || 'morning'}
                  onValueChange={(value) => updateVitamin(vitamin.id, { timing: value as Vitamin['timing'] })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">{t('customActivity.meals.timing.morning')}</SelectItem>
                    <SelectItem value="afternoon">{t('customActivity.meals.timing.afternoon')}</SelectItem>
                    <SelectItem value="evening">{t('customActivity.meals.timing.evening')}</SelectItem>
                    <SelectItem value="with_meal">{t('customActivity.meals.timing.withMeal')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive"
                onClick={() => removeVitamin(vitamin.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {meals.vitamins.length === 0 && (
            <p className="text-center py-6 text-muted-foreground text-sm">
              {t('customActivity.meals.emptyVitamins')}
            </p>
          )}
        </TabsContent>

        <TabsContent value="supplements" className="space-y-3 mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSupplement}
            className="w-full gap-1"
          >
            <Plus className="h-4 w-4" />
            {t('customActivity.meals.addSupplement')}
          </Button>

          {meals.supplements.map(supp => (
            <div key={supp.id} className="flex items-center gap-2 p-3 rounded-lg border bg-background/50">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  value={supp.name}
                  onChange={(e) => updateSupplement(supp.id, { name: e.target.value })}
                  placeholder={t('customActivity.meals.supplementName')}
                  className="h-9"
                />
                <Input
                  value={supp.dosage || ''}
                  onChange={(e) => updateSupplement(supp.id, { dosage: e.target.value })}
                  placeholder={t('customActivity.meals.dosage')}
                  className="h-9"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive"
                onClick={() => removeSupplement(supp.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {meals.supplements.length === 0 && (
            <p className="text-center py-6 text-muted-foreground text-sm">
              {t('customActivity.meals.emptySupplements')}
            </p>
          )}
        </TabsContent>

        <TabsContent value="hydration" className="space-y-4 mt-4">
          {/* Daily Goal and Current Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('customActivity.meals.hydration.dailyGoal')}</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={hydration.goal || ''}
                  onChange={(e) => updateHydration({ goal: parseInt(e.target.value) || undefined })}
                  placeholder="64"
                  className="h-9"
                  min={0}
                />
                <Select
                  value={hydration.unit}
                  onValueChange={(value) => updateHydration({ unit: value as HydrationData['unit'] })}
                >
                  <SelectTrigger className="h-9 w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HYDRATION_UNITS.map(unit => (
                      <SelectItem key={unit} value={unit}>
                        {t(`customActivity.meals.hydration.units.${unit}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('customActivity.meals.hydration.currentAmount')}</Label>
              <Input
                type="number"
                value={hydration.amount || ''}
                onChange={(e) => updateHydration({ amount: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="h-9"
                min={0}
              />
            </div>
          </div>

          {/* Progress bar */}
          {hydration.goal && hydration.goal > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('customActivity.meals.hydration.progress')}</span>
                <span>{Math.round((hydration.amount / hydration.goal) * 100)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${Math.min((hydration.amount / hydration.goal) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Hydration entries */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t('customActivity.meals.hydration.entries')}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addHydrationEntry}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('customActivity.meals.hydration.addEntry')}
              </Button>
            </div>

            {(hydration.entries || []).map(entry => (
              <div key={entry.id} className="flex items-center gap-2 p-2 rounded-lg border bg-background/50">
                <Input
                  type="time"
                  value={entry.time}
                  onChange={(e) => updateHydrationEntry(entry.id, { time: e.target.value })}
                  className="h-8 w-28"
                />
                <Input
                  type="number"
                  value={entry.amount}
                  onChange={(e) => updateHydrationEntry(entry.id, { amount: parseInt(e.target.value) || 0 })}
                  className="h-8 w-20"
                  min={0}
                />
                <span className="text-xs text-muted-foreground">{hydration.unit}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive ml-auto"
                  onClick={() => removeHydrationEntry(entry.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            {(!hydration.entries || hydration.entries.length === 0) && (
              <p className="text-center py-4 text-muted-foreground text-sm">
                {t('customActivity.meals.hydration.empty')}
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
