export interface AccountStatusProfile { id: string; hammers_today_started_at?: string | null }
export interface AccountPlan { user_id: string; status: string }
export function unifiedSetupComplete(profile: {position?: string|null;height?: string|null;throwing_hand?: string|null;graduation_year?: number|null}) {
  return !!(profile.position && profile.height && profile.throwing_hand && profile.graduation_year);
}
/** Canonical independent facts: payment never implies onboarding or training. */
export function accountStatus(profile: AccountStatusProfile, plans: readonly AccountPlan[], completed: ReadonlySet<string>) {
  return { paid: plans.some(p=>p.user_id===profile.id&&p.status==='active'), started:!!profile.hammers_today_started_at, onboarded:completed.has(profile.id) };
}