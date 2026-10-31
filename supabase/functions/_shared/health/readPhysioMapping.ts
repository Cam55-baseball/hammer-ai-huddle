import { mapPhysio, PHYSIO_SETTING_KEY } from './physioMapping.ts';
import { painRegionsFromLocations } from './fullGo.ts';
/** Call only with the athlete JWT. Health read failures cannot certify a normal day. */
export async function readPhysioMapping(db: any, userId: string, today: string, injuries: unknown) {
  const [health, settings, checkin] = await Promise.all([
    db.from('physio_health_profiles').select('active_illness,illness_started_at').eq('user_id',userId).maybeSingle(),
    db.from('app_settings').select('setting_value').eq('setting_key',PHYSIO_SETTING_KEY).maybeSingle(),
    // Today's check-in pain areas: a healed area that hurts again gets its caution back.
    db.from('vault_focus_quizzes').select('pain_location').eq('user_id',userId).eq('entry_date',today),
  ]);
  if (health.error || settings.error) throw new Error('Could not verify your health safety settings. Try again.');
  const painAreas = checkin.error ? [] : painRegionsFromLocations((checkin.data ?? []).flatMap((r: any) => Array.isArray(r.pain_location) ? r.pain_location : []));
  return mapPhysio({activeIllness:health.data?.active_illness,illnessStartedAt:health.data?.illness_started_at,injuries,today,defaults:settings.data?.setting_value,painAreas});
}
