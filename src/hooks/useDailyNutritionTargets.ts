import { useMemo } from 'react';
import { useTDEE } from '@/hooks/useTDEE';
import { useHydration } from '@/hooks/useHydration';
import type { NutritionTargets, MacroTargets } from '@/utils/tdeeCalculations';

export interface DailyTargets {
  // Calculated targets
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  hydration: number; // oz
  
  // TDEE breakdown
  bmr: number;
  tdee: number;
  
  // Progress
  consumedCalories: number;
  consumedProtein: number;
  consumedCarbs: number;
  consumedFats: number;
  consumedHydration: number;
  
  // Percentages
  caloriesPercent: number;
  proteinPercent: number;
  carbsPercent: number;
  fatsPercent: number;
  hydrationPercent: number;
  
  // Meta
  isProfileComplete: boolean;
  hasActiveGoal: boolean;
  dayType: string;
  goalType: string;
}

interface ConsumedNutrition {
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

export function useDailyNutritionTargets(consumed?: ConsumedNutrition) {
  const { 
    nutritionTargets, 
    isProfileComplete, 
    hasActiveGoal, 
    todayEvent,
    activeGoal,
    loading: tdeeLoading 
  } = useTDEE();
  
  const { todayTotal: consumedHydration, settings: hydrationSettings } = useHydration();

  const dailyTargets = useMemo((): DailyTargets => {
    // Default targets when profile is incomplete
    const defaultTargets: DailyTargets = {
      calories: 2000,
      protein: 150,
      carbs: 250,
      fats: 70,
      fiber: 30,
      hydration: hydrationSettings?.daily_goal_oz || 100,
      bmr: 0,
      tdee: 0,
      consumedCalories: consumed?.calories || 0,
      consumedProtein: consumed?.protein || 0,
      consumedCarbs: consumed?.carbs || 0,
      consumedFats: consumed?.fats || 0,
      consumedHydration: consumedHydration,
      caloriesPercent: 0,
      proteinPercent: 0,
      carbsPercent: 0,
      fatsPercent: 0,
      hydrationPercent: 0,
      isProfileComplete: false,
      hasActiveGoal: false,
      dayType: 'training',
      goalType: 'maintain'
    };

    if (!nutritionTargets) {
      // Calculate percentages for default
      defaultTargets.caloriesPercent = Math.min(100, Math.round((defaultTargets.consumedCalories / defaultTargets.calories) * 100));
      defaultTargets.proteinPercent = Math.min(100, Math.round((defaultTargets.consumedProtein / defaultTargets.protein) * 100));
      defaultTargets.carbsPercent = Math.min(100, Math.round((defaultTargets.consumedCarbs / defaultTargets.carbs) * 100));
      defaultTargets.fatsPercent = Math.min(100, Math.round((defaultTargets.consumedFats / defaultTargets.fats) * 100));
      defaultTargets.hydrationPercent = Math.min(100, Math.round((defaultTargets.consumedHydration / defaultTargets.hydration) * 100));
      return defaultTargets;
    }

    const hydrationGoal = hydrationSettings?.daily_goal_oz || 100;
    
    const targets: DailyTargets = {
      // From TDEE calculation
      calories: nutritionTargets.dailyCalories,
      protein: nutritionTargets.macros.protein,
      carbs: nutritionTargets.macros.carbs,
      fats: nutritionTargets.macros.fats,
      fiber: nutritionTargets.macros.fiber,
      hydration: hydrationGoal,
      bmr: nutritionTargets.bmr,
      tdee: nutritionTargets.tdee,
      
      // Consumed values
      consumedCalories: consumed?.calories || 0,
      consumedProtein: consumed?.protein || 0,
      consumedCarbs: consumed?.carbs || 0,
      consumedFats: consumed?.fats || 0,
      consumedHydration: consumedHydration,
      
      // Calculate percentages
      caloriesPercent: Math.min(100, Math.round(((consumed?.calories || 0) / nutritionTargets.dailyCalories) * 100)),
      proteinPercent: Math.min(100, Math.round(((consumed?.protein || 0) / nutritionTargets.macros.protein) * 100)),
      carbsPercent: Math.min(100, Math.round(((consumed?.carbs || 0) / nutritionTargets.macros.carbs) * 100)),
      fatsPercent: Math.min(100, Math.round(((consumed?.fats || 0) / nutritionTargets.macros.fats) * 100)),
      hydrationPercent: Math.min(100, Math.round((consumedHydration / hydrationGoal) * 100)),
      
      // Meta info
      isProfileComplete,
      hasActiveGoal,
      dayType: todayEvent?.eventType || 'training',
      goalType: activeGoal?.goalType || 'maintain'
    };

    return targets;
  }, [nutritionTargets, consumed, consumedHydration, hydrationSettings, isProfileComplete, hasActiveGoal, todayEvent, activeGoal]);

  return {
    targets: dailyTargets,
    loading: tdeeLoading,
    isProfileComplete,
    hasActiveGoal
  };
}
