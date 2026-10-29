import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { expect, it } from 'vitest';

// Opt-in authenticated regression: only the exact newly created TEST organization.
it.skipIf(!process.env.ORG_APPROVAL_PROOF_SESSION)('new organization stays active after edits without email verification and cannot transfer ownership', async () => {
  const path = process.env.ORG_APPROVAL_PROOF_SESSION;
  if (!path) throw new Error('Missing TEST proof session');
  const session = JSON.parse(readFileSync(path, 'utf8'));
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Missing project public configuration');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  await client.auth.setSession(session);
  const id = '2571a78e-1a11-40aa-b91e-be1f3718a941';
  const { data: before, error } = await client.from('organizations').select('name,owner_user_id,verified,verification_status,email_verified_at').eq('id', id).single();
  if (error || !before || before.owner_user_id !== '142e0f77-0cac-47ab-ae70-eb6738294b08') throw new Error('Not the authorized TEST organization');
  const changed = await client.from('organizations').update({ name: before.name + ' edited', verified: false, verification_status: 'pending' }).eq('id', id).select('verified,verification_status,email_verified_at').single();
  try {
    expect(changed.error).toBeNull();
    expect(changed.data).toEqual({ verified: true, verification_status: 'verified', email_verified_at: null });
    const transfer = await client.from('organizations').update({ owner_user_id: '00000000-0000-0000-0000-000000000000' }).eq('id', id);
    expect(transfer.error?.message).toBe('Organization ownership cannot be changed');
  } finally {
    const restored = await client.from('organizations').update({ name: before.name }).eq('id', id);
    if (restored.error) throw restored.error;
  }
});