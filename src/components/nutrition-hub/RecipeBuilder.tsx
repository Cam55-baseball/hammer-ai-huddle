import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Plus, Trash2, Star, Clock, Users, X } from 'lucide-react';
import { useRecipes, RecipeIngredient, Recipe, CreateRecipeInput } from '@/hooks/useRecipes';
import { FoodSearchDialog } from './FoodSearchDialog';
import { MealItem } from '@/types/customActivity';

interface RecipeBuilderProps {
  onRecipeSelect?: (ingredients: RecipeIngredient[], servings: number) => void;
}

export function RecipeBuilder({ onRecipeSelect }: RecipeBuilderProps) {
  const { recipes, loading, createRecipe, deleteRecipe, toggleFavorite, useRecipe, scaleRecipe } = useRecipes();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [selectedServings, setSelectedServings] = useState<Record<string, number>>({});

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState(1);
  const [prepTime, setPrepTime] = useState<number | undefined>();
  const [cookTime, setCookTime] = useState<number | undefined>();
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setServings(1);
    setPrepTime(undefined);
    setCookTime(undefined);
    setIngredients([]);
    setIsCreating(false);
  };

  const handleAddIngredient = (food: MealItem) => {
    const newIngredient: RecipeIngredient = {
      food_id: food.id,
      name: food.name,
      quantity: food.quantity || 1,
      unit: food.unit || 'serving',
      calories: food.calories || 0,
      protein_g: food.protein || 0,
      carbs_g: food.carbs || 0,
      fats_g: food.fats || 0,
      fiber_g: undefined,
    };
    setIngredients([...ingredients, newIngredient]);
    setShowFoodSearch(false);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    const original = ingredients[index];
    const scaleFactor = quantity / original.quantity;
    
    setIngredients(ingredients.map((ing, i) => 
      i === index
        ? {
            ...ing,
            quantity,
            calories: Math.round((original.calories / original.quantity) * quantity),
            protein_g: Math.round((original.protein_g / original.quantity) * quantity * 10) / 10,
            carbs_g: Math.round((original.carbs_g / original.quantity) * quantity * 10) / 10,
            fats_g: Math.round((original.fats_g / original.quantity) * quantity * 10) / 10,
            fiber_g: original.fiber_g 
              ? Math.round((original.fiber_g / original.quantity) * quantity * 10) / 10 
              : undefined,
          }
        : ing
    ));
  };

  const handleSaveRecipe = async () => {
    if (!name.trim() || ingredients.length === 0) return;

    const input: CreateRecipeInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      servings,
      prep_time_minutes: prepTime,
      cook_time_minutes: cookTime,
      ingredients,
    };

    const result = await createRecipe(input);
    if (result) {
      resetForm();
    }
  };

  const handleUseRecipe = async (recipe: Recipe) => {
    const servingsToUse = selectedServings[recipe.id] || recipe.servings;
    const scaledIngredients = scaleRecipe(recipe, servingsToUse);
    
    await useRecipe(recipe.id);
    
    if (onRecipeSelect) {
      onRecipeSelect(scaledIngredients, servingsToUse);
      setIsOpen(false);
    }
  };

  const totals = ingredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + ing.calories,
      protein: acc.protein + ing.protein_g,
      carbs: acc.carbs + ing.carbs_g,
      fats: acc.fats + ing.fats_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const favoriteRecipes = recipes.filter((r) => r.is_favorite);
  const recentRecipes = recipes.filter((r) => !r.is_favorite).slice(0, 5);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <ChefHat className="h-4 w-4" />
            Recipes
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              {isCreating ? 'Create Recipe' : 'My Recipes'}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(85vh-120px)]">
            {isCreating ? (
              <div className="space-y-4 pr-4">
                <div className="space-y-2">
                  <Label htmlFor="recipe-name">Recipe Name *</Label>
                  <Input
                    id="recipe-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Protein Power Bowl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipe-description">Description</Label>
                  <Textarea
                    id="recipe-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="servings">Servings *</Label>
                    <Input
                      id="servings"
                      type="number"
                      min={1}
                      value={servings}
                      onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prep-time">Prep (min)</Label>
                    <Input
                      id="prep-time"
                      type="number"
                      min={0}
                      value={prepTime || ''}
                      onChange={(e) => setPrepTime(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cook-time">Cook (min)</Label>
                    <Input
                      id="cook-time"
                      type="number"
                      min={0}
                      value={cookTime || ''}
                      onChange={(e) => setCookTime(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Ingredients ({ingredients.length})</Label>
                    <Button size="sm" variant="outline" onClick={() => setShowFoodSearch(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  {ingredients.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No ingredients added yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {ingredients.map((ing, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{ing.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {ing.calories} cal | P: {ing.protein_g}g | C: {ing.carbs_g}g | F: {ing.fats_g}g
                            </p>
                          </div>
                          <Input
                            type="number"
                            min={0.1}
                            step={0.1}
                            value={ing.quantity}
                            onChange={(e) => handleUpdateQuantity(index, parseFloat(e.target.value) || 1)}
                            className="w-20 h-8"
                          />
                          <span className="text-xs text-muted-foreground w-16">{ing.unit}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemoveIngredient(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {ingredients.length > 0 && (
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-sm font-medium mb-2">Recipe Totals (for {servings} serving{servings > 1 ? 's' : ''})</p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold text-primary">{Math.round(totals.calories)}</p>
                          <p className="text-xs text-muted-foreground">Calories</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-blue-500">{totals.protein.toFixed(1)}g</p>
                          <p className="text-xs text-muted-foreground">Protein</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-amber-500">{totals.carbs.toFixed(1)}g</p>
                          <p className="text-xs text-muted-foreground">Carbs</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-red-500">{totals.fats.toFixed(1)}g</p>
                          <p className="text-xs text-muted-foreground">Fats</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSaveRecipe}
                    disabled={!name.trim() || ingredients.length === 0}
                  >
                    Save Recipe
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pr-4">
                <Button onClick={() => setIsCreating(true)} className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Create New Recipe
                </Button>

                {loading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Loading recipes...</p>
                ) : recipes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No recipes yet. Create your first one!
                  </p>
                ) : (
                  <>
                    {favoriteRecipes.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          Favorites
                        </h4>
                        {favoriteRecipes.map((recipe) => (
                          <RecipeCard
                            key={recipe.id}
                            recipe={recipe}
                            selectedServings={selectedServings[recipe.id]}
                            onServingsChange={(s) => setSelectedServings({ ...selectedServings, [recipe.id]: s })}
                            onUse={() => handleUseRecipe(recipe)}
                            onToggleFavorite={() => toggleFavorite(recipe.id)}
                            onDelete={() => deleteRecipe(recipe.id)}
                          />
                        ))}
                      </div>
                    )}

                    {recentRecipes.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Recent Recipes</h4>
                        {recentRecipes.map((recipe) => (
                          <RecipeCard
                            key={recipe.id}
                            recipe={recipe}
                            selectedServings={selectedServings[recipe.id]}
                            onServingsChange={(s) => setSelectedServings({ ...selectedServings, [recipe.id]: s })}
                            onUse={() => handleUseRecipe(recipe)}
                            onToggleFavorite={() => toggleFavorite(recipe.id)}
                            onDelete={() => deleteRecipe(recipe.id)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <FoodSearchDialog
        open={showFoodSearch}
        onOpenChange={setShowFoodSearch}
        onSelectFood={handleAddIngredient}
      />
    </>
  );
}

interface RecipeCardProps {
  recipe: Recipe;
  selectedServings?: number;
  onServingsChange: (servings: number) => void;
  onUse: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}

function RecipeCard({
  recipe,
  selectedServings,
  onServingsChange,
  onUse,
  onToggleFavorite,
  onDelete,
}: RecipeCardProps) {
  const servings = selectedServings || recipe.servings;
  const scaleFactor = servings / recipe.servings;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h5 className="font-medium truncate">{recipe.name}</h5>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 shrink-0"
                onClick={onToggleFavorite}
              >
                <Star
                  className={`h-4 w-4 ${
                    recipe.is_favorite ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
                  }`}
                />
              </Button>
            </div>
            {recipe.description && (
              <p className="text-xs text-muted-foreground truncate">{recipe.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {recipe.servings} serving{recipe.servings > 1 ? 's' : ''}
              </span>
              {(recipe.prep_time_minutes || recipe.cook_time_minutes) && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} min
                </span>
              )}
              <span>{recipe.ingredients.length} ingredients</span>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-destructive shrink-0"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center mt-2 py-2 bg-muted/50 rounded">
          <div>
            <p className="text-sm font-semibold">{Math.round((recipe.total_calories || 0) * scaleFactor)}</p>
            <p className="text-xs text-muted-foreground">cal</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-500">
              {((recipe.total_protein_g || 0) * scaleFactor).toFixed(1)}g
            </p>
            <p className="text-xs text-muted-foreground">protein</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-500">
              {((recipe.total_carbs_g || 0) * scaleFactor).toFixed(1)}g
            </p>
            <p className="text-xs text-muted-foreground">carbs</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-red-500">
              {((recipe.total_fats_g || 0) * scaleFactor).toFixed(1)}g
            </p>
            <p className="text-xs text-muted-foreground">fats</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1">
            <Label htmlFor={`servings-${recipe.id}`} className="text-xs">
              Servings:
            </Label>
            <Input
              id={`servings-${recipe.id}`}
              type="number"
              min={1}
              value={servings}
              onChange={(e) => onServingsChange(parseInt(e.target.value) || 1)}
              className="w-16 h-7 text-sm"
            />
          </div>
          <Button size="sm" className="flex-1 h-7" onClick={onUse}>
            Use Recipe
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
