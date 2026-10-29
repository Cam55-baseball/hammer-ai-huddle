import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

/** Exact-email invite uses the existing organization-coach request and acceptance flow. */
export function InviteCoach({ orgId }: { orgId: string }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const send = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc('invite_org_coach_by_email', { _organization_id: orgId, _email: email.trim() });
      if (error) throw error;
      toast.success('Coach invited — they can accept in Requests');
      setEmail('');
      qc.invalidateQueries({ queryKey: ['my-requests'] });
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not invite the coach'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-3">
    <h2 className="text-base font-semibold">Add a coach</h2>
    <Label htmlFor="invite-coach-email">Coach account email</Label>
    <Input id="invite-coach-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
    <Button disabled={!email.trim() || busy} onClick={send}><UserPlus className="mr-2 h-4 w-4" />{busy ? 'Sending…' : 'Invite coach'}</Button>
  </section>;
}