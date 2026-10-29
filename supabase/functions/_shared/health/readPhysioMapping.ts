import { mapPhysio, PHYSIO_SETTING_KEY } from './physioMapping.ts';
/** Call only with the athlete JWT. Health read failures cannot certify a normal day. */
export async function readPhysioMapping(db: any, userId: string, today: string, injuries: unknown) {
  const [health, settings] = await Promise.all([
    db.from('physio_health_profiles').select('active_illness,illness_started_at').eq('user_id',userId).maybeSingle(),
    db.from('app_settings').select('setting_value').eq('setting_key',PHYSIO_SETTING_KEY).maybeSingle(),
  ]);
  if (health.error || settings.error) throw new Error('Could not verify your health safety settings. Try again.');
  return mapPhysio({activeIllness:health.data?.active_illness,illnessStartedAt:health.data?.illness_started_at,injuries,today,defaults:settings.data?.setting_value});
}