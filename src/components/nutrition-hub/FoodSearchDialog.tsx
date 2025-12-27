import { useState } from 'react';
import { Search, Plus, X, Loader2, Star, Clock, ScanBarcode } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFoodSearch, FoodSearchResult } from '@/hooks/useFoodSearch';
import { useRecentFoods } from '@/hooks/useRecentFoods';
import { MealItem } from '@/types/customActivity';
import { cn } from '@/lib/utils';
import { BarcodeScanner } from './BarcodeScanner';

interface FoodSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFood: (item: MealItem) => void;
  onCreateCustom?: () => void;
}

export function FoodSearchDialog({
  open,
  onOpenChange,
  onSelectFood,
  onCreateCustom,
}: FoodSearchDialogProps) {
  const { results, loading, error, search, clearResults } = useFoodSearch();
  const { 
    recentFoods, 
    favoriteFoods, 
    loading: loadingHistory,
    trackFoodUsage,
    toggleFavorite,
    isFavorite,
  } = useRecentFoods();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [servings, setServings] = useState(1);
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    search(value);
    setSelectedFood(null);
  };

  const handleSelectFood = (food: FoodSearchResult) => {
    setSelectedFood(food);
    setServings(1);
  };

  const handleConfirmSelection = async () => {
    if (!selectedFood) return;

    // Track usage for database foods
    if (selectedFood.id) {
      await trackFoodUsage(selectedFood.id);
    }

    const mealItem: MealItem = {
      id: crypto.randomUUID(),
      name: selectedFood.brand 
        ? `${selectedFood.name} (${selectedFood.brand})`
        : selectedFood.name,
      quantity: servings,
      unit: selectedFood.servingSize || 'serving',
      calories: selectedFood.caloriesPerServing 
        ? Math.round(selectedFood.caloriesPerServing * servings)
        : undefined,
      protein: selectedFood.protein 
        ? Math.round(selectedFood.protein * servings)
        : undefined,
      carbs: selectedFood.carbs 
        ? Math.round(selectedFood.carbs * servings)
        : undefined,
      fats: selectedFood.fats 
        ? Math.round(selectedFood.fats * servings)
        : undefined,
    };

    onSelectFood(mealItem);
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedFood(null);
    setServings(1);
    clearResults();
    onOpenChange(false);
  };

  const handleCreateCustom = () => {
    handleClose();
    onCreateCustom?.();
  };

  const handleToggleFavorite = async (e: React.MouseEvent, foodId: string) => {
    e.stopPropagation();
    await toggleFavorite(foodId);
  };

  const handleBarcodeFound = (food: FoodSearchResult) => {
    setScannerOpen(false);
    setSelectedFood(food);
    setServings(1);
  };

  const showInitialView = searchQuery.length < 2 && !loading;
  const hasHistory = favoriteFoods.length > 0 || recentFoods.length > 0;

  const renderFoodItem = (food: FoodSearchResult, showFavoriteButton = true) => (
    <button
      key={food.id}
      onClick={() => handleSelectFood(food)}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-colors relative',
        selectedFood?.id === food.id
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">
            {food.name}
            {food.brand && (
              <span className="text-muted-foreground font-normal ml-1">
                ({food.brand})
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            <span>{food.caloriesPerServing || 0} cal</span>
            <span>•</span>
            <span>{food.protein || 0}g P</span>
            <span>•</span>
            <span>{food.carbs || 0}g C</span>
            <span>•</span>
            <span>{food.fats || 0}g F</span>
            {food.servingSize && (
              <>
                <span>•</span>
                <span className="text-foreground/70">{food.servingSize}</span>
              </>
            )}
          </div>
        </div>
        {showFavoriteButton && (
          <button
            onClick={(e) => handleToggleFavorite(e, food.id)}
            className={cn(
              'p-1.5 rounded-full transition-colors flex-shrink-0',
              isFavorite(food.id)
                ? 'text-amber-500 hover:bg-amber-500/10'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Star 
              className={cn('h-4 w-4', isFavorite(food.id) && 'fill-current')} 
            />
          </button>
        )}
      </div>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Foods
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Input with Barcode Button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search for a food..."
                className="pl-10 pr-10"
                autoFocus
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => handleSearchChange('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setScannerOpen(true)}
              title="Scan barcode"
            >
              <ScanBarcode className="h-4 w-4" />
            </Button>
          </div>

          {/* Barcode Scanner */}
          <BarcodeScanner
            open={scannerOpen}
            onOpenChange={setScannerOpen}
            onFoodFound={handleBarcodeFound}
          />

          {/* Results / Initial View */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && (
              <p className="text-center py-4 text-destructive text-sm">{error}</p>
            )}

            {/* Search Results */}
            {!loading && !error && results.length > 0 && (
              <div className="space-y-2">
                {results.map((food) => renderFoodItem(food))}
              </div>
            )}

            {/* No Results */}
            {!loading && !error && searchQuery.length >= 2 && results.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm mb-3">
                  No foods found for "{searchQuery}"
                </p>
                {onCreateCustom && (
                  <Button variant="outline" size="sm" onClick={handleCreateCustom}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Custom Food
                  </Button>
                )}
              </div>
            )}

            {/* Initial View: Favorites & Recent */}
            {showInitialView && (
              <div className="space-y-4">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : hasHistory ? (
                  <>
                    {/* Favorites Section */}
                    {favoriteFoods.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          <span>Favorites</span>
                        </div>
                        <div className="space-y-2">
                          {favoriteFoods.map((food) => renderFoodItem(food))}
                        </div>
                      </div>
                    )}

                    {/* Recently Used Section */}
                    {recentFoods.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Recently Used</span>
                        </div>
                        <div className="space-y-2">
                          {recentFoods.map((food) => renderFoodItem(food))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-center py-8 text-muted-foreground text-sm">
                    Type at least 2 characters to search
                  </p>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Selected Food - Quantity Adjustment */}
          {selectedFood && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{selectedFood.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedFood.servingSize || '1 serving'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Servings:</Label>
                  <Input
                    type="number"
                    value={servings}
                    onChange={(e) => setServings(Math.max(0.25, parseFloat(e.target.value) || 1))}
                    className="w-20 h-9"
                    step={0.25}
                    min={0.25}
                  />
                </div>
              </div>

              {/* Calculated Macros */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-lg font-semibold">
                    {Math.round((selectedFood.caloriesPerServing || 0) * servings)}
                  </p>
                  <p className="text-xs text-muted-foreground">Cal</p>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-lg font-semibold text-blue-500">
                    {Math.round((selectedFood.protein || 0) * servings)}g
                  </p>
                  <p className="text-xs text-muted-foreground">Protein</p>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-lg font-semibold text-amber-500">
                    {Math.round((selectedFood.carbs || 0) * servings)}g
                  </p>
                  <p className="text-xs text-muted-foreground">Carbs</p>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-lg font-semibold text-rose-500">
                    {Math.round((selectedFood.fats || 0) * servings)}g
                  </p>
                  <p className="text-xs text-muted-foreground">Fats</p>
                </div>
              </div>

              <Button onClick={handleConfirmSelection} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add to Meal
              </Button>
            </div>
          )}

          {/* Create Custom Option */}
          {!selectedFood && onCreateCustom && (
            <div className="border-t pt-3">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleCreateCustom}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Custom Food
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
