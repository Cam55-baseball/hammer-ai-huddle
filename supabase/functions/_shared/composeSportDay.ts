import {
  buildHammerDailyPlan, contextFromEnvelope, setOwnerPlanDrills, setWarmupStageOverrides,
  finalizeDatedPlan, projectBuntingEvidence, planFaultContext, accessiblePlanFaults,
  accessibleRecurringIssues, mergeCatalog, ELITE_DRILL_CATALOG, readDrillCirculation,
  priorityAccess, ENGINE_CONTRACT,
} from './generated/hammerBlockBuilder.mjs';
import { isoShift } from './wic/schedule/timeline.ts';
import { ageFromDob } from './age/ageFromDob.ts';
import { planningGear } from './planSwap/planningGear.ts';

/** Self JWT reads only; service jobs do not acquire an athlete's identity/health authority. */
export async function composeSportDay(db: any, input: {
  userId: string; date: string; sport: 'baseball'|'softball'; phase: string;
  rest: boolean; cns: number; equipment: string[]; injuries: string[]; birthday: string|null;
  outingFacts: unknown; posture: string; gameTomorrow: boolean; warmupStages: Record<string,unknown>;
  readiness: unknown; phaseStartedAt: string|null;
  alwaysMissingGear?: string[];
}) {
  const { userId: uid, date, sport } = input;
  const day = new Date(`${date}T12:00:00Z`);
  const since = isoShift(date,-56), practiceSince = isoShift(date,-7);
  const complete = (r: any, limit=1000) => {
    if(r.error) throw r.error;
    if(!Array.isArray(r.data)||r.data.length>=limit) throw new Error('Complete dated planning evidence unavailable');
    return r.data;
  };
  const [env, sub, snapshot, sessions, logs, games, bunts, tasks, signals, findings, clips, recurring, adjustments, principles, side, arm] = await Promise.all([
    db.rpc('get_athlete_context_envelope',{p_user:uid}),
    db.from('subscriptions').select('status,subscribed_modules').eq('user_id',uid).maybeSingle(),
    db.from('athlete_plan_snapshots').select('payload,updated_at').eq('user_id',uid).eq('sport',sport).eq('plan_date',date).maybeSingle(),
    db.from('performance_sessions').select('id,session_date,sport,module,session_type,drill_blocks,micro_layer_data').eq('user_id',uid).eq('sport',sport).is('deleted_at',null).gte('session_date',since).lt('session_date',date).limit(1000),
    db.from('wk_session_logs').select('id,plan_date,duration_seconds_completed,rpe,metrics').eq('user_id',uid).gte('plan_date',practiceSince).lt('plan_date',date).contains('metrics',{kind:'practice',sport}).limit(1000),
    db.from('gp_games').select('id,game_date,status').eq('user_id',uid).eq('sport',sport).is('deleted_at',null).eq('ignored_for_training',false).gte('game_date',since).lt('game_date',date).in('status',['completed','final']).limit(1000),
    db.from('wk_movement_catalog').select('slug,name,cue,is_active,dosage_unit,equipment_requirements,equipment,equipment_alternatives,sport_scope,min_age_years,season_eligibility,visible_to').like('slug','bunt_%').eq('is_active',true).limit(1000),
    db.from('hammer_daily_task_completions').select('id,payload').eq('user_id',uid).eq('source','block_drill').gte('plan_date',since).lt('plan_date',date).limit(1000),
    db.from('wk_fault_signals').select('*').eq('user_id',uid).eq('source','video_analysis').lte('observed_at',`${date}T23:59:59Z`).order('observed_at',{ascending:false}).limit(501),
    db.from('analysis_fault_findings').select('*').eq('user_id',uid).lte('created_at',`${date}T23:59:59Z`).order('created_at',{ascending:false}).limit(501),
    db.rpc('get_my_plan_clip_evidence',{p_sport:sport}),
    db.from('athlete_recurring_issues').select('*').eq('user_id',uid).eq('sport',sport).limit(200),
    db.from('athlete_plan_adjustments').select('*').eq('user_id',uid).or(`plan_date.eq.${date},scope.eq.always`).order('created_at',{ascending:false}).limit(1000),
    db.rpc('active_principle_picks'),
    db.from('athlete_side_preferences').select('*').eq('user_id',uid).maybeSingle(),
    db.from('arm_ledger_entries').select('entry_date,source,throw_type,count,status').eq('user_id',uid).gte('entry_date',isoShift(date,-730)).lte('entry_date',date).limit(5000),
  ]);
  for(const r of [env,sub,snapshot,side])if(r.error)throw r.error;
  if(!env.data)throw new Error('Dated athlete context unavailable');
  const sessionRows=complete(sessions), logRows=complete(logs), gameRows=complete(games);
  const clipRows=complete(clips,501).filter((c:any)=>Date.parse(c.created_at)<=day.getTime()).map((c:any)=>({video_id:c.id,user_id:c.user_id,sport:c.sport,module:c.module,created_at:c.created_at,violations:c.violations}));
  const faults=planFaultContext(complete(signals,501),complete(findings,501),clipRows,uid,sport,day.getTime());
  const issues=complete(recurring,200).filter((r:any)=>Date.parse(r.last_seen)<=day.getTime());
  const ids=gameRows.map((g:any)=>g.id);
  const [abs,pitches,defense]=ids.length?await Promise.all([
    db.from('gp_at_bats').select('id,game_id,result').eq('user_id',uid).in('game_id',ids).limit(1000),
    db.from('gp_pitches').select('id,game_id,perspective,result,location,bunt_side,bunt_type,bunt_success').eq('user_id',uid).in('game_id',ids).limit(1000),
    db.from('gp_defense_plays').select('game_id,position,error_flag').eq('user_id',uid).in('game_id',ids).limit(1000),
  ]):[{data:[],error:null},{data:[],error:null},{data:[],error:null}];
  const abRows=complete(abs), pitchRows=complete(pitches), defenseRows=complete(defense);
  const circulation=await readDrillCirculation({owner:db.from('owner_drills').select('*').limit(1000),usage:db.rpc('drill_usage_totals'),events:db.from('drill_engagement').select('drill_id,event,created_at').eq('user_id',uid).lt('created_at',`${date}T00:00:00Z`).in('event',['served','completed']).limit(1000)});
  // Per-request setters are synchronous immediately before the pure builder; no await can mix accounts.
  const envelope={...env.data};
  const entry=(value:unknown,source:string)=>({value,source,owner:'canonical',confidence:'derived',missing:value==null,last_updated:null});
  envelope.equipment_effective=entry(input.equipment,'dated equipment resolver');
  envelope.injury_history=entry([envelope.injury_history?.value,...input.injuries].filter(Boolean),'canonical active injury/context');
  const age=ageFromDob(input.birthday,date);
  const extra=['date_of_birth','readiness','age_years'].map(key=>({key,label:key,domain:'identity',value:key==='readiness'?input.readiness:key==='age_years'?age:input.birthday,source:key==='readiness'?'canonical rolling/check-in readiness':'profiles.date_of_birth',confidence:'high',missing:(key==='readiness'?input.readiness:key==='age_years'?age:input.birthday)==null,lastUpdated:null,lineage:{owner:'canonical',source:key,rawConfidence:'derived'}}));
  const context=contextFromEnvelope(envelope,extra);
  const modules=sub.data?.status==='active'?(sub.data.subscribed_modules??[]):[];
  const access=priorityAccess(modules,sport);
  const practiceRecords=[...sessionRows.filter((r:any)=>r.session_date>=practiceSince&&['solo_work','team_session','lesson','live_abs'].includes(r.session_type)).map((r:any)=>({id:`performance:${r.id}`,date:r.session_date,sport:r.sport,category:r.module,minutes:null,intensity:null})),...logRows.map((r:any)=>({id:`wk:${r.id}`,date:r.plan_date,sport,category:r.metrics?.modality??null,minutes:r.duration_seconds_completed==null?null:r.duration_seconds_completed/60,intensity:r.rpe??null}))];
  const phase= input.phase.startsWith('os_')?'off':input.phase==='preseason'?'pre':input.phase==='in_season'?'in':input.phase==='post_season'?'post':null;
  const recentIds=new Set(gameRows.filter((g:any)=>g.game_date>=practiceSince).map((g:any)=>g.id));
  const recentPitch=pitchRows.filter((p:any)=>recentIds.has(p.game_id)&&p.perspective==='hitter');
  const isSwing=(p:any)=>['swinging_strike','foul','in_play'].includes(p.result);
  const swings=recentPitch.filter(isSwing),outside=recentPitch.filter((p:any)=>p.location&&!p.location.zone);
  const errors:Record<string,number>={};for(const d of defenseRows)if(recentIds.has(d.game_id)&&d.error_flag&&d.position)errors[d.position]=(errors[d.position]??0)+1;
  const gp={atBats:abRows.filter((r:any)=>recentIds.has(r.game_id)).length,pitchesSeen:recentPitch.length,defensivePlays:defenseRows.filter((r:any)=>recentIds.has(r.game_id)).length,
    whiffPct:swings.length>=20?Math.round(swings.filter((p:any)=>p.result==='swinging_strike').length/swings.length*100):null,
    chasePct:outside.length>=20?Math.round(outside.filter(isSwing).length/outside.length*100):null,miscueClusters:Object.entries(errors).filter(([,n])=>n>=2).map(([position,errors])=>({position,errors}))};
  const posture=input.posture;
  const schedule={todayKinds:[],tomorrowKinds:[],isGameToday:posture==='game',isTournamentToday:posture==='tournament',isCampToday:false,isTravelToday:posture==='travel',hasTeamPracticeToday:posture==='team_practice',isGameTomorrow:input.gameTomorrow,isTournamentTomorrow:false,tournamentWindow:null,tournamentDayLabel:null,postureToday:posture,eventLabel:null,rationale:posture==='normal'?'':`Your saved schedule: ${posture.replace(/_/g,' ')}.`};
  const adjRows=complete(adjustments);
  setOwnerPlanDrills(circulation.rows);
  setWarmupStageOverrides(input.warmupStages);
  const evidence=projectBuntingEvidence(sessionRows,abRows,pitchRows.filter((p:any)=>p.perspective==='hitter'&&['bunt_foul','bunt_in_play'].includes(p.result)),complete(tasks),sport);
  const raw=buildHammerDailyPlan(context,schedule,null,gp,{isSwitchHitter:envelope.bats_hand?.value==='S',isAmbidextrousThrower:envelope.throws_hand?.value==='S'},day,{resolvedSeasonPhase:phase,seasonPhaseSource:'stored',phaseStartedAt:input.phaseStartedAt,subscriptionModules:modules,fullRestDay:input.rest,pitcherOutings:input.outingFacts,practiceRecords,positionOverride:adjRows.find((r:any)=>r.action==='position_worked'&&r.plan_date===date)?.position_code??null,
    alwaysMissingGear:input.alwaysMissingGear??[],armHistory:{rows:complete(arm,5000)},
    bunting:access.hasHitting?{evidence,catalog:complete(bunts),age,userId:uid,phase:input.phase}:undefined});
  const plan=finalizeDatedPlan(raw,{sport,now:day,cnsHigh:input.cns>=7,adjustments:adjRows,clips:clipRows,games:gp,principles:complete(principles),rankedFaults:accessiblePlanFaults(faults.rankedFaults,modules,sport,{clips:clipRows,now:day.getTime()}),signalScopes:faults.signalScopes,recurringIssues:accessibleRecurringIssues(issues,modules,sport),ownedEquipment:new Set(planningGear(input.equipment,input.alwaysMissingGear??[])),catalog:mergeCatalog(ELITE_DRILL_CATALOG,circulation.rows),circulation:{servedToUser:circulation.served,usage:circulation.usage}});
  if(plan.sanity?.ok===false&&!input.rest)throw new Error('Sport day failed structural validation');
  return {payload:{composition_version:'sport_physical_v1',sport,plan_date:date,engine_version:ENGINE_CONTRACT.version,seasonPhase:plan.seasonPhase,physicalPhase:input.phase,restDay:input.rest,weeklyRoadmap:plan.weeklyRoadmap,weeklyTemplate:plan.weeklyTemplate,microcycle:plan.microcycle,roadmap:plan.roadmap,blocks:plan.blocks},expectedSnapshot:snapshot.data?.updated_at??null,engine:ENGINE_CONTRACT.version};
}