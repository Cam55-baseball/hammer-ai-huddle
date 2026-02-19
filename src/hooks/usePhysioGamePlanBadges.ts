import { useMemo } from 'react';
import { usePhysioDailyReport } from './usePhysioDailyReport';
import { usePhysioProfile } from './usePhysioProfile';

export interface PhysioBadge {
  taskId: string;
  type: 'recovery' | 'fuel' | 'load_reduction' | 'mobility';
  label: string;
  message: string;
  color: string;
}

// Task IDs from the game plan that physio badges apply to
const WORKOUT_TASK_IDS = ['elite-workout', 'hitting', 'pitching', 'throwing', 'speed-agility'];
const NUTRITION_TASK_IDS = ['nutrition', 'vault-nutrition'];

export function usePhysioGamePlanBadges() {
  const { report } = usePhysioDailyReport();
  const { profile } = usePhysioProfile();

  const badges = useMemo((): PhysioBadge[] => {
    if (!report) return [];
    
    const result: PhysioBadge[] = [];
    const { regulation_color, fuel_score, restriction_score } = report;
    const hasActiveIllness = !!profile?.active_illness;

    // Recovery badge: red regulation → workout tasks
    if (regulation_color === 'red') {
      WORKOUT_TASK_IDS.forEach(taskId => {
        result.push({
          taskId,
          type: 'recovery',
          label: 'Recovery Mode',
          message: `Your regulation score suggests prioritizing active recovery today. Consider reducing intensity by 30-40% or switching to mobility work.`,
          color: 'red',
        });
      });
    }

    // Fuel badge: calories < 80% of goal → nutrition tasks
    if (fuel_score !== null && fuel_score < 80) {
      NUTRITION_TASK_IDS.forEach(taskId => {
        result.push({
          taskId,
          type: 'fuel',
          label: 'Under-Fueled',
          message: `Your fuel score is low. Aim to hit at least 80% of your calorie target — your body needs energy for recovery and adaptation.`,
          color: 'amber',
        });
      });
    }

    // Load reduction badge: active illness → workout tasks
    if (hasActiveIllness) {
      WORKOUT_TASK_IDS.forEach(taskId => {
        // Don't duplicate with recovery badge
        if (!result.find(b => b.taskId === taskId && b.type === 'recovery')) {
          result.push({
            taskId,
            type: 'load_reduction',
            label: 'Illness Protocol',
            message: `Active illness detected (${profile?.active_illness}). Reduce training load to ~60% of normal. Focus on movement quality over intensity.`,
            color: 'orange',
          });
        }
      });
    }

    // Mobility badge: restriction score low → workout tasks
    if (restriction_score !== null && restriction_score < 60) {
      WORKOUT_TASK_IDS.forEach(taskId => {
        if (!result.find(b => b.taskId === taskId)) {
          result.push({
            taskId,
            type: 'mobility',
            label: 'Mobility First',
            message: `Movement restrictions detected. Spend 10-15 min on targeted mobility work before your session to reduce injury risk.`,
            color: 'yellow',
          });
        }
      });
    }

    return result;
  }, [report, profile]);

  const getBadgesForTask = (taskId: string): PhysioBadge[] => {
    return badges.filter(b => b.taskId === taskId || taskId.includes(b.taskId) || b.taskId.includes(taskId));
  };

  return { badges, getBadgesForTask };
}
