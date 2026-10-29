import { checkPrescriptionReplace, type RxReplaceFacts } from '../coach/prescriptionSafety.ts';
import { avoidsMissingGear, ownsAllGear, injuryWords, rememberedMissingGear } from './simpleSwap.ts';
import { ageFromDob } from '../age/ageFromDob.ts';
import { nextThrowDate } from '../wic/phases/nextThrowDate.ts';
import { missingCoachFactWarning, warningKeys, warningsAcknowledged } from '../coach/guidelineWarnings.ts';
import { checkDrillSafety } from '../generated/analysisDrills.mjs';
import { resolvePhaseState } from '../phaseState.ts';
import { seasonWithTimeline } from '../seasonTimeline.ts';

type Row = Record<string, any>;
/** Uses the existing physical-work judge; no coach override or new dose authority. */
export function analysisDrillSafety(drill: Row, block: Row, facts: Row, date: string) {
  const age = ageFromDob(facts.profile?.dob, date);
  if (age == null || !facts.profile?.hammers_today_started_at) throw new Error('Confirm your player details and Start your plan first.');
  if (facts.context.sport_primary !== drill.sport || !drill.sports.includes(drill.sport)) throw new Error('This drill is for a different sport.');
  const owned = new Set<string>((facts.gear ?? []).slice().reverse().find((r: Row) => !r.valid_until || Date.parse(r.valid_until) > Date.now())?.equipment ?? []);
  for (const answer of facts.memory ?? []) {
    for (const g of answer.confirmed_have ?? []) owned.add(g);
    for (const g of answer.confirmed_lacks ?? []) owned.delete(g);
  }
  const missing = rememberedMissingGear(facts.memory ?? []);
  if (!ownsAllGear({ equipment_requirements: drill.equipment }, owned) || !avoidsMissingGear({ equipment_requirements: drill.equipment }, missing)) throw new Error('This drill needs equipment you have not confirmed. Nothing was saved.');
  const ageCheck = checkDrillSafety({ id:drill.id,name:drill.name,module:drill.category,skill_target:drill.subSkill,sport:drill.sport,
    progression_level:drill.progression_level ?? null,requiredEquipment:[] },{ageYears:age,sport:facts.context.sport_primary,equipment:[...owned]});
  if (!ageCheck.ok) throw new Error(ageCheck.reasons.join(' '));
  const phase = resolvePhaseState({settings:seasonWithTimeline(facts.settings,facts.timeline ?? [],date),date,heights:facts.heights ?? []});
  const games = new Set<string>([
    ...(facts.games ?? []).filter((g: Row) => !g.deleted_at && !g.ignored_for_training && !['canceled','cancelled','rescheduled'].includes(g.status)).map((g: Row) => g.game_date),
    ...(facts.calendar ?? []).filter((e: Row) => !e.deleted_at && ['game','tournament','scrimmage'].includes(e.event_type)).map((e: Row) => e.event_date),
  ]);
  const tomorrow = new Date(Date.parse(`${date}T12:00:00Z`) + 86400000).toISOString().slice(0,10);
  const rest = new Date(`${date}T12:00:00Z`).getUTCDay() === 0 || (facts.calendar ?? []).some((e: Row) => !e.deleted_at && e.event_type === 'rest' && e.event_date === date);
  const day = (facts.logs ?? [])[0];
  const injury = injuryWords(facts.context.injury_history).length > 0 || day?.injury_mode === true;
  const readiness = (facts.readiness ?? []).slice().reverse().find((r: Row) => typeof r.payload?.score === 'number')?.payload?.score;
  if (typeof readiness === 'number' && readiness <= 4) throw new Error('Your check-in calls for lighter work. Keep today’s current drill.');
  // This teaching catalog has no certified intensity. Do not pretend a phase label supplies it.
  const declaredIntensity = ['light','standard','high'].includes(drill.intensity) ? drill.intensity : null;
  if (!declaredIntensity && (games.has(date) || phase.season === 'in_season' && games.has(tomorrow) || phase.growth || phase.lighter_week !== 'none')) throw new Error('This drill’s intensity is not confirmed for your current training restrictions. Keep today’s current drill.');
  const replaceFacts: RxReplaceFacts = { category: drill.category, date, intensity: declaredIntensity ?? 'standard',
    throwing: ['pitching','throwing'].includes(drill.category), isRestDay: rest || ['rest','off','injury'].includes(day?.day_status),
    gameOnDate: games.has(date), gameNextDay: games.has(tomorrow), inSeason: phase.season === 'in_season',
    nextThrowDate: nextThrowDate(age, facts.context.competition_level, (facts.arm ?? []).filter((r: Row) => r.entry_date < date), new Date(Date.parse(`${date}T12:00:00Z`)-86400000).toISOString().slice(0,10)),
    injuryMode: injury, hasCard: block.status === 'ready' };
  const verdict = checkPrescriptionReplace(replaceFacts);
  if (verdict.verdict !== 'allow') throw new Error(verdict.reasons.join(' '));
  const warnings = typeof readiness === 'number' ? [] : [missingCoachFactWarning(date, 'check_in')];
  if (!declaredIntensity) warnings.push({code:'missing_facts',date,rule:'This drill’s intensity and workload values are not recorded. Those values could not be checked. Proceed with the same planned amount?'});
  if (drill.progression_level == null) warnings.push({code:'missing_facts',date,rule:'This drill’s age-progression level is not recorded, so the catalog’s usual age check could not be completed. Proceed?'});
  return { equipment:[...owned], warnings, keys: warningKeys(warnings), acknowledged: (keys: unknown) => warningsAcknowledged(warnings, keys) };
}