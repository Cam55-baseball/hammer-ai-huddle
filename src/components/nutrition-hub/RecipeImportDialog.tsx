import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, Loader2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ParsedRecipe {
  name: string;
  description?: string;
  servings: number;
  prepTime?: number;
  cookTime?: number;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
  instructions?: string[];
  estimatedNutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
  };
}

interface RecipeImportDialogProps {
  onImport: (recipe: ParsedRecipe) => void;
  trigger?: React.ReactNode;
}

export function RecipeImportDialog({ onImport, trigger }: RecipeImportDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedRecipe, setParsedRecipe] = useState<ParsedRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!url.trim()) return;
    
    setLoading(true);
    setError(null);
    setParsedRecipe(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('parse-recipe-url', {
        body: { url: url.trim() }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to parse recipe');
      }

      if (response.data?.recipe) {
        setParsedRecipe(response.data.recipe);
      } else {
        throw new Error('No recipe data returned');
      }
    } catch (err) {
      console.error('Recipe parse error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse recipe');
      toast.error(t('nutrition.recipes.importFailed', 'Failed to import recipe'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedRecipe) {
      onImport(parsedRecipe);
      setOpen(false);
      setUrl('');
      setParsedRecipe(null);
      toast.success(t('nutrition.recipes.importSuccess', 'Recipe imported successfully'));
    }
  };

  const handleClose = () => {
    setOpen(false);
    setUrl('');
    setParsedRecipe(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Link className="h-4 w-4 mr-2" />
            {t('nutrition.recipes.importFromUrl', 'Import from URL')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5 text-primary" />
            {t('nutrition.recipes.importRecipe', 'Import Recipe from URL')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipe-url">{t('nutrition.recipes.recipeUrl', 'Recipe URL')}</Label>
            <div className="flex gap-2">
              <Input
                id="recipe-url"
                type="url"
                placeholder="https://example.com/recipe/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
              />
              <Button onClick={handleParse} disabled={loading || !url.trim()}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('nutrition.recipes.parse', 'Parse')
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('nutrition.recipes.supportedSites', 'Works with most recipe websites (AllRecipes, Food Network, Bon Appétit, etc.)')}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {parsedRecipe && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
              <div>
                <h3 className="font-semibold text-lg">{parsedRecipe.name}</h3>
                {parsedRecipe.description && (
                  <p className="text-sm text-muted-foreground mt-1">{parsedRecipe.description}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center p-2 bg-background rounded">
                  <div className="font-medium">{parsedRecipe.servings}</div>
                  <div className="text-xs text-muted-foreground">{t('nutrition.recipes.servings', 'Servings')}</div>
                </div>
                {parsedRecipe.prepTime && (
                  <div className="text-center p-2 bg-background rounded">
                    <div className="font-medium">{parsedRecipe.prepTime}m</div>
                    <div className="text-xs text-muted-foreground">{t('nutrition.recipes.prep', 'Prep')}</div>
                  </div>
                )}
                {parsedRecipe.cookTime && (
                  <div className="text-center p-2 bg-background rounded">
                    <div className="font-medium">{parsedRecipe.cookTime}m</div>
                    <div className="text-xs text-muted-foreground">{t('nutrition.recipes.cook', 'Cook')}</div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">
                  {t('nutrition.recipes.ingredients', 'Ingredients')} ({parsedRecipe.ingredients.length})
                </h4>
                <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                  {parsedRecipe.ingredients.slice(0, 8).map((ing, i) => (
                    <li key={i} className="text-muted-foreground">
                      • {ing.quantity} {ing.unit} {ing.name}
                      {ing.notes && <span className="text-xs"> ({ing.notes})</span>}
                    </li>
                  ))}
                  {parsedRecipe.ingredients.length > 8 && (
                    <li className="text-xs text-muted-foreground">
                      +{parsedRecipe.ingredients.length - 8} more...
                    </li>
                  )}
                </ul>
              </div>

              {parsedRecipe.estimatedNutrition && (
                <div>
                  <h4 className="font-medium text-sm mb-2">
                    {t('nutrition.recipes.estimatedNutrition', 'Estimated Nutrition (per serving)')}
                  </h4>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center p-1.5 bg-background rounded">
                      <div className="font-medium">{parsedRecipe.estimatedNutrition.calories}</div>
                      <div className="text-muted-foreground">kcal</div>
                    </div>
                    <div className="text-center p-1.5 bg-background rounded">
                      <div className="font-medium">{parsedRecipe.estimatedNutrition.protein}g</div>
                      <div className="text-muted-foreground">protein</div>
                    </div>
                    <div className="text-center p-1.5 bg-background rounded">
                      <div className="font-medium">{parsedRecipe.estimatedNutrition.carbs}g</div>
                      <div className="text-muted-foreground">carbs</div>
                    </div>
                    <div className="text-center p-1.5 bg-background rounded">
                      <div className="font-medium">{parsedRecipe.estimatedNutrition.fats}g</div>
                      <div className="text-muted-foreground">fats</div>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={handleConfirmImport} className="w-full">
                <Check className="h-4 w-4 mr-2" />
                {t('nutrition.recipes.addToRecipes', 'Add to My Recipes')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
