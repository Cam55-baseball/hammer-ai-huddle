/** Preserve sibling exercises and checklist edits when an accepted activity saves one exercise. */
export function mergeActivityPerformance(current: Record<string, any>, incoming: Record<string, any>): Record<string, any> {
  const merged = { ...current, ...incoming };
  for (const key of ['checkboxStates', 'fieldValues', 'exerciseSets']) {
    if (current[key] || incoming[key]) merged[key] = { ...(current[key] || {}), ...(incoming[key] || {}) };
  }
  return merged;
}