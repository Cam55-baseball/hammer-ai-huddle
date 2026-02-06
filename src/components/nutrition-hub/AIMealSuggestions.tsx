import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, Plus, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface MacroGaps {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface MealSuggestion {
  name: string;
  description: string;
  reason: string;
  estimatedMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  priority: 'high' | 'medium' | 'low';
}

interface AIMealSuggestionsProps {
  consumed: MacroGaps;
  targets: MacroGaps;
  onAddFood?: (food: { name: string; calories: number; protein: number; carbs: number; fats: number }) => void;
}

export function AIMealSuggestions({ consumed, targets, onAddFood }: AIMealSuggestionsProps) {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [macroAnalysis, setMacroAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasConsumedFood, setHasConsumedFood] = useState(false);

  const remainingMacros = {
    calories: Math.max(0, targets.calories - consumed.calories),
    protein: Math.max(0, targets.protein - consumed.protein),
    carbs: Math.max(0, targets.carbs - consumed.carbs),
    fats: Math.max(0, targets.fats - consumed.fats),
  };

  useEffect(() => {
    // Check if user has logged any food today
    setHasConsumedFood(consumed.calories > 0);
  }, [consumed.calories]);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('suggest-meals', {
        body: { remainingMacros }
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data?.suggestions) {
        setSuggestions(data.suggestions);
        setMacroAnalysis(data.macroAnalysis || '');
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to get suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuggestion = (suggestion: MealSuggestion) => {
    onAddFood?.({
      name: suggestion.name,
      calories: suggestion.estimatedMacros.calories,
      protein: suggestion.estimatedMacros.protein,
      carbs: suggestion.estimatedMacros.carbs,
      fats: suggestion.estimatedMacros.fats,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getMacroStatus = (current: number, target: number) => {
    const percentage = (current / target) * 100;
    if (percentage >= 100) return 'complete';
    if (percentage >= 75) return 'good';
    if (percentage >= 50) return 'moderate';
    return 'low';
  };

  if (!hasConsumedFood) {
    return null; // Don't show until user logs first meal
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            {t('nutrition.aiSuggestions.title', 'Hammer Meal Suggestions')}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSuggestions}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            {loading ? t('common.loading', 'Loading...') : t('nutrition.aiSuggestions.refresh', 'Refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Macro gaps summary */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          {[
            { label: t('nutrition.calories', 'Calories'), remaining: remainingMacros.calories, unit: 'kcal', current: consumed.calories, target: targets.calories },
            { label: t('nutrition.protein', 'Protein'), remaining: remainingMacros.protein, unit: 'g', current: consumed.protein, target: targets.protein },
            { label: t('nutrition.carbs', 'Carbs'), remaining: remainingMacros.carbs, unit: 'g', current: consumed.carbs, target: targets.carbs },
            { label: t('nutrition.fats', 'Fats'), remaining: remainingMacros.fats, unit: 'g', current: consumed.fats, target: targets.fats },
          ].map((macro) => {
            const status = getMacroStatus(macro.current, macro.target);
            return (
              <div key={macro.label} className="text-center p-2 rounded bg-muted/50">
                <div className="text-muted-foreground">{macro.label}</div>
                <div className={cn(
                  "font-medium",
                  status === 'complete' && "text-green-600",
                  status === 'good' && "text-green-500",
                  status === 'moderate' && "text-yellow-600",
                  status === 'low' && "text-orange-500"
                )}>
                  {macro.remaining > 0 ? (
                    <span className="flex items-center justify-center gap-0.5">
                      <TrendingDown className="h-3 w-3" />
                      {macro.remaining}{macro.unit}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-0.5">
                      <TrendingUp className="h-3 w-3" />
                      {t('nutrition.aiSuggestions.met', 'Met!')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {!suggestions.length && !loading && !error && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">
              {t('nutrition.aiSuggestions.clickToGet', 'Click refresh to get Hammer-powered meal suggestions based on your remaining macros')}
            </p>
            <Button onClick={fetchSuggestions} size="sm">
              <Sparkles className="h-4 w-4 mr-2" />
              {t('nutrition.aiSuggestions.getSuggestions', 'Get Suggestions')}
            </Button>
          </div>
        )}

        {macroAnalysis && (
          <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
            {macroAnalysis}
          </p>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{suggestion.name}</span>
                    <Badge variant="outline" className={cn("text-xs", getPriorityColor(suggestion.priority))}>
                      {suggestion.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{suggestion.description}</p>
                  <p className="text-xs text-primary/80 italic">{suggestion.reason}</p>
                  <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                    <span>{suggestion.estimatedMacros.calories} kcal</span>
                    <span>•</span>
                    <span>{suggestion.estimatedMacros.protein}g P</span>
                    <span>•</span>
                    <span>{suggestion.estimatedMacros.carbs}g C</span>
                    <span>•</span>
                    <span>{suggestion.estimatedMacros.fats}g F</span>
                  </div>
                </div>
                {onAddFood && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => handleAddSuggestion(suggestion)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
