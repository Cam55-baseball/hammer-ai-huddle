/** Exact owner-authorized identities only; no arbitrary email or reset path. */
export function freshPersona(key: unknown): { email: string; name: string } | null {
  if (key === 'onboarding18_oct29') return { email: 'hammersmodality+onboarding18oct29@gmail.com', name: 'TEST Onboarding 18' };
  if (key === 'onboarding18_oct29_2303') return { email: 'hammersmodality+onboarding18oct292303@gmail.com', name: 'TEST Onboarding 18 2303' };
  if (key === 'onboarding18_oct29_1545') return { email: 'hammersmodality+onboarding18oct291545@gmail.com', name: 'TEST Onboarding 18 1545' };
  return null;
}