import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AggregatedGoals {
  bodyGoal?: {
    type: 'cut' | 'bulk' | 'maintain' | 'recomp';
    targetWeightLbs?: number;
  };
  trainingIntent?: string[];
  painAreas?: string[];
  performanceGoals: string[];
  sport: 'baseball' | 'softball';
  position?: string;
}

// Map positions to performance goals
const POSITION_PERFORMANCE_GOALS: Record<string, string[]> = {
  pitcher: ['throw faster', 'improve arm health', 'build endurance'],
  catcher: ['explosive blocking', 'quick transfers', 'arm strength'],
  infielder: ['quick lateral movement', 'throwing accuracy', 'reaction time'],
  outfielder: ['sprint speed', 'throwing distance', 'tracking fly balls'],
  'first base': ['stretch flexibility', 'scoop throws', 'footwork'],
  'second base': ['quick pivot turns', 'range', 'double play speed'],
  shortstop: ['arm strength', 'range', 'quick release'],
  'third base': ['reaction time', 'arm strength', 'charging bunts'],
  utility: ['versatility', 'overall athleticism', 'adaptability'],
  hitter: ['bat speed', 'hip rotation power', 'contact consistency'],
};

// Map body goals to performance considerations
const BODY_GOAL_PERFORMANCE: Record<string, string> = {
  cut: 'maintain strength while losing fat',
  bulk: 'build power and muscle mass',
  maintain: 'optimize current performance',
  recomp: 'build muscle and reduce fat simultaneously',
};

export function useAthleteGoalsAggregated(enabled: boolean = true) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['athlete-goals-aggregated', user?.id],
    queryFn: async (): Promise<AggregatedGoals> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Fetch all goal sources in parallel
      const [bodyGoalResult, focusQuizResult, profileResult] = await Promise.all([
        supabase
          .from('athlete_body_goals')
          .select('goal_type, target_weight_lbs')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('vault_focus_quizzes')
          .select('training_intent, pain_location')
          .eq('user_id', user.id)
          .order('entry_date', { ascending: false })
          .limit(5),
        supabase
          .from('profiles')
          .select('position, sex')
          .eq('id', user.id)
          .single(),
      ]);

      // Process body goal
      const bodyGoal = bodyGoalResult.data ? {
        type: bodyGoalResult.data.goal_type as AggregatedGoals['bodyGoal']['type'],
        targetWeightLbs: bodyGoalResult.data.target_weight_lbs || undefined,
      } : undefined;

      // Process training intents from recent focus quizzes
      const trainingIntents = new Set<string>();
      const painAreasSet = new Set<string>();
      
      if (focusQuizResult.data) {
        focusQuizResult.data.forEach(quiz => {
          // training_intent is an array of strings
          if (quiz.training_intent && Array.isArray(quiz.training_intent)) {
            quiz.training_intent.forEach(intent => trainingIntents.add(intent));
          }
          // pain_location is also an array of strings
          if (quiz.pain_location && Array.isArray(quiz.pain_location)) {
            quiz.pain_location.forEach(area => {
              if (area !== 'none') {
                painAreasSet.add(area);
              }
            });
          }
        });
      }

      // Determine sport based on sex (softball for female athletes)
      const sport: 'baseball' | 'softball' = profileResult.data?.sex === 'female' ? 'softball' : 'baseball';
      
      // Get position
      const position = profileResult.data?.position?.toLowerCase() || undefined;

      // Build performance goals
      const performanceGoals: string[] = [];

      // Add position-based goals
      if (position) {
        const positionGoals = POSITION_PERFORMANCE_GOALS[position] || POSITION_PERFORMANCE_GOALS['utility'];
        performanceGoals.push(...positionGoals);
      }

      // Add body goal consideration
      if (bodyGoal?.type && BODY_GOAL_PERFORMANCE[bodyGoal.type]) {
        performanceGoals.push(BODY_GOAL_PERFORMANCE[bodyGoal.type]);
      }

      // Add intent-based goals
      if (trainingIntents.has('max_strength')) {
        performanceGoals.push('maximize strength output');
      }
      if (trainingIntents.has('speed_power')) {
        performanceGoals.push('explosive power development');
      }
      if (trainingIntents.has('recovery_prep')) {
        performanceGoals.push('active recovery and mobility');
      }
      if (trainingIntents.has('technique')) {
        performanceGoals.push('movement quality and skill refinement');
      }

      // Default goals if none found
      if (performanceGoals.length === 0) {
        performanceGoals.push('overall athletic performance', 'injury prevention');
      }

      return {
        bodyGoal,
        trainingIntent: Array.from(trainingIntents),
        painAreas: Array.from(painAreasSet),
        performanceGoals,
        sport,
        position,
      };
    },
    enabled: enabled && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}
