/** Only exact server-approved TEST identities may consume scoped settings. */
export const PHILOSOPHY_TEST_USERS = ['a283a732-dfca-4160-9c9b-55305e092572','bb839f7d-6a03-460e-8b64-444f220b53da'] as const;
export function testSettingsFor<T extends object>(row:T, userId:string|undefined):T {
  if (!userId || !PHILOSOPHY_TEST_USERS.some(id=>id===userId)) return row;
  const raw=(row as {test_overrides?:unknown}).test_overrides;
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return row;
  const scoped=(raw as Record<string,unknown>)[userId];
  if(!scoped||typeof scoped!=='object'||Array.isArray(scoped))return row;
  const allowed=new Set(['elite_grade','pitching_standards','prescription_weights','weekly_minimums','tags','fault_keys','placements','routine_role','weight']);
  return {...row,...Object.fromEntries(Object.entries(scoped).filter(([key])=>allowed.has(key)))};
}
export type SettingChange={target:'mastery_identity_settings'|'library_videos'|'owner_drills'|'engine_dynamic_weights';id:string;field:string;before:unknown;after:unknown};
export type SettingsReceipt={principle_id:string;version:number;version_id:string;test_user:string;changes:SettingChange[];undone?:boolean};
export function settingsChanges(raw:unknown):SettingChange[]{
  if(!Array.isArray(raw)||raw.length<1||raw.length>12)throw Error('Choose 1–12 exact existing settings.');
  const seen=new Set<string>();
  return raw.map(c=>{
    if(!c||!['mastery_identity_settings','library_videos','owner_drills','engine_dynamic_weights'].includes(c.target)||typeof c.id!=='string'||!c.id||typeof c.field!=='string'||!Object.prototype.hasOwnProperty.call(c,'before')||!Object.prototype.hasOwnProperty.call(c,'after')||JSON.stringify(c.before)===JSON.stringify(c.after))throw Error('Each setting needs exact different old and new values.');
    const fields:Record<string,string[]>={mastery_identity_settings:['elite_grade','pitching_standards','prescription_weights','weekly_minimums'],library_videos:['tags'],owner_drills:['fault_keys','placements','routine_role'],engine_dynamic_weights:['weight']};
    if(!fields[c.target].includes(c.field))throw Error('That setting is not supported.');
    const key=`${c.target}/${c.id}/${c.field}`;if(seen.has(key))throw Error('Duplicate setting.');seen.add(key);
    return {target:c.target,id:c.id,field:c.field,before:c.before,after:c.after};
  });
}