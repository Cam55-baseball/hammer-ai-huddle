export interface Exercise {
  name: string;
  type: 'skill' | 'strength' | 'isometric';
  description?: string;
  sets?: number;
  reps?: number;
  percentOf1RM?: number;
  holdTime?: number;
  trackWeight?: boolean;
  notes?: string;
}

export interface DayData {
  day: string;
  title: string;
  exercises: (string | Exercise)[];
}

export interface WeekData {
  week: number;
  title: string;
  focus: string;
  days: DayData[];
}

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface WeightLog {
  [week: string]: {
    [day: string]: {
      [exerciseIndex: number]: number[];
    };
  };
}

export const getAdjustedPercent = (basePercent: number, level: ExperienceLevel): number => {
  switch (level) {
    case 'beginner':
      return Math.max(basePercent - 10, 50);
    case 'advanced':
      return Math.min(basePercent + 5, 95);
    default:
      return basePercent;
  }
};

export const isExerciseObject = (exercise: string | Exercise): exercise is Exercise => {
  return typeof exercise === 'object' && 'name' in exercise;
};
