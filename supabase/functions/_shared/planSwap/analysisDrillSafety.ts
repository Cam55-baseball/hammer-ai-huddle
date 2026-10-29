import { checkPrescriptionReplace, type RxReplaceFacts } from '../coach/prescriptionSafety.ts';
import { avoidsMissingGear, ownsAllGear, injuryWords, rememberedMissingGear } from './simpleSwap.ts';
import { ageFromDob } from '../age/ageFromDob.ts';
import { nextThrowDate } from '../wic/phases/nextThrowDate.ts';
import { missingCoachFactWarning, warningKeys, warningsAcknowledged } from '../coach/guidelineWarnings.ts';

type Row = Record<string, any>;
/** Uses the existing physical-work judge; no coach override or new dose authority. */
export function analysisDrillSafety(drill: Row, block: Row, facts: Row, date: string) {
  const age = ageFromDob(facts.profile?.dob, date);
  if (age == null || !facts.context?.hammers_today_started_at) throw new Error('Confirm your player details and Start your plan first.');
  if (facts.context.sport_primary !== drill.sport || !drill.sports.includes(drill.sport)) throw new Error('This drill is for a different sport.');
  const owned = new Set<string>((facts.gear ?? []).slice().reverse().find((r: Row) => !r.valid_until || Date.parse(r.valid_until) > Date.now())?.equipment ?? []);
  for (const answer of facts.memory ?? []) {
    for (const g of answer.confirmed_have ?? []) owned.add(g);
    for (const g of answer.confirmed_lacks ?? []) owned.delete(g);
  }
  const missing = rememberedMissingGear(facts.memory ?? []);
  if (!ownsAllGear({ equipment_requirements: drill.equipment }, owned) || !avoidsMissingGear({ equipment_requirements: drill.equipment }, missing)) throw new Error('This drill needs equipment you have not confirmed. Nothing was saved.');
  const games = new Set<string>([
    ...(facts.games ?? []).filter((g: Row) => !g.deleted_at && !g.ignored_for_training && !['canceled','cancelled','rescheduled'].includes(g.status)).map((g: Row) => g.game_date),
    ...(facts.calendar ?? []).filter((e: Row) => !e.deleted_at && ['game','tournament','scrimmage'].includes(e.event_type)).map((e: Row) => e.event_date),
  ]);
  const tomorrow = new Date(Date.parse(`${date}T12:00:00Z`) + 86400000).toISOString().slice(0,10);
  const rest = new Date(`${date}T12:00:00Z`).getUTCDay() === 0 || (facts.calendar ?? []).some((e: Row) => !e.deleted_at && e.event_type === 'rest' && e.event_date === date);
  const day = (facts.logs ?? [])[0];
  const injury = injuryWords(facts.context.injury_history).length > 0 || day?.injury_mode === true;
  const replaceFacts: RxReplaceFacts = { category: drill.category, date, intensity: block.phase === 'maintain' ? 'light' : 'standard',
    throwing: ['pitching','throwing'].includes(drill.category), isRestDay: rest || ['rest','off','injury'].includes(day?.day_status),
    gameOnDate: games.has(date), gameNextDay: games.has(tomorrow), inSeason: facts.settings?.season_status === 'in_season',
    nextThrowDate: nextThrowDate(age, facts.context.competition_level, (facts.arm ?? []).filter((r: Row) => r.entry_date < date), new Date(Date.parse(`${date}T12:00:00Z`)-86400000).toISOString().slice(0,10)),
    injuryMode: injury, hasCard: block.status === 'ready' };
  const verdict = checkPrescriptionReplace(replaceFacts);
  if (verdict.verdict !== 'allow') throw new Error(verdict.reasons.join(' '));
  const warnings = (facts.readiness ?? []).length ? [] : [missingCoachFactWarning(date, 'check_in')];
  return { warnings, keys: warningKeys(warnings), acknowledged: (keys: unknown) => warningsAcknowledged(warnings, keys) };
}