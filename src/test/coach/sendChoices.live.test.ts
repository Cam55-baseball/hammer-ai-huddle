import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { expect, it } from 'vitest';

// Opt-in exact TEST fixture regression; no owner/user session can write this proof.
it.skipIf(!process.env.COACH_SEND_PROOF_SESSION)('Save for later stores saved_for_later on the scheduled day without adding workout rows', async () => {
  const path = process.env.COACH_SEND_PROOF_SESSION;
  if (!path) throw new Error('Missing TEST session');
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Missing public configuration');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const session = JSON.parse(readFileSync(path, 'utf8')).data;
  if (session?.user?.id !== 'db9cc8ef-5b00-48f1-b113-24b7790e4660') throw new Error('Wrong TEST fixture');
  await client.auth.setSession(session);
  const id = process.env.COACH_SEND_PROOF_RX;
  if (!id) throw new Error('Missing exact TEST prescription');
  const before = await client.from('coach_prescriptions').select('id,recipient_id,plan_date,status').eq('id', id).single();
  if (before.error || before.data?.recipient_id !== session.user.id || before.data.status !== 'pending') throw new Error('Fixture must be pending and self-owned');
  const result = await client.functions.invoke('coach-rx-safety', { body: { mode: 'choose', prescription_id: id, choice: 'save_for_later' } });
  expect(result.error).toBeNull();
  expect(result.data).toMatchObject({ applied: true, inserted: 0 });
  const after = await client.from('coach_prescriptions').select('status,plan_date').eq('id', id).single();
  expect(after.error).toBeNull();
  expect(after.data).toEqual({ status: 'saved_for_later', plan_date: before.data.plan_date });
  const rows = await client.from('wk_prescriptions').select('id').eq('user_id', session.user.id).eq('why_payload->>coach_rx', id);
  expect(rows.error).toBeNull();
  expect(rows.data).toEqual([]);
});