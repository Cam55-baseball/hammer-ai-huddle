import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Apple, Pill, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MealData, MealItem, Vitamin, Supplement } from '@/types/customActivity';
import { cn } from '@/lib/utils';

interface MealBuilderProps {
  meals: MealData;
  onChange: (meals: MealData) => void;
}

export function MealBuilder({ meals, onChange }: MealBuilderProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('items');

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

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="items" className="gap-1.5">
            <Apple className="h-4 w-4" />
            {t('customActivity.meals.food')} ({meals.items.length})
          </TabsTrigger>
          <TabsTrigger value="vitamins" className="gap-1.5">
            <Pill className="h-4 w-4" />
            {t('customActivity.meals.vitamins')} ({meals.vitamins.length})
          </TabsTrigger>
          <TabsTrigger value="supplements" className="gap-1.5">
            <Sparkles className="h-4 w-4" />
            {t('customActivity.meals.supplements')} ({meals.supplements.length})
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
      </Tabs>
    </div>
  );
}
