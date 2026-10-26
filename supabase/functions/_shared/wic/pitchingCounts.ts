/** Builds PitchingCounts from canonical game logs. Any game missing a field makes that field null
 * for the whole set — partial totals are never presented as complete. */
import type {PitchingCounts} from './masteryPitchingStandards.ts';
export interface PitcherPitchRow {batter_opportunity:number|null;batter_result:string|null;result:string|null;count_balls:number|null;count_strikes:number|null;contact_quality:string|null}
export interface PitcherGameRow {batters_faced:number|null;pitch_count:number|null;pitches:readonly PitcherPitchRow[];[k:string]:unknown}
const strike=new Set(['called_strike','swinging_strike','foul','in_play','bunt_foul','bunt_in_play']);
const swing=new Set(['swinging_strike','foul','in_play','bunt_foul','bunt_in_play']);
const sum=(games:readonly PitcherGameRow[],k:string)=>games.every(g=>typeof g[k]==='number')?games.reduce((a,g)=>a+(g[k] as number),0):null;
export function pitchingCounts(games:readonly PitcherGameRow[]):PitchingCounts{
 let bf=0,k=0,bb=0,hr=0,hits=0,nonAb=0,fps=0,two=0,bip=0,soft=0,sw=0,wh=0;let byPitch=games.length>0,contactKnown=true;
 for(const g of games){
  const groups=new Map<number,PitcherPitchRow[]>();
  for(const p of g.pitches){if(p.batter_opportunity==null){byPitch=false;continue;}const l=groups.get(p.batter_opportunity)??[];l.push(p);groups.set(p.batter_opportunity,l);}
  if(!groups.size||(g.batters_faced!=null&&g.batters_faced!==groups.size)){byPitch=false;continue;}
  for(const rows of groups.values()){
   bf++;const r=rows.find(x=>x.batter_result)?.batter_result??null;if(!r){byPitch=false;continue;}
   if(r==='K')k++;if(r==='BB'||r==='IBB')bb++;if(r==='HR')hr++;if(['1B','2B','3B','HR'].includes(r))hits++;if(['BB','IBB','HBP','SAC','SF'].includes(r))nonAb++;
   const first=rows.find(x=>x.count_balls===0&&x.count_strikes===0);if(!first){byPitch=false;continue;}if(strike.has(first.result??''))fps++;
   if(rows.some(x=>(x.count_balls??0)>=2||(x.count_balls===1&&x.result==='ball')))two++;
   for(const x of rows){if(swing.has(x.result??''))sw++;if(x.result==='swinging_strike')wh++;
    if(x.result==='in_play'||x.result==='bunt_in_play'){bip++;if(!x.contact_quality)contactKnown=false;else if(x.contact_quality==='soft')soft++;}}
  }
 }
 const ok=byPitch;
 const ttp=games.every(g=>Array.isArray(g.pitcher_time_to_plate_sec))?games.flatMap(g=>(g.pitcher_time_to_plate_sec as number[]).map(Number)):null;
 return {battersFaced:ok?bf:(sum(games,'batters_faced')??0),strikeouts:ok?k:sum(games,'pitcher_strikeouts'),walks:ok?bb:sum(games,'pitcher_walks'),homeRuns:ok?hr:sum(games,'pitcher_home_runs'),hits:ok?hits:sum(games,'pitcher_hits'),atBatsAgainst:ok?bf-nonAb:sum(games,'pitcher_at_bats_against'),
  outs:sum(games,'pitcher_outs'),runs:sum(games,'pitcher_runs'),earnedRuns:sum(games,'pitcher_earned_runs'),pitches:sum(games,'pitch_count'),
  firstPitchStrikes:ok?fps:sum(games,'pitcher_first_pitch_strikes'),twoBallBatters:ok?two:sum(games,'pitcher_two_ball_batters'),innings:sum(games,'pitcher_innings'),scoringPosInnings:sum(games,'pitcher_scoring_pos_innings'),
  runnersInScoringPos:sum(games,'pitcher_risp_runners'),runnersOn:sum(games,'pitcher_runners_on'),runnersStranded:sum(games,'pitcher_runners_stranded'),
  ballsInPlay:ok?bip:contactTotal(games),softContact:ok?(contactKnown?soft:null):sum(games,'pitcher_soft_contact'),swings:ok?sw:null,whiffs:ok?wh:null,
  stolenBases:sum(games,'pitcher_sb_allowed'),stealAttempts:sum(games,'pitcher_steal_attempts'),pickoffs:sum(games,'pitcher_pickoffs'),pickoffAttempts:sum(games,'pitcher_pickoff_attempts'),
  timeToPlateS:ttp&&ttp.length?ttp:null,pfpChances:sum(games,'pitcher_pfp_chances'),pfpErrors:sum(games,'pitcher_pfp_errors')};
}
function contactTotal(games:readonly PitcherGameRow[]){const a=sum(games,'pitcher_soft_contact'),b=sum(games,'pitcher_medium_contact'),c=sum(games,'pitcher_hard_contact');return a==null||b==null||c==null?null:a+b+c;}
