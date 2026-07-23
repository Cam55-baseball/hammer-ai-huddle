import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CategoryTipDetails {
  mechanism?: string;
  foodSources?: string[];
  safetyNote?: string;
  athleteRelevance?: string;
}

export interface CategoryTip {
  id: string;
  tip_text: string;
  category: string;
  is_ai_generated: boolean;
  sport: string | null;
  details: CategoryTipDetails | null;
}

export function useNutritionCategoryTips(category: string, sport: 'baseball' | 'softball' = 'baseball') {
  return useQuery<CategoryTip[]>({
    queryKey: ['nutrition-category-tips', category, sport],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_daily_tips')
        .select('id, tip_text, category, is_ai_generated, sport, details')
        .eq('category', category)
        .or(`sport.eq.both,sport.eq.${sport}`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CategoryTip[];
    },
    staleTime: 10 * 60 * 1000,
  });
}
