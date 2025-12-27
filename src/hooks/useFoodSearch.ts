import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FoodSearchResult {
  id: string;
  name: string;
  brand: string | null;
  servingSize: string | null;
  servingSizeGrams: number | null;
  caloriesPerServing: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
}

interface UseFoodSearchReturn {
  results: FoodSearchResult[];
  loading: boolean;
  error: string | null;
  search: (query: string) => void;
  clearResults: () => void;
}

export function useFoodSearch(debounceMs: number = 300): UseFoodSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data, error: searchError } = await supabase
          .from('nutrition_food_database')
          .select('*')
          .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
          .order('name')
          .limit(20);

        if (searchError) {
          setError(searchError.message);
          setResults([]);
        } else {
          setError(null);
          setResults(
            (data || []).map((item) => ({
              id: item.id,
              name: item.name,
              brand: item.brand,
              servingSize: item.serving_size,
              servingSizeGrams: item.serving_size_grams,
              caloriesPerServing: item.calories_per_serving,
              protein: item.protein_g,
              carbs: item.carbs_g,
              fats: item.fats_g,
              fiber: item.fiber_g,
              sugar: item.sugar_g,
              sodium: item.sodium_mg,
            }))
          );
        }
      } catch (err) {
        setError('Failed to search foods');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  const clearResults = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
  }, []);

  return { results, loading, error, search, clearResults };
}
