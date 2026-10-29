import { ELITE_DRILL_CATALOG, mergeCatalog, categoryGoals, matchGoalDrills, analysisDrillCategory, analysisDrillSlot, enrolledDrill, enrollmentBecause, applyAnalysisDrillRotation } from '../generated/analysisDrills.mjs';
import { analysisDrillSafety } from './analysisDrillSafety.ts';
import { isPlatformStaff } from '../authGuards.ts';
import { needsTeenWaiver, ageOn } from '../legal/teenWaiverRules.ts';
type Row = Record<string, any>;
const checked = async (query: any) => { const result = await query; if (result.error) throw result.error; return result.data; };

/** Self-only action. Selection is checked from the report, never accepted from client prose. */
export async function addAnalysisDrill(client: any, admin: any, uid: string, input: Row, rotation = false) {
  const date = input.planDate;
  if (!rotation && date !== new Date().toISOString().slice(0,10)) throw new Error('Open today’s plan before adding this drill.');
  const [video, snapshot, owners, safety, staff] = await Promise.all([
    checked(admin.from('videos').select('id,user_id,sport,module,status,created_at,temporary_until,ai_analysis').eq('id',input.videoId).eq('user_id',uid).maybeSingle()),
    checked(client.from('athlete_plan_snapshots').select('*').eq('user_id',uid).eq('plan_date',date).eq('sport',input.sport).maybeSingle()),
    checked(client.from('owner_drills').select('*')),
    checked(admin.rpc('analysis_drill_safety_revision',{p_user:uid,p_date:date})),
    isPlatformStaff(admin,uid),
  ]);
  if (!video || video.status !== 'completed' || video.sport !== input.sport || video.temporary_until && Date.parse(video.temporary_until) <= Date.now()) throw new Error('The original analysis is no longer available.');
  if (!snapshot) throw new Error('Open today’s plan first, then return to this report.');
  if (!staff && !(safety.subscription ?? []).some((s: Row) => s.status === 'active' && (!s.current_period_end || Date.parse(s.current_period_end)>Date.now()) &&
    (s.subscribed_modules ?? []).some((m: string) => m === `${input.sport}_${video.module}` || m === `${input.sport}_golden2way` || m === `${input.sport}_5tool` && video.module !== 'pitching'))) throw new Error('This skill is not included in your current plan.');
  if (needsTeenWaiver(ageOn(safety.profile?.dob,new Date()))) {
    const waiver = await checked(client.functions.invoke('teen-parent-waiver',{body:{action:'status'}}));
    if (waiver?.locked) throw new Error('A parent needs to sign before physical training can be changed.');
  }
  const catalog = mergeCatalog(ELITE_DRILL_CATALOG,owners ?? []);
  const drill = catalog.find((d: Row) => d.id === input.drillId && d.category === video.module && d.sports.includes(input.sport));
  if (!drill) throw new Error('This drill is no longer available.');
  if (drill.ownerRowId) {
    // Keep owner content on its existing ownerPlanDrills route; metadata alone is not certification.
    throw new Error('This owner drill needs its declared Hammers Today placement before it can be added. Keep it in Saved drills.');
  }
  const violations = video.ai_analysis?.violations_detected ?? {};
  const findings = await checked(admin.from('analysis_fault_findings').select('fault_key').eq('user_id',uid).eq('video_id',video.id).eq('sport',input.sport));
  const faultKey = drill.violationKeys.find((key: string) => violations[key] === true || findings?.some((f: Row) => f.fault_key === key));
  const goals = categoryGoals(safety.context?.category_goals,video.module,input.sport,safety.context?.position_primary);
  const goal = matchGoalDrills([drill],goals,video.module,input.sport)[0]?.reasons[0]?.replace(/^Your goal: /,'');
  if (!faultKey && !goal) throw new Error('This drill could not be linked to this clip or your saved goals.');
  const block = snapshot.payload?.blocks?.find((b: Row) => analysisDrillCategory(b) === video.module && b.status === 'ready');
  if (!block) throw new Error('There is no safe card for this category today. Keep it in Saved drills.');
  const index = analysisDrillSlot(block.drills);
  if (index < 0) throw new Error('Today’s work has no changeable drill slot. Keep this drill saved.');
  const source = block.drills[index];
  if (source.analysisEnrollment?.drillId === drill.id) return {saved:true,because:'Already in your fix-it slot.'};
  const safetyResult = analysisDrillSafety({...drill,sport:input.sport},block,safety,date);
  if (!safetyResult.acknowledged(input.acknowledged ?? [])) return { saved:false, warnings:safetyResult.warnings, warningKeys:safetyResult.keys };
  const enrollment = {sport:input.sport,category:video.module,drill_id:drill.id,video_id:video.id,issue_key:faultKey ? `fault:${faultKey}` : `goal:${goal}`,fault_key:faultKey ?? null,goal_label:goal ?? null,observed_at:video.created_at,created_at:new Date().toISOString()};
  const replacement = enrolledDrill(source,drill,enrollment);
  const because = enrollmentBecause(enrollment,drill.name);
  const result = await checked(admin.rpc('wk_analysis_drill_atomic',{p_user:uid,p_date:date,p_id:snapshot.id,p_sport:input.sport,p_modality:block.modality,p_index:index,p_expected:source,p_replacement:replacement,
    p_enrollment:{...enrollment,because},p_expected_updated:snapshot.updated_at,p_safety:safety,p_warnings:safetyResult.warnings}));
  if (result?.saved !== true) throw new Error('The save was not confirmed.');
  return {...result,because};
}

/** Called only after the existing builder saved a new baseline day; no client-authored drill choices. */
export async function rotateAnalysisDrills(client:any,admin:any,uid:string,input:Row) {
  const enrollments = await checked(client.from('analysis_drill_enrollments').select('*').eq('user_id',uid).eq('sport',input.sport));
  if (!enrollments?.length) return {saved:true,rotated:0};
  const [snapshot,clips,owners] = await Promise.all([
    checked(client.from('athlete_plan_snapshots').select('payload').eq('user_id',uid).eq('plan_date',input.planDate).eq('sport',input.sport).maybeSingle()),
    checked(client.rpc('get_my_plan_clip_evidence',{p_sport:input.sport})),checked(client.from('owner_drills').select('*')),
  ]);
  if (!snapshot || clips?.length >=501) throw new Error('The complete saved plan and analysis history could not be checked.');
  const catalog=mergeCatalog(ELITE_DRILL_CATALOG,owners ?? []);
  const candidates=applyAnalysisDrillRotation({blocks:snapshot.payload.blocks,enrollments,catalog,sport:input.sport,equipment:catalog.flatMap((d:Row)=>d.equipment),
    clips:(clips ?? []).map((c:Row)=>({video_id:c.id,module:c.module,created_at:c.created_at,violations:c.violations}))});
  let rotated=0;
  for(const block of candidates) {
    const selected=block.drills.find((d:Row)=>d.analysisEnrollment);
    if(!selected) continue;
    const e=enrollments.find((e:Row)=>e.drill_id===selected.analysisEnrollment.drillId);
    if(!e)continue;
    // New days do not inherit yesterday's warning acknowledgements. Retain the legal baseline on any refusal.
    try {const result=await addAnalysisDrill(client,admin,uid,{videoId:e.video_id,drillId:e.drill_id,sport:input.sport,planDate:input.planDate,acknowledged:[]},true);if(result.saved)rotated++;}
    catch { /* Existing baseline stays; no restriction is waived. */ }
  }
  return {saved:true,rotated};
}