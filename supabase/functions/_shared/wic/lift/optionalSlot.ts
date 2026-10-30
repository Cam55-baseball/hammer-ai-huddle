/** Optional robustness cannot occupy another mandatory single-slot compound. */
export function optionalCompoundAvailable(category:string|null,used:readonly (string|null)[]):boolean {
  return !category || !['compound_lower','compound_upper_push','compound_upper_pull'].includes(category) || !used.includes(category);
}