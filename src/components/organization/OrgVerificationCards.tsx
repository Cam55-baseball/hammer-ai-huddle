import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';

/** Owner 2026-10-16: organizations are active right away; no owner review. */
export function OrgVerificationForm({ org }: { org: any }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    address: org.address ?? '', website: org.website ?? '', official_email: org.official_email ?? '',
    phone: org.phone ?? '', admin_role_title: org.admin_role_title ?? '',
  });
  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('submit_org_for_verification', {
        _organization_id: org.id, _address: f.address, _website: f.website, _official_email: f.official_email,
        _phone: f.phone, _admin_role_title: f.admin_role_title, _proof_path: null as any,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Details saved'); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message ?? 'Could not save'),
  });
  const ready = f.address && f.official_email.includes('@') && f.admin_role_title;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-5 w-5 text-primary" /> Organization details</CardTitle>
        <p className="text-sm">Status: <span className="font-medium">Active — you can add athletes and staff</span></p>
      </CardHeader>
      {!org.official_email && (
        <CardContent className="space-y-2">
          <Input placeholder="Street address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          <Input placeholder="Website (optional)" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
          <Input type="email" placeholder="Official email (on your organization's domain)" value={f.official_email} onChange={(e) => setF({ ...f, official_email: e.target.value })} />
          <Input placeholder="Phone (optional)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <Input placeholder="Your title (e.g. Director)" value={f.admin_role_title} onChange={(e) => setF({ ...f, admin_role_title: e.target.value })} />
          <Button className="w-full" disabled={!ready || submit.isPending} onClick={() => submit.mutate()}>Save details</Button>
        </CardContent>
      )}
      {org.official_email && !org.email_verified_at && status !== 'verified' && <EmailCodeBox org={org} />}
      {org.email_verified_at && <CardContent className="pt-0 text-sm text-muted-foreground">Official email confirmed.</CardContent>}
    </Card>
  );
}

const CODE_REASON: Record<string, string> = {
  wrong: "That code isn't right. Check the email and try again.",
  expired: 'That code ran out. Ask for a new one.',
  too_many: 'Too many tries. Ask for a new code.',
};

function EmailCodeBox({ org }: { org: any }) {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const call = async (mode: 'send' | 'confirm') => {
    const { data, error } = await supabase.functions.invoke('org-email-code', { body: { mode, organization_id: org.id, code } });
    if (error) { toast.error((data as any)?.error ?? 'Could not do that. Try again in a minute.'); return; }
    if (mode === 'send') toast.success(`Code sent to ${org.official_email}`);
    else if ((data as any)?.ok) { toast.success('Official email confirmed'); qc.invalidateQueries(); }
    else toast.error(CODE_REASON[(data as any)?.reason] ?? 'Could not confirm');
  };
  return (
    <CardContent className="space-y-2 border-t pt-3">
      <p className="text-sm">Confirm your official email: we send a 6-digit code to <span className="font-medium">{org.official_email}</span>.</p>
      <Button variant="outline" className="w-full" onClick={() => call('send')}>Send me a code</Button>
      <div className="flex gap-2">
        <Input inputMode="numeric" maxLength={6} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
        <Button disabled={code.length !== 6} onClick={() => call('confirm')}>Confirm</Button>
      </div>
    </CardContent>
  );
}

type Pending = { id: string; name: string; org_type: string | null; address: string | null; website: string | null;
  official_email: string | null; phone: string | null; admin_role_title: string | null; email_confirmed: boolean;
  submitted_at: string | null; owner_name: string | null };

/** Owner/admin: approve or reject organizations waiting for verification. */
export function OrgVerificationQueue() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['org-verification-queue'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_org_pending_verification');
      if (error) throw error;
      return (data ?? []) as Pending[];
    },
  });
  const review = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase.rpc('review_org_verification', { _organization_id: id, _approve: approve });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries({ queryKey: ['org-verification-queue'] }); },
    onError: (e: any) => toast.error(e.message ?? 'Could not save'),
  });
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Organizations waiting for verification ({q.data?.length ?? 0})</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {(q.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nothing waiting.</p>}
        {(q.data ?? []).map((o) => (
          <div key={o.id} className="space-y-1 rounded-lg border p-3 text-sm">
            <p className="font-medium">{o.name} <Badge variant="outline">{o.org_type ?? 'organization'}</Badge></p>
            <p>Submitted by: {o.owner_name ?? 'Unknown'} ({o.admin_role_title ?? 'no title'})</p>
            <p>Address: {o.address ?? 'Not given'}</p>
            <p>Website: {o.website || 'Not given'}</p>
            <p>Official email: {o.official_email ?? 'Not given'} — {o.email_confirmed ? 'confirmed' : 'not confirmed yet'}</p>
            <p>Phone: {o.phone || 'Not given'}</p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button size="sm" onClick={() => review.mutate({ id: o.id, approve: true })}>Approve</Button>
              <Button size="sm" variant="outline" onClick={() => review.mutate({ id: o.id, approve: false })}>Reject</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
