import { requiredAnalyses } from '@/lib/assessment/initialAssessment';
import { normalizeProgramModules } from '../../../supabase/functions/_shared/programAccess';

/** Match Vault skill access to this sport; another sport never unlocks a prompt. */
export function priorityAccess(modules: readonly string[], sport: 'baseball' | 'softball') {
  const scoped = normalizeProgramModules(modules, sport).filter(module => module.startsWith(`${sport}_`));
  const included = requiredAnalyses(scoped);
  return {
    hasPitching: included.includes('pitching'),
    hasHitting: included.includes('hitting'),
    hasThrowing: included.includes('throwing'),
  };
}