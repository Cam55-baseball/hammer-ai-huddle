import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FoodItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  confidence?: 'high' | 'medium' | 'low';
}

export interface SmartFoodResult {
  foods: FoodItem[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
    hydration_oz: number;
  };
  source: 'database' | 'ai';
  confidenceSummary?: 'high' | 'medium' | 'low';
  mealDescription?: string;
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

    // Check cache first
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
        
        const { data: dbResults, error: dbError } = await supabase
          .from('nutrition_food_database')
          .select('*')
          .or(`name.ilike.%${trimmed}%,brand.ilike.%${trimmed}%`)
          .limit(10);

        if (dbError) {
          console.warn('[useSmartFoodLookup] DB search error:', dbError);
        }

        // Find best match
        let bestMatch: typeof dbResults extends (infer T)[] ? T : never | null = null;
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

        // If good DB match, use it
        if (bestMatch && bestScore >= DB_MATCH_THRESHOLD) {
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
            }],
            totals: {
              calories: bestMatch.calories_per_serving || 0,
              protein_g: bestMatch.protein_g || 0,
              carbs_g: bestMatch.carbs_g || 0,
              fats_g: bestMatch.fats_g || 0,
              hydration_oz: 0,
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
          
          // Handle specific error codes
          const errorMessage = fnError.message || '';
          if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
            setError('Rate limit reached. Try again in a moment.');
          } else if (errorMessage.includes('402') || errorMessage.includes('credits')) {
            setError('AI credits required.');
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
