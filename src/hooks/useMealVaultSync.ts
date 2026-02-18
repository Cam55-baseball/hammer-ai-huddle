import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHydration } from '@/hooks/useHydration';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MealData, Vitamin, Supplement } from '@/types/customActivity';

interface MealVaultSyncOptions {
  syncToVault?: boolean;
  mealType?: string;
  mealTitle?: string;
  mealTime?: string;
  digestionNotes?: string;
}

/**
 * Hook to sync MealBuilder data to the vault and hydration systems
 * This bridges the custom activities meal tracking with the centralized nutrition vault
 */
export function useMealVaultSync() {
  const { user } = useAuth();
  const { addWater } = useHydration();
  const queryClient = useQueryClient();

  /**
   * Sync hydration entries from MealBuilder to hydration_logs table
   */
  const syncHydration = useCallback(async (hydrationData: MealData['hydration']) => {
    if (!user || !hydrationData) return { success: true };

    try {
      // Convert unit to oz for storage
      const convertToOz = (amount: number, unit: string): number => {
        switch (unit) {
          case 'ml': return amount * 0.033814;
          case 'cups': return amount * 8;
          case 'liters': return amount * 33.814;
          default: return amount; // oz
        }
      };

      // If there are individual entries, sync those
      if (hydrationData.entries && hydrationData.entries.length > 0) {
        for (const entry of hydrationData.entries) {
          const amountOz = convertToOz(entry.amount, hydrationData.unit);
          await addWater(amountOz);
        }
      } else if (hydrationData.amount > 0) {
        // Otherwise sync the total amount
        const amountOz = convertToOz(hydrationData.amount, hydrationData.unit);
        await addWater(amountOz);
      }

      return { success: true };
    } catch (error) {
      console.error('Error syncing hydration:', error);
      return { success: false, error: 'Failed to sync hydration' };
    }
  }, [user, addWater]);

  /**
   * Sync vitamins from MealBuilder to vault_vitamin_logs
   */
  const syncVitamins = useCallback(async (vitamins: Vitamin[]) => {
    if (!user || vitamins.length === 0) return { success: true };

    const today = format(new Date(), 'yyyy-MM-dd');

    try {
      // Map timing values to database format
      const mapTiming = (timing?: string): string => {
        switch (timing) {
          case 'morning': return 'morning';
          case 'afternoon': return 'afternoon';
          case 'evening': return 'evening';
          case 'with_meal': return 'with_meal';
          default: return 'morning';
        }
      };

      const vitaminInserts = vitamins.map(v => ({
        user_id: user.id,
        log_date: today,
        vitamin_name: v.name,
        dosage: v.dosage || null,
        timing: mapTiming(v.timing),
        taken: true,
        is_recurring: false,
      }));

      const { error } = await supabase
        .from('vault_vitamin_logs')
        .insert(vitaminInserts);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error syncing vitamins:', error);
      return { success: false, error: 'Failed to sync vitamins' };
    }
  }, [user]);

  /**
   * Sync meal data to vault_nutrition_logs
   */
  const syncMealToVault = useCallback(async (
    meals: MealData,
    options: MealVaultSyncOptions = {}
  ) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const { syncToVault = true, mealType, mealTitle, mealTime, digestionNotes } = options;
    
    if (!syncToVault) return { success: true };

    const today = format(new Date(), 'yyyy-MM-dd');

    try {
      // Calculate totals from meal items
      const totals = meals.items.reduce((acc, item) => ({
        calories: acc.calories + (item.calories || 0),
        protein: acc.protein + (item.protein || 0),
        carbs: acc.carbs + (item.carbs || 0),
        fats: acc.fats + (item.fats || 0),
      }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

      // Calculate hydration in oz
      let hydrationOz = 0;
      if (meals.hydration) {
        const convertToOz = (amount: number, unit: string): number => {
          switch (unit) {
            case 'ml': return amount * 0.033814;
            case 'cups': return amount * 8;
            case 'liters': return amount * 33.814;
            default: return amount;
          }
        };
        hydrationOz = convertToOz(meals.hydration.amount, meals.hydration.unit);
      }

      // Combine vitamins and supplements names
      const supplementNames = [
        ...meals.vitamins.map(v => v.name),
        ...meals.supplements.map(s => s.name),
      ].filter(Boolean);

      // Insert to vault_nutrition_logs
      const { error } = await supabase
        .from('vault_nutrition_logs')
        .insert({
          user_id: user.id,
          entry_date: today,
          logged_at: new Date().toISOString(),
          calories: totals.calories || null,
          protein_g: totals.protein || null,
          carbs_g: totals.carbs || null,
          fats_g: totals.fats || null,
          hydration_oz: hydrationOz || null,
          energy_level: null,
          digestion_notes: digestionNotes || null,
          supplements: supplementNames,
          meal_type: mealType || null,
          meal_title: mealTitle || null,
          meal_time: mealTime || null,
        });

      if (error) throw error;

      // Invalidate all nutrition-related queries for E2E sync
      queryClient.invalidateQueries({ queryKey: ['nutritionLogs'] });
      queryClient.invalidateQueries({ queryKey: ['macroProgress'] });

      return { success: true };
    } catch (error) {
      console.error('Error syncing meal to vault:', error);
      return { success: false, error: 'Failed to sync meal' };
    }
  }, [user, queryClient]);

  /**
   * Full sync - sync all data from MealBuilder to respective tables
   */
  const syncAll = useCallback(async (
    meals: MealData,
    options: MealVaultSyncOptions = {}
  ) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const results = await Promise.all([
      syncHydration(meals.hydration),
      syncVitamins(meals.vitamins),
      options.syncToVault ? syncMealToVault(meals, options) : Promise.resolve({ success: true }),
    ]);

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      return { success: false, error: 'Some data failed to sync' };
    }

    toast.success('Nutrition data synced');
    return { success: true };
  }, [user, syncHydration, syncVitamins, syncMealToVault]);

  return {
    syncHydration,
    syncVitamins,
    syncMealToVault,
    syncAll,
  };
}
