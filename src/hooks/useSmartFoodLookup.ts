import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const MICRO_KEYS = [
  "vitamin_a_mcg", "vitamin_c_mg", "vitamin_d_mcg", "vitamin_e_mg",
  "vitamin_k_mcg", "vitamin_b6_mg", "vitamin_b12_mcg", "folate_mcg",
  "calcium_mg", "iron_mg", "magnesium_mg", "potassium_mg", "zinc_mg",
] as const;

export interface FoodItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  confidence?: 'high' | 'medium' | 'low';
  micros?: Record<string, number>;
}

export interface SmartFoodResult {
  foods: FoodItem[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
    hydration_oz: number;
    micros?: Record<string, number>;
  };
  source: 'database' | 'ai';
  confidenceSummary?: 'high' | 'medium' | 'low';
  mealDescription?: string;
  suggestedMealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'hydration';
}

export type SmartFoodStatus = 'idle' | 'searching_db' | 'calling_ai' | 'ready' | 'error';

interface UseSmartFoodLookupReturn {
  status: SmartFoodStatus;
  result: SmartFoodResult | null;
  error: string | null;
  trigger: (text: string) => void;
  clear: () => void;
}

const DB_MATCH_THRESHOLD = 0.6;
const DEBOUNCE_MS = 800;
const resultCache = new Map<string, SmartFoodResult>();

function sanitizeForDbQuery(input: string): string {
  return input.replace(/[%,*()'"]/g, ' ').replace(/\s+/g, ' ').trim();
}

function calculateSimilarity(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (t === q) return 1.0;
  if (t.startsWith(q) || q.startsWith(t)) return 0.85;
  const qTokens = new Set(q.split(/\s+/));
  const tTokens = new Set(t.split(/\s+/));
  const intersection = [...qTokens].filter(x => tTokens.has(x)).length;
  const union = new Set([...qTokens, ...tTokens]).size;
  return union > 0 ? intersection / union : 0;
}

/** Extract micronutrients from a DB row into a clean object */
function extractMicrosFromDbRow(row: any): Record<string, number> | undefined {
  const micros: Record<string, number> = {};
  let hasData = false;
  for (const key of MICRO_KEYS) {
    const val = row[key];
    if (typeof val === 'number' && val > 0) {
      micros[key] = val;
      hasData = true;
    } else {
      micros[key] = 0;
    }
  }
  return hasData ? micros : undefined;
}

/** Try to find a food in the DB by name and return its micros */
async function lookupMicrosFromDb(foodName: string): Promise<Record<string, number> | undefined> {
  const sanitized = sanitizeForDbQuery(foodName);
  if (!sanitized) return undefined;

  const { data } = await supabase
    .from('nutrition_food_database')
    .select('*')
    .ilike('name', `%${sanitized}%`)
    .limit(5);

  if (!data || data.length === 0) return undefined;

  // Find best match
  let bestMatch: any = null;
  let bestScore = 0;
  for (const item of data) {
    const score = calculateSimilarity(foodName, item.name);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  if (bestMatch && bestScore >= 0.4) {
    return extractMicrosFromDbRow(bestMatch);
  }
  return undefined;
}

export function useSmartFoodLookup(): UseSmartFoodLookupReturn {
  const [status, setStatus] = useState<SmartFoodStatus>('idle');
  const [result, setResult] = useState<SmartFoodResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  const trigger = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = text.trim();
    if (trimmed.length < 3) {
      clear();
      return;
    }

    const cacheKey = trimmed.toLowerCase();
    if (resultCache.has(cacheKey)) {
      setResult(resultCache.get(cacheKey)!);
      setStatus('ready');
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      abortRef.current = new AbortController();
      setError(null);

      try {
        // Phase 1: Search local database
        setStatus('searching_db');
        const sanitized = sanitizeForDbQuery(trimmed);

        const { data: dbResults, error: dbError } = await supabase
          .from('nutrition_food_database')
          .select('*')
          .or(`name.ilike.%${sanitized}%,brand.ilike.%${sanitized}%`)
          .limit(10);

        if (dbError) {
          console.warn('[useSmartFoodLookup] DB search error:', dbError);
        }

        let bestMatch: any = null;
        let bestScore = 0;

        if (dbResults && dbResults.length > 0) {
          for (const item of dbResults) {
            const nameScore = calculateSimilarity(trimmed, item.name);
            const brandScore = item.brand ? calculateSimilarity(trimmed, item.brand) : 0;
            const combinedScore = item.brand
              ? calculateSimilarity(trimmed, `${item.brand} ${item.name}`)
              : nameScore;
            const score = Math.max(nameScore, brandScore, combinedScore);
            if (score > bestScore) {
              bestScore = score;
              bestMatch = item;
            }
          }
        }

        // If good DB match, use it with micros from DB
        if (bestMatch && bestScore >= DB_MATCH_THRESHOLD) {
          const dbMicros = extractMicrosFromDbRow(bestMatch);

          const dbResult: SmartFoodResult = {
            foods: [{
              name: bestMatch.name,
              quantity: 1,
              unit: bestMatch.serving_size || 'serving',
              calories: bestMatch.calories_per_serving || 0,
              protein_g: bestMatch.protein_g || 0,
              carbs_g: bestMatch.carbs_g || 0,
              fats_g: bestMatch.fats_g || 0,
              confidence: 'high',
              micros: dbMicros,
            }],
            totals: {
              calories: bestMatch.calories_per_serving || 0,
              protein_g: bestMatch.protein_g || 0,
              carbs_g: bestMatch.carbs_g || 0,
              fats_g: bestMatch.fats_g || 0,
              hydration_oz: 0,
              micros: dbMicros,
            },
            source: 'database',
            confidenceSummary: 'high',
          };

          resultCache.set(cacheKey, dbResult);
          setResult(dbResult);
          setStatus('ready');
          return;
        }

        // Phase 2: Call AI
        setStatus('calling_ai');

        const { data, error: fnError } = await supabase.functions.invoke('parse-food-text', {
          body: { text: trimmed },
        });

        if (fnError) {
          console.error('[useSmartFoodLookup] AI function error:', fnError);
          const errorMessage = fnError.message || '';
          if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
            setError('Rate limit reached. Try again in a moment.');
          } else if (errorMessage.includes('402') || errorMessage.includes('credits')) {
            setError('Hammer credits required.');
          } else if (errorMessage.includes('404') || errorMessage.includes('NOT_FOUND')) {
            setError('Auto-fill temporarily unavailable.');
          } else {
            setError('Could not recognize food. Enter manually.');
          }
          setStatus('error');
          return;
        }

        if (data?.error) {
          setError(data.error);
          setStatus('error');
          return;
        }

        // DB-first micro enrichment: for each AI food item, try DB lookup for micros
        if (data.foods && data.foods.length > 0) {
          for (const food of data.foods) {
            const dbMicros = await lookupMicrosFromDb(food.name);
            if (dbMicros) {
              food.micros = dbMicros;
              food.confidence = 'high';
            }
          }

          // Re-aggregate totals micros from enriched per-food micros
          const aggregatedMicros: Record<string, number> = {};
          let hasMicros = false;
          for (const food of data.foods) {
            if (food.micros && typeof food.micros === 'object') {
              for (const [key, val] of Object.entries(food.micros)) {
                if (typeof val === 'number' && val > 0) {
                  aggregatedMicros[key] = (aggregatedMicros[key] || 0) + val;
                  hasMicros = true;
                }
              }
            }
          }
          if (hasMicros) {
            data.totals = { ...data.totals, micros: aggregatedMicros };
          }
        }

        // Dynamic DB expansion: insert new foods with valid micros into nutrition_food_database
        if (data.foods && data.foods.length > 0) {
          for (const food of data.foods) {
            if (food.micros && typeof food.micros === 'object' && Object.keys(food.micros).length >= 13) {
              // Check if this food already exists
              const { data: existing } = await supabase
                .from('nutrition_food_database')
                .select('id')
                .ilike('name', food.name)
                .limit(1);

              if (!existing || existing.length === 0) {
                await supabase.from('nutrition_food_database').insert({
                  name: food.name,
                  calories_per_serving: food.calories,
                  protein_g: food.protein_g,
                  carbs_g: food.carbs_g,
                  fats_g: food.fats_g,
                  serving_size: `${food.quantity} ${food.unit}`,
                  source: 'ai_expanded',
                  ...food.micros,
                } as any);
              }
            }
          }
        }

        // Determine overall confidence
        let confidenceSummary: 'high' | 'medium' | 'low' = 'medium';
        if (data.foods && data.foods.length > 0) {
          const confidences = data.foods.map((f: FoodItem) => f.confidence || 'medium');
          if (confidences.every((c: string) => c === 'high')) {
            confidenceSummary = 'high';
          } else if (confidences.some((c: string) => c === 'low')) {
            confidenceSummary = 'low';
          }
        }

        const aiResult: SmartFoodResult = {
          foods: data.foods || [],
          totals: data.totals || { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0, hydration_oz: 0 },
          source: 'ai',
          confidenceSummary,
          mealDescription: data.mealDescription,
          suggestedMealType: data.suggested_meal_type,
        };

        resultCache.set(cacheKey, aiResult);
        setResult(aiResult);
        setStatus('ready');
      } catch (err) {
        console.error('[useSmartFoodLookup] Unexpected error:', err);
        setError('Something went wrong. Please enter manually.');
        setStatus('error');
      }
    }, DEBOUNCE_MS);
  }, [clear]);

  return { status, result, error, trigger, clear };
}
