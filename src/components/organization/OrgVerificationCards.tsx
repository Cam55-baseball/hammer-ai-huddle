import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/** Compatibility name: optional contact details, never organization validation. */
export function OrgVerificationForm({ org }: { org: any }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ address: org.address ?? '', website: org.website ?? '', official_email: org.official_email ?? '', phone: org.phone ?? '', admin_role_title: org.admin_role_title ?? '' });
  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('submit_org_for_verification', { _organization_id: org.id, _address: f.address, _website: f.website, _official_email: f.official_email, _phone: f.phone, _admin_role_title: f.admin_role_title, _proof_path: null as any });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Details saved'); qc.invalidateQueries({ queryKey: ['organizations'] }); },
    onError: (e: Error) => toast.error(e.message ?? 'Could not save'),
  });
  return <Card>
    <CardHeader><CardTitle className="text-base">Organization details (optional)</CardTitle><p className="text-sm">Active</p></CardHeader>
    <CardContent className="space-y-2">
      {Object.entries(f).map(([key, value]) => <Input key={key} aria-label={key.replace(/_/g, ' ')} placeholder={`${key.replace(/_/g, ' ')} (optional)`} value={value as string} onChange={(e) => setF({ ...f, [key]: e.target.value })} />)}
      <Button className="w-full" disabled={submit.isPending} onClick={() => submit.mutate()}>Save details</Button>
    </CardContent>
  </Card>;
}
