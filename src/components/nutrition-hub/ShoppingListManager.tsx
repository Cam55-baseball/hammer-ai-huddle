import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Check,
  Calendar,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useShoppingLists, ShoppingList } from '@/hooks/useShoppingLists';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

export function ShoppingListManager() {
  const { t } = useTranslation();
  const {
    lists,
    activeList,
    loading,
    createList,
    generateFromMealPlan,
    addItem,
    toggleItemChecked,
    removeItem,
    updateItemQuantity,
    deleteList,
    setListActive,
    getItemsByCategory,
  } = useShoppingLists();

  const [newListName, setNewListName] = useState('');
  const [showNewListDialog, setShowNewListDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(addDays(new Date(), 6), 'yyyy-MM-dd'),
  });
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('unit');

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    await createList(newListName.trim());
    setNewListName('');
    setShowNewListDialog(false);
  };

  const handleGenerateList = async () => {
    await generateFromMealPlan(dateRange.start, dateRange.end);
    setShowGenerateDialog(false);
  };

  const handleAddItem = async () => {
    if (!activeList || !newItemName.trim()) return;
    await addItem(activeList.id, {
      name: newItemName.trim(),
      quantity: parseFloat(newItemQuantity) || 1,
      unit: newItemUnit,
      category: '',
    });
    setNewItemName('');
    setNewItemQuantity('1');
  };

  const itemsByCategory = activeList ? getItemsByCategory(activeList) : [];
  const checkedCount = activeList?.items.filter(i => i.checked).length || 0;
  const totalCount = activeList?.items.length || 0;

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          {t('nutrition.shopping.title', 'Shopping Lists')}
        </h3>
        <div className="flex gap-2">
          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Sparkles className="h-4 w-4 mr-1" />
                {t('nutrition.shopping.generate', 'Generate')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('nutrition.shopping.generateFromPlan', 'Generate from Meal Plan')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('nutrition.shopping.startDate', 'Start Date')}</Label>
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('nutrition.shopping.endDate', 'End Date')}</Label>
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    />
                  </div>
                </div>
                <Button onClick={handleGenerateList} className="w-full">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {t('nutrition.shopping.generateList', 'Generate Shopping List')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showNewListDialog} onOpenChange={setShowNewListDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                {t('nutrition.shopping.newList', 'New List')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('nutrition.shopping.createList', 'Create Shopping List')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('nutrition.shopping.listName', 'List Name')}</Label>
                  <Input
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder={t('nutrition.shopping.listNamePlaceholder', 'Weekly Groceries')}
                  />
                </div>
                <Button onClick={handleCreateList} className="w-full">
                  {t('common.save', 'Save')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* List selector */}
      {lists.length > 1 && (
        <Select
          value={activeList?.id}
          onValueChange={(id) => setListActive(id)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('nutrition.shopping.selectList', 'Select a list')} />
          </SelectTrigger>
          <SelectContent>
            {lists.map((list) => (
              <SelectItem key={list.id} value={list.id}>
                {list.name}
                {list.is_active && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {t('nutrition.shopping.active', 'Active')}
                  </Badge>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Active list */}
      {activeList ? (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{activeList.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {checkedCount}/{totalCount}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => deleteList(activeList.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {activeList.date_range_start && activeList.date_range_end && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {activeList.date_range_start} - {activeList.date_range_end}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add item form */}
            <div className="flex gap-2">
              <Input
                placeholder={t('nutrition.shopping.addItem', 'Add item...')}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                className="flex-1"
              />
              <Input
                type="number"
                value={newItemQuantity}
                onChange={(e) => setNewItemQuantity(e.target.value)}
                className="w-16"
                min="0.1"
                step="0.1"
              />
              <Select value={newItemUnit} onValueChange={setNewItemUnit}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unit">unit</SelectItem>
                  <SelectItem value="lb">lb</SelectItem>
                  <SelectItem value="oz">oz</SelectItem>
                  <SelectItem value="cup">cup</SelectItem>
                  <SelectItem value="tbsp">tbsp</SelectItem>
                  <SelectItem value="tsp">tsp</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddItem} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Items by category */}
            <ScrollArea className="max-h-[400px]">
              {itemsByCategory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t('nutrition.shopping.emptyList', 'No items in this list yet')}
                </p>
              ) : (
                <div className="space-y-4">
                  {itemsByCategory.map(([category, items]) => (
                    <div key={category}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <ChevronRight className="h-3 w-3" />
                        {category}
                      </h4>
                      <div className="space-y-1">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded hover:bg-muted/50 group transition-colors",
                              item.checked && "opacity-50"
                            )}
                          >
                            <Checkbox
                              checked={item.checked}
                              onCheckedChange={() => toggleItemChecked(activeList.id, item.id)}
                            />
                            <span className={cn(
                              "flex-1 text-sm",
                              item.checked && "line-through"
                            )}>
                              {item.quantity} {item.unit} {item.name}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                              onClick={() => removeItem(activeList.id, item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Progress bar */}
            {totalCount > 0 && (
              <div className="space-y-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(checkedCount / totalCount) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {checkedCount === totalCount
                    ? t('nutrition.shopping.complete', 'All done! 🎉')
                    : t('nutrition.shopping.progress', '{{checked}} of {{total}} items', { checked: checkedCount, total: totalCount })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <ShoppingCart className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {t('nutrition.shopping.noLists', 'No shopping lists yet')}
            </p>
            <Button className="mt-4" onClick={() => setShowNewListDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('nutrition.shopping.createFirst', 'Create Your First List')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
