import { useCallback } from 'react';
import { useHydration } from '@/hooks/useHydration';

/**
 * Meal surfaces store fluid on `vault_nutrition_logs.hydration_oz`, but the
 * ounces counter on the hub reads `hydration_logs`. Anything logged as fluid
 * from a meal surface has to land in both, or the counter never moves.
 */
export function useMealHydrationBridge() {
  const { addWater } = useHydration();

  const logMealHydration = useCallback(
    async (oz: number | null | undefined, liquidType: string = 'water') => {
      const amount = Number(oz);
      if (!Number.isFinite(amount) || amount <= 0) return false;
      return addWater(amount, liquidType, 'quality');
    },
    [addWater],
  );

  return { logMealHydration };
}
