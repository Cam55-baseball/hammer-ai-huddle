// @ts-nocheck
// Stubbed out - jspdf removed to fix build loop
// This file provides no-op implementations that show user-friendly messages

interface VaultRecap {
  id: string;
  recap_period_start: string;
  recap_period_end: string;
  total_weight_lifted: number | null;
  strength_change_percent: number | null;
  recap_data: {
    executive_summary?: string;
    training_analysis?: string[];
    recovery_assessment?: string[];
    mental_performance?: string[];
    scout_grade_analysis?: string[];
    nutrition_impact?: string[];
    critical_focus_areas?: string[];
    strategic_recommendations?: string[];
    elite_insight?: string;
    summary?: string;
    highlights?: string[];
    improvements?: string[];
    focus_areas?: string[];
    recommendations?: string[];
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
    nutrition_stats?: {
      avg_calories: number;
      avg_protein: number;
      avg_energy: number;
      logs_count: number;
    };
    performance_tests?: any[];
  };
  generated_at: string;
  saved_to_library?: boolean;
}

export async function generateRecapPdf(recap: VaultRecap): Promise<void> {
  // PDF generation temporarily unavailable
  console.warn('PDF generation is temporarily unavailable');
  throw new Error('PDF download is temporarily unavailable. Please try again later.');
}

export async function generateRecapPdfBase64(recap: VaultRecap): Promise<string> {
  // PDF generation temporarily unavailable
  console.warn('PDF generation is temporarily unavailable');
  throw new Error('PDF generation is temporarily unavailable. Please try again later.');
}
