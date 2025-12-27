import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Calendar, 
  Copy, 
  Check,
  ListPlus
} from 'lucide-react';
import { useShoppingLists, ShoppingList, ShoppingItem } from '@/hooks/useShoppingLists';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

export function ShoppingListTab() {
  const { t } = useTranslation();
  const { 
    lists: shoppingLists, 
    activeList, 
    loading,
    createList,
    generateFromMealPlan,
    addItem,
    toggleItemChecked,
    removeItem,
    deleteList,
    setListActive,
    getItemsByCategory
  } = useShoppingLists();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 6), 'yyyy-MM-dd'));
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [copied, setCopied] = useState(false);

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      toast.error(t('common.required'));
      return;
    }
    
    try {
      await createList(newListName.trim());
      setNewListName('');
      setCreateDialogOpen(false);
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const handleGenerateFromPlan = async () => {
    try {
      await generateFromMealPlan(startDate, endDate);
      setGenerateDialogOpen(false);
      toast.success(t('shoppingList.generated'));
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const handleAddItem = async () => {
    if (!activeList || !newItemName.trim()) return;
    
    try {
      await addItem(activeList.id, {
        name: newItemName.trim(),
        quantity: parseFloat(newItemQuantity) || 1,
        unit: 'item',
        category: 'other'
      });
      setNewItemName('');
      setNewItemQuantity('1');
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const handleCopyToClipboard = () => {
    if (!activeList) return;
    
    const text = activeList.items
      .filter(item => !item.checked)
      .map(item => `${item.quantity} ${item.unit} ${item.name}`)
      .join('\n');
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(t('shoppingList.copied'));
  };

  const categorizedItems = activeList ? getItemsByCategory(activeList) : [];
  const checkedCount = activeList?.items.filter(i => i.checked).length || 0;
  const totalCount = activeList?.items.length || 0;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          {t('shoppingList.title')}
        </h3>
        
        <div className="flex gap-2">
          <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                {t('shoppingList.generateFromPlan')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('shoppingList.selectDates')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('shoppingList.startDate')}</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('shoppingList.endDate')}</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={handleGenerateFromPlan} className="w-full">
                  {t('shoppingList.generateFromPlan')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <ListPlus className="h-4 w-4 mr-2" />
                {t('shoppingList.createNew')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('shoppingList.createNew')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{t('shoppingList.listName')}</Label>
                  <Input
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder={t('shoppingList.listNamePlaceholder')}
                  />
                </div>
                <Button onClick={handleCreateList} className="w-full">
                  {t('common.save')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lists Selector */}
      {shoppingLists.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {shoppingLists.map((list) => (
            <Button
              key={list.id}
              variant={activeList?.id === list.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setListActive(list.id)}
            >
              {list.name}
              <Badge variant="secondary" className="ml-2">
                {list.items.length}
              </Badge>
            </Button>
          ))}
        </div>
      )}

      {/* Active List Content */}
      {activeList ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{activeList.name}</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t('shoppingList.checkedCount', { checked: checkedCount, total: totalCount })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCopyToClipboard}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => deleteList(activeList.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Item */}
            <div className="flex gap-2">
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={t('shoppingList.itemName')}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              />
              <Input
                type="number"
                value={newItemQuantity}
                onChange={(e) => setNewItemQuantity(e.target.value)}
                className="w-20"
                min="1"
              />
              <Button onClick={handleAddItem} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <Separator />

            {/* Items by Category */}
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                {categorizedItems.map(([category, items]: [string, ShoppingItem[]]) => (
                  <div key={category}>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 capitalize">
                      {t(`shoppingList.categories.${category.toLowerCase()}`, { defaultValue: category })}
                    </h4>
                    <div className="space-y-1">
                      {items.map((item: ShoppingItem) => (
                        <div 
                          key={item.id}
                          className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                            item.checked ? 'bg-muted/30 opacity-60' : 'bg-muted/50 hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={item.checked}
                              onCheckedChange={() => toggleItemChecked(activeList.id, item.id)}
                            />
                            <span className={item.checked ? 'line-through' : ''}>
                              {item.quantity} {item.unit} {item.name}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
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
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('shoppingList.noLists')}</h3>
            <p className="text-muted-foreground mb-4">{t('shoppingList.createFirstList')}</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <ListPlus className="h-4 w-4 mr-2" />
              {t('shoppingList.createNew')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
