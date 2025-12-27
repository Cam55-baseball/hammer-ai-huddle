/**
 * TDEE (Total Daily Energy Expenditure) Calculation Utilities
 * Uses the Mifflin-St Jeor equation for BMR calculation
 */

export type Sex = 'male' | 'female';

export type ActivityLevel = 
  | 'sedentary' 
  | 'lightly_active' 
  | 'moderately_active' 
  | 'very_active' 
  | 'extra_active';

export type GoalType = 
  | 'lose_weight' 
  | 'gain_weight' 
  | 'lose_fat' 
  | 'gain_lean_muscle' 
  | 'maintain';

export type DayType = 'rest' | 'training' | 'practice' | 'game' | 'travel';

// Activity level multipliers for TDEE calculation
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,        // Little or no exercise
  lightly_active: 1.375, // Light exercise 1-3 days/week
  moderately_active: 1.55, // Moderate exercise 3-5 days/week
  very_active: 1.725,    // Hard exercise 6-7 days/week
  extra_active: 1.9      // Very hard exercise, physical job, or 2x training
};

// Goal-based calorie adjustments (calories per day)
export const GOAL_CALORIE_ADJUSTMENTS: Record<GoalType, number> = {
  lose_weight: -500,      // ~1 lb/week loss
  lose_fat: -400,         // Slower loss to preserve muscle
  gain_weight: 400,       // ~0.8 lb/week gain
  gain_lean_muscle: 250,  // Lean bulk
  maintain: 0
};

// Protein targets in grams per pound of bodyweight
export const PROTEIN_TARGETS: Record<GoalType, number> = {
  lose_weight: 1.0,       // High protein to preserve muscle
  lose_fat: 1.2,          // Extra high for body recomp
  gain_weight: 0.8,       // Standard for bulk
  gain_lean_muscle: 1.1,  // High for muscle synthesis
  maintain: 0.8           // Standard maintenance
};

// Day type calorie adjustments (percentage)
export const DAY_TYPE_ADJUSTMENTS: Record<DayType, { calories: number; carbs: number }> = {
  rest: { calories: -0.10, carbs: -0.20 },     // -10% cals, -20% carbs
  training: { calories: 0.12, carbs: 0.15 },   // +12% cals, +15% carbs
  practice: { calories: 0.08, carbs: 0.10 },   // +8% cals, +10% carbs
  game: { calories: 0.25, carbs: 0.30 },       // +25% cals, +30% carbs
  travel: { calories: 0, carbs: 0 }            // Maintain baseline
};

/**
 * Convert height from inches to centimeters
 */
export function inchesToCm(inches: number): number {
  return inches * 2.54;
}

/**
 * Convert weight from pounds to kilograms
 */
export function lbsToKg(lbs: number): number {
  return lbs * 0.453592;
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor equation
 * 
 * Male: BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + 5
 * Female: BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) - 161
 */
export function calculateBMR(
  weightLbs: number,
  heightInches: number,
  age: number,
  sex: Sex
): number {
  const weightKg = lbsToKg(weightLbs);
  const heightCm = inchesToCm(heightInches);
  
  const baseBMR = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  
  return sex === 'male' ? baseBMR + 5 : baseBMR - 161;
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 * TDEE = BMR × Activity Multiplier
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * Calculate daily calorie target based on goal
 */
export function calculateDailyCalorieTarget(
  tdee: number,
  goalType: GoalType
): number {
  return Math.round(tdee + GOAL_CALORIE_ADJUSTMENTS[goalType]);
}

/**
 * Adjust calories for day type (game day, training, rest, etc.)
 */
export function adjustCaloriesForDayType(
  baseCalories: number,
  dayType: DayType
): number {
  const adjustment = DAY_TYPE_ADJUSTMENTS[dayType];
  return Math.round(baseCalories * (1 + adjustment.calories));
}

/**
 * Calculate macro targets based on calorie goal and body composition goal
 */
export interface MacroTargets {
  protein: number;  // grams
  carbs: number;    // grams
  fats: number;     // grams
  fiber: number;    // grams
}

export function calculateMacroTargets(
  dailyCalories: number,
  weightLbs: number,
  goalType: GoalType,
  dayType: DayType = 'training'
): MacroTargets {
  // Calculate protein first (priority macro)
  const proteinGrams = Math.round(weightLbs * PROTEIN_TARGETS[goalType]);
  const proteinCalories = proteinGrams * 4;
  
  // Remaining calories for carbs and fats
  const remainingCalories = dailyCalories - proteinCalories;
  
  // Base carb/fat split: 55% carbs, 45% fats of remaining
  let carbPercent = 0.55;
  let fatPercent = 0.45;
  
  // Adjust carb/fat ratio based on day type
  const dayAdjustment = DAY_TYPE_ADJUSTMENTS[dayType];
  carbPercent += dayAdjustment.carbs * 0.5; // Shift ratio on training days
  fatPercent = 1 - carbPercent;
  
  // Ensure reasonable ranges
  carbPercent = Math.max(0.40, Math.min(0.65, carbPercent));
  fatPercent = 1 - carbPercent;
  
  const carbCalories = remainingCalories * carbPercent;
  const fatCalories = remainingCalories * fatPercent;
  
  const carbGrams = Math.round(carbCalories / 4);
  const fatGrams = Math.round(fatCalories / 9);
  
  // Fiber recommendation: 14g per 1000 calories
  const fiberGrams = Math.round((dailyCalories / 1000) * 14);
  
  return {
    protein: proteinGrams,
    carbs: carbGrams,
    fats: fatGrams,
    fiber: Math.max(25, Math.min(40, fiberGrams)) // Clamp between 25-40g
  };
}

/**
 * Full calculation from biometric inputs to daily targets
 */
export interface NutritionTargets {
  bmr: number;
  tdee: number;
  dailyCalories: number;
  macros: MacroTargets;
}

export function calculateFullNutritionTargets(
  weightLbs: number,
  heightInches: number,
  age: number,
  sex: Sex,
  activityLevel: ActivityLevel,
  goalType: GoalType,
  dayType: DayType = 'training'
): NutritionTargets {
  const bmr = calculateBMR(weightLbs, heightInches, age, sex);
  const tdee = calculateTDEE(bmr, activityLevel);
  const goalAdjustedCalories = calculateDailyCalorieTarget(tdee, goalType);
  const dailyCalories = adjustCaloriesForDayType(goalAdjustedCalories, dayType);
  const macros = calculateMacroTargets(dailyCalories, weightLbs, goalType, dayType);
  
  return {
    bmr: Math.round(bmr),
    tdee,
    dailyCalories,
    macros
  };
}

/**
 * Game day meal timing recommendations
 */
export interface GameDayMealTiming {
  preGameMeal: {
    hoursBeforeGame: number;
    description: string;
    carbFocus: number; // percentage
    proteinFocus: number;
    fatFocus: number;
  };
  preGameSnack: {
    hoursBeforeGame: number;
    description: string;
  };
  postGameWindow: {
    withinMinutes: number;
    description: string;
  };
  postGameMeal: {
    hoursAfterGame: number;
    description: string;
  };
}

export function getGameDayMealTiming(): GameDayMealTiming {
  return {
    preGameMeal: {
      hoursBeforeGame: 3.5,
      description: 'Complex carbs, lean protein, low fat',
      carbFocus: 55,
      proteinFocus: 25,
      fatFocus: 20
    },
    preGameSnack: {
      hoursBeforeGame: 1,
      description: 'Simple carbs, light and easily digestible'
    },
    postGameWindow: {
      withinMinutes: 30,
      description: 'Recovery shake: protein + simple carbs (2:1 carb:protein ratio)'
    },
    postGameMeal: {
      hoursAfterGame: 2,
      description: 'High protein, moderate carbs for muscle recovery'
    }
  };
}

/**
 * Calculate weekly weight change projection
 */
export function calculateWeeklyWeightChange(
  dailyCalorieAdjustment: number
): number {
  // 3500 calories ≈ 1 pound
  return dailyCalorieAdjustment * 7 / 3500;
}

/**
 * Estimate time to reach goal weight
 */
export function estimateWeeksToGoal(
  currentWeight: number,
  targetWeight: number,
  weeklyChange: number
): number | null {
  if (weeklyChange === 0) return null;
  
  const weightDifference = targetWeight - currentWeight;
  
  // Check if direction is correct
  if ((weightDifference > 0 && weeklyChange < 0) || 
      (weightDifference < 0 && weeklyChange > 0)) {
    return null;
  }
  
  return Math.abs(Math.round(weightDifference / weeklyChange));
}
