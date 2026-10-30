/** Optional robustness cannot occupy another mandatory single-slot compound. */
export function optionalCompoundAvailable(category:string|null,used:readonly (string|null)[]):boolean {
  return !category || !['compound_lower','compound_upper_push','compound_upper_pull'].includes(category) || !used.includes(category);
}
/** Exposure step-downs may change categories: retain the first canonical compound. */
export function removeDuplicateCompounds<T extends {slot:string}>(rows:readonly T[],categoryOf:(row:T)=>string|null):{rows:T[];removed:T[]} {
 const seen=new Set<string>();const removed:T[]=[];
 const kept=rows.filter(row=>{
  const category=categoryOf(row);
  if(row.slot!=='lift'||!category||!['compound_lower','compound_upper_push','compound_upper_pull'].includes(category))return true;
  if(seen.has(category)){removed.push(row);return false;}
  seen.add(category);return true;
 });
 return {rows:kept,removed};
}