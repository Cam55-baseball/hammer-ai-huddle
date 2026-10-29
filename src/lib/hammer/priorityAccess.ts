import { requiredAnalyses } from '@/lib/assessment/initialAssessment';

/** Match Vault skill access to this sport; another sport never unlocks a prompt. */
export function priorityAccess(modules: readonly string[], sport: 'baseball' | 'softball') {
  const scoped = modules.flatMap(module => module.startsWith(`${sport}_`) ? [module] : ['hitting','pitching','throwing'].includes(module) ? [`${sport}_${module}`] : []);
  const included = requiredAnalyses(scoped);
  return {
    hasPitching: included.includes('pitching'),
    hasHitting: included.includes('hitting'),
    hasThrowing: included.includes('throwing'),
  };
}