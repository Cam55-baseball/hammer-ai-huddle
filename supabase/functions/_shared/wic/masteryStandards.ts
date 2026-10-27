/** Owner policy, October 26. Ratios are not converted into invented scouting grades. */
export type MasteryLevel='pro'|'college'|'high_school'|'youth';
export type MasteryStatus='Elite'|'Building'|'Need more data';
export const IDENTITY_SOURCE='Camryn Williams · October 26, 2026 · Coaching Console settings';
export const CONTACT_PRINCIPLE='Take a strike rather than swing and miss early in the count. Never strike out. With two strikes, protect the plate. This is the owner’s coaching principle, not a promise of results.';
export const CONTACT_DEFAULTS={pro:{k:.10,whiff:.08,zone:.92},college:{k:.08,whiff:.06,zone:.94},high_school:{k:.05,whiff:.04,zone:.96},youth:{k:.05,whiff:.04,zone:.96}} as const;
/** Owner softball hitting starting standards, October 27, 2026. Whiff% and zone contact are starting values to calibrate from Hammers softball data (no public softball league data). */
export const SOFTBALL_HITTING_SOURCE='Camryn Williams · October 27, 2026 · softball starting standard (whiff and zone contact to be calibrated from Hammers softball data)';
export const SOFTBALL_CONTACT_DEFAULTS={pro:{k:.10,whiff:.08,zone:.92},college:{k:.07,whiff:.06,zone:.94},high_school:{k:.05,whiff:.04,zone:.96},youth:{k:.05,whiff:.04,zone:.96}} as const;
/** Elite HR/AB by level; lefty power = half, lacking power = below a quarter (owner-rounded). */
export const SOFTBALL_POWER_DEFAULTS={pro:{elite:.067,leftPower:.033,lacking:.017},college:{elite:.125,leftPower:.063,lacking:.031},high_school:{elite:.100,leftPower:.050,lacking:.025},youth:{elite:.100,leftPower:.050,lacking:.025}} as const;
/** Softball reads its own per-level power/bunting table; baseball keeps its saved settings unchanged. */
export function hittingStandardsFor(sport:'baseball'|'softball',level:MasteryLevel|null,settings:IdentitySettings):IdentitySettings{
 if(sport!=='softball')return settings;
 const p=level?SOFTBALL_POWER_DEFAULTS[level]:null;
 return {...settings,elite_hr_rate:p?.elite??null,left_power_hr_rate:p?.leftPower??null,lacking_power_hr_rate:p?.lacking??null};
}
export interface IdentitySettings {
 elite_hr_rate?:number|null;left_power_hr_rate?:number|null;lacking_power_hr_rate?:number|null;bunt_low_average?:number|null;elite_grade?:number|null;power_chase_ratio?:number|null;
 contact_pro_k?:number|null;contact_pro_whiff?:number|null;contact_pro_zone?:number|null;
 contact_college_k?:number|null;contact_college_whiff?:number|null;contact_college_zone?:number|null;
 contact_high_school_k?:number|null;contact_high_school_whiff?:number|null;contact_high_school_zone?:number|null;
 contact_youth_k?:number|null;contact_youth_whiff?:number|null;contact_youth_zone?:number|null;
 pitching_k_min?:number|null;pitching_bb_max?:number|null;pitching_hr_max?:number|null;
}
export interface PitchContact {id:string;atBatId:string|null;result:string|null;strikes:number|null;zone:number|null;outZone:string|null}
export interface ContactWindow {atBats:number;strikeouts?:number;plateAppearances?:number;paIds?:string[];sourceIds:string[];pitchCounts?:Record<string,number|null>}
const swings=new Set(['swinging_strike','foul','in_play','bunt_foul','bunt_in_play']);
const misses=new Set(['swinging_strike']);
const takes=new Set(['ball','called_strike','hbp']);
export function contactIdentity(window:ContactWindow|null,pitches:readonly PitchContact[],level:MasteryLevel|null,settings:IdentitySettings){
 const cutoff=level?{k:settings[`contact_${level}_k`],whiff:settings[`contact_${level}_whiff`],zone:settings[`contact_${level}_zone`]}:null;
 const ids=new Set(window?.paIds??window?.sourceIds??[]);
 const rows=pitches.filter(p=>p.atBatId&&ids.has(p.atBatId));
 const unique=new Map<string,PitchContact>();let conflict=false;
 for(const p of rows){const old=unique.get(p.id);if(!p.id||old&&JSON.stringify(old)!==JSON.stringify(p))conflict=true;unique.set(p.id,p);}
 const actual=[...unique.values()];
 const full=!!window&&!conflict&&ids.size>0&&[...ids].every(id=>{const expected=window.pitchCounts?.[id];return typeof expected==='number'&&Number.isInteger(expected)&&expected>0&&actual.filter(p=>p.atBatId===id).length===expected;})&&actual.every(p=>swings.has(p.result??'')||takes.has(p.result??''));
 const swung=actual.filter(p=>swings.has(p.result??''));const whiffs=swung.filter(p=>misses.has(p.result??''));
 const located=full&&swung.every(p=>Number.isInteger(p.zone)&&Number(p.zone)>=1&&Number(p.zone)<=9||!!p.outZone);
 const zoneSwings=swung.filter(p=>Number.isInteger(p.zone)&&Number(p.zone)>=1&&Number(p.zone)<=9);
 const pa=window?.plateAppearances;const k=window&&typeof pa==='number'&&pa>0&&window.strikeouts!==undefined?window.strikeouts/pa:null;
 const whiff=full&&swung.length?whiffs.length/swung.length:null;
 const zone=located&&zoneSwings.length?zoneSwings.filter(p=>!misses.has(p.result??'')).length/zoneSwings.length:null;
 const judge=(v:number|null,c:number|null|undefined,lower:boolean):MasteryStatus=>v===null||c==null?'Need more data':(lower?v<c:v>=c)?'Elite':'Building';
 const parts={k:{value:k,status:judge(k,cutoff?.k,true),numerator:window?.strikeouts??null,denominator:pa??null,cutoff:cutoff?.k??null},whiff:{value:whiff,status:judge(whiff,cutoff?.whiff,true),numerator:full?whiffs.length:null,denominator:full?swung.length:null,cutoff:cutoff?.whiff??null},zone:{value:zone,status:judge(zone,cutoff?.zone,false),numerator:located?zoneSwings.filter(p=>!misses.has(p.result??'')).length:null,denominator:located?zoneSwings.length:null,cutoff:cutoff?.zone??null}};
 const statuses=Object.values(parts).map(p=>p.status);
 const status:MasteryStatus=statuses.includes('Building')?'Building':statuses.every(s=>s==='Elite')?'Elite':'Need more data';
 return {status,parts,earlyWhiffs:full&&actual.every(p=>p.strikes!==null)?whiffs.filter(p=>Number(p.strikes)<2).length:null,earlySwings:full&&actual.every(p=>p.strikes!==null)?swung.filter(p=>Number(p.strikes)<2).length:null,sourceIds:window?[...window.sourceIds,...(full?actual.map(p=>p.id):[])]:[],source:IDENTITY_SOURCE,definition:'Whiff% = swings and misses ÷ swings · Baseball Savant',level};
}
export function powerIdentity(window:{homeRuns:number;atBats:number;strikeouts?:number;sourceIds:string[]}|null,settings:IdentitySettings){
 const rate=window?window.homeRuns/window.atBats:null;const threshold=settings.elite_hr_rate;
 const status:MasteryStatus=rate===null||threshold==null?'Need more data':rate>=threshold?'Elite':'Building';
 const k=window?.strikeouts;const ratio=window&&k!==undefined&&k>0?window.homeRuns/k:null;
 return {status,rate,threshold:threshold??null,sourceIds:window?.sourceIds??[],source:IDENTITY_SOURCE,chase:{homeRuns:window?.homeRuns??null,strikeouts:k??null,ratio,target:settings.power_chase_ratio??null,met:window&&k!==undefined&&settings.power_chase_ratio!=null?window.homeRuns>0&&window.homeRuns>=k*settings.power_chase_ratio:null}};
}
export interface JudgedPillar {pillar:'contact'|'defense'|'arm'|'speed'|'power';status:MasteryStatus;sourceIds:readonly string[];progress:number|null}
/** Relative progress toward each declared standard; no invented 20–80 conversion. */
export function steerIdentity(pillars:readonly JudgedPillar[]){
 const judged=pillars.filter(p=>p.status!=='Need more data'&&p.sourceIds.length&&p.progress!==null&&Number.isFinite(p.progress));
 const alternatives=judged.filter(p=>p.pillar==='speed'||p.pillar==='power');
 const satisfied=alternatives.some(p=>p.status==='Elite');
 const chosen=!satisfied&&alternatives.length===2?[...alternatives].sort((a,b)=>Number(b.progress)-Number(a.progress))[0]:null;
 const required=judged.filter(p=>['contact','defense','arm'].includes(p.pillar)||p===chosen);
 const weak=required.filter(p=>p.status==='Building').sort((a,b)=>Number(a.progress)-Number(b.progress))[0]??null;
 return {focus:weak?.pillar??null,sourceIds:weak?.sourceIds??[],speedOrPower:satisfied?'Satisfied':chosen?.pillar??'Need more data',missing:pillars.filter(p=>p.status==='Need more data').map(p=>p.pillar),comparison:'Progress toward owner standards, not a prediction of attainability',reason:weak?`Your judged ${weak.pillar} pillar is furthest below its owner standard. Work on it inside your existing safe plan.`:'Need more data to choose a development focus.'};
}
export function validHumanGrade(value:unknown):value is number{return typeof value==='number'&&Number.isFinite(value)&&value>=20&&value<=80&&value%5===0;}