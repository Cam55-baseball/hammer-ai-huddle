import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
type Patch=(p:Record<string,unknown>)=>void;
type Game=Record<string,unknown>&{sport?:string|null;pitching_history_complete?:boolean|null};
const NUM:[string,string,boolean][]=[
 ['pitcher_outs','Outs recorded',false],['pitcher_innings','Innings pitched in (count each inning you threw in)',false],
 ['pitcher_strikeouts','Strikeouts',true],['pitcher_walks','Walks',true],['pitcher_hits','Hits allowed',false],['pitcher_home_runs','Home runs allowed',true],
 ['pitcher_at_bats_against','At-bats against',true],['pitcher_runs','Runs allowed',false],['pitcher_earned_runs','Earned runs',false],
 ['pitcher_first_pitch_strikes','Batters who got a first-pitch strike',true],['pitcher_two_ball_batters','Batters who reached a two-ball count',true],
 ['pitcher_soft_contact','Balls in play: soft',true],['pitcher_medium_contact','Balls in play: medium',true],['pitcher_hard_contact','Balls in play: hard',true],
 ['pitcher_runners_on','Runners who reached base',false],['pitcher_runners_stranded','Runners left on base',false],
 ['pitcher_sb_allowed','Stolen bases allowed',false],['pitcher_steal_attempts','Steal attempts (stolen + caught stealing)',false],
 ['pitcher_pickoffs','Pickoffs',false],['pitcher_pickoff_attempts','Pickoff attempts',false],
 ['pitcher_pfp_chances','Fielding plays as pitcher (comebackers, bunts, covering 1B)',false],['pitcher_pfp_errors','Fielding errors as pitcher',false],
];
const toInt=(raw:string)=>{const t=raw.trim();if(t==='')return null;const n=Number(t);return Number.isSafeInteger(n)&&n>=0?n:undefined;};
/** Pitching line for the stored game fields. Blank = not recorded, never zero. */
export function PitchingLineFields({game,onPatch}:{game:Game;onPatch:Patch}){
 const derived=game.pitching_history_complete===true;const baseball=game.sport!=='softball';
 const innings=typeof game.pitcher_innings==='number'?Math.min(game.pitcher_innings,15):0;
 const sp=Array.isArray(game.pitcher_scoring_pos_by_inning)?game.pitcher_scoring_pos_by_inning as boolean[]:[];
 const setInning=(i:number,v:boolean)=>{const next=Array.from({length:innings},(_,n)=>n===i?v:sp[n]===true);onPatch({pitcher_scoring_pos_by_inning:next,pitcher_scoring_pos_innings:next.filter(Boolean).length});};
 return <fieldset aria-label="Pitching line" className="space-y-2 rounded-md border border-border p-3">
  <legend className="px-1 text-sm font-medium">Pitching line (leave blank if you didn't track it)</legend>
  {derived&&<p className="text-xs text-muted-foreground">Strikeouts, walks, first-pitch strikes, two-ball counts and contact come from your pitch-by-pitch log.</p>}
  <div className="grid grid-cols-2 gap-2">{NUM.filter(([,,fromPitches])=>!(derived&&fromPitches)).map(([k,label])=><div key={k} className="space-y-1">
   <Label htmlFor={k} className="text-xs">{label}</Label>
   <Input id={k} type="number" min={0} step={1} inputMode="numeric" defaultValue={typeof game[k]==='number'?String(game[k]):''} onBlur={e=>{const n=toInt(e.target.value);if(n!==undefined)onPatch({[k]:n});}}/>
  </div>)}</div>
  {innings>0&&<div className="space-y-1"><p className="text-xs font-medium">Did a runner reach 2nd or 3rd?</p><div className="flex flex-wrap gap-3">{Array.from({length:innings},(_,i)=><label key={i} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={sp[i]===true} onChange={e=>setInning(i,e.target.checked)}/>Inning {i+1}</label>)}</div></div>}
  {baseball&&<div className="space-y-1"><Label htmlFor="pitcher_time_to_plate_sec" className="text-xs">Time to plate, seconds (Royal timing or stopwatch; separate with commas)</Label>
   <Input id="pitcher_time_to_plate_sec" inputMode="decimal" defaultValue={Array.isArray(game.pitcher_time_to_plate_sec)?(game.pitcher_time_to_plate_sec as number[]).join(', '):''} onBlur={e=>{const t=e.target.value.trim();if(!t)return onPatch({pitcher_time_to_plate_sec:null});const v=t.split(',').map(x=>Number(x.trim()));if(v.every(x=>Number.isFinite(x)&&x>0&&x<5))onPatch({pitcher_time_to_plate_sec:v.map(x=>Math.round(x*100)/100)});}}/></div>}
 </fieldset>;
}
