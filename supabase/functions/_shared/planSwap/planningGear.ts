import { avoidsMissingGear, requiredGear } from './simpleSwap.ts';

/** Selection assumptions only; never writes an athlete-owned inventory answer. */
export function planningGear(owned: readonly string[], missing: readonly string[], declarations: readonly Record<string, unknown>[] = []): string[] {
  const basics = ['bat','gamer_bat','tee','net','ball','baseballs','softballs','baseball','softball','glove','field','open_space','open_field','bands','partner','wall','floor','bodyweight','ladder','med_ball','box','foam_roller','massage_ball','towel','chair'];
  return [...new Set([...basics, ...owned, ...declarations.flatMap(requiredGear)])]
    .filter(item => avoidsMissingGear({equipment_requirements:[item]}, missing));
}