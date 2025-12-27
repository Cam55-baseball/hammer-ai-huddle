import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FoodSearchResult } from './useFoodSearch';

interface OpenFoodFactsProduct {
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: {
    'energy-kcal_serving'?: number;
    'energy-kcal_100g'?: number;
    proteins_serving?: number;
    proteins_100g?: number;
    carbohydrates_serving?: number;
    carbohydrates_100g?: number;
    fat_serving?: number;
    fat_100g?: number;
    fiber_serving?: number;
    fiber_100g?: number;
    sugars_serving?: number;
    sugars_100g?: number;
    sodium_serving?: number;
    sodium_100g?: number;
  };
  serving_quantity?: number;
}

interface UseBarcodeSearchReturn {
  searchByBarcode: (barcode: string) => Promise<FoodSearchResult | null>;
  loading: boolean;
  error: string | null;
  lastScannedBarcode: string | null;
}

export function useBarcodeSearch(): UseBarcodeSearchReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);

  const searchByBarcode = useCallback(async (barcode: string): Promise<FoodSearchResult | null> => {
    setLoading(true);
    setError(null);
    setLastScannedBarcode(barcode);

    try {
      // Step 1: Check local database first
      const { data: localFood, error: dbError } = await supabase
        .from('nutrition_food_database')
        .select('*')
        .eq('barcode', barcode)
        .maybeSingle();

      if (dbError) {
        console.error('Database lookup error:', dbError);
      }

      if (localFood) {
        return {
          id: localFood.id,
          name: localFood.name,
          brand: localFood.brand,
          servingSize: localFood.serving_size,
          servingSizeGrams: localFood.serving_size_grams,
          caloriesPerServing: localFood.calories_per_serving,
          protein: localFood.protein_g,
          carbs: localFood.carbs_g,
          fats: localFood.fats_g,
          fiber: localFood.fiber_g,
          sugar: localFood.sugar_g,
          sodium: localFood.sodium_mg,
        };
      }

      // Step 2: Fetch from Open Food Facts API
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch from Open Food Facts');
      }

      const data = await response.json();

      if (data.status !== 1 || !data.product) {
        setError('Product not found');
        return null;
      }

      const product: OpenFoodFactsProduct = data.product;
      const nutriments = product.nutriments || {};

      // Parse nutrition data - prefer per-serving, fallback to per-100g
      const servingGrams = product.serving_quantity || 100;
      const useServing = !!nutriments['energy-kcal_serving'];

      const calories = useServing 
        ? nutriments['energy-kcal_serving'] 
        : nutriments['energy-kcal_100g'];
      const protein = useServing 
        ? nutriments.proteins_serving 
        : nutriments.proteins_100g;
      const carbs = useServing 
        ? nutriments.carbohydrates_serving 
        : nutriments.carbohydrates_100g;
      const fats = useServing 
        ? nutriments.fat_serving 
        : nutriments.fat_100g;
      const fiber = useServing 
        ? nutriments.fiber_serving 
        : nutriments.fiber_100g;
      const sugar = useServing 
        ? nutriments.sugars_serving 
        : nutriments.sugars_100g;
      const sodium = useServing 
        ? nutriments.sodium_serving 
        : nutriments.sodium_100g;

      // Step 3: Save to local database for future lookups
      const { data: savedFood, error: insertError } = await supabase
        .from('nutrition_food_database')
        .insert({
          name: product.product_name || 'Unknown Product',
          brand: product.brands || null,
          barcode: barcode,
          serving_size: product.serving_size || (useServing ? `${servingGrams}g` : '100g'),
          serving_size_grams: servingGrams,
          calories_per_serving: calories ? Math.round(calories) : null,
          protein_g: protein ? Math.round(protein * 10) / 10 : null,
          carbs_g: carbs ? Math.round(carbs * 10) / 10 : null,
          fats_g: fats ? Math.round(fats * 10) / 10 : null,
          fiber_g: fiber ? Math.round(fiber * 10) / 10 : null,
          sugar_g: sugar ? Math.round(sugar * 10) / 10 : null,
          sodium_mg: sodium ? Math.round(sodium * 1000) : null,
          source: 'openfoodfacts',
          external_id: barcode,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to save food to database:', insertError);
        // Still return the result even if save fails
      }

      return {
        id: savedFood?.id || crypto.randomUUID(),
        name: product.product_name || 'Unknown Product',
        brand: product.brands || null,
        servingSize: product.serving_size || (useServing ? `${servingGrams}g` : '100g'),
        servingSizeGrams: servingGrams,
        caloriesPerServing: calories ? Math.round(calories) : null,
        protein: protein ? Math.round(protein * 10) / 10 : null,
        carbs: carbs ? Math.round(carbs * 10) / 10 : null,
        fats: fats ? Math.round(fats * 10) / 10 : null,
        fiber: fiber ? Math.round(fiber * 10) / 10 : null,
        sugar: sugar ? Math.round(sugar * 10) / 10 : null,
        sodium: sodium ? Math.round(sodium * 1000) : null,
      };
    } catch (err) {
      console.error('Barcode search error:', err);
      setError(err instanceof Error ? err.message : 'Failed to search barcode');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { searchByBarcode, loading, error, lastScannedBarcode };
}
