import { Exercise } from './customActivity';

export interface WorkoutRecommendation {
  id: string;
  name: string;
  focus: 'strength' | 'cardio' | 'recovery' | 'balanced';
  exercises: Exercise[];
  reasoning: string;
  estimatedDuration: number;
  confidence: number;
}

export interface WorkoutRecommendationsResponse {
  recommendations: WorkoutRecommendation[];
  analysisNote?: string;
}
