// @ts-nocheck
// Stubbed out - html2canvas removed to fix build loop
// This file provides no-op implementations that show user-friendly messages

interface VaultRecap {
  id: string;
  recap_period_start: string;
  recap_period_end: string;
  total_weight_lifted: number | null;
  strength_change_percent: number | null;
  recap_data: {
    summary?: string;
    highlights?: string[];
    improvements?: string[];
    workout_stats?: {
      total_workouts: number;
      total_weight: number;
      weight_increases: number;
      avg_session_weight: number;
    };
    mental_stats?: {
      avg_mental: number;
      avg_emotional: number;
      avg_physical: number;
      quiz_count: number;
    };
  };
  generated_at: string;
}

export async function generateRecapShareImage(recap: VaultRecap): Promise<Blob> {
  // Image generation temporarily unavailable
  console.warn('Share image generation is temporarily unavailable');
  throw new Error('Share image generation is temporarily unavailable. Please try again later.');
}
