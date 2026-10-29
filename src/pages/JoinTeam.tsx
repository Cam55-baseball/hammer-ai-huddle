import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const REASONS: Record<string, string> = {
  not_found: "That invite code doesn't match a team.",
  not_verified: "This organization wasn't found. Check the invite code.",
  parent_required: 'A parent needs to join for you.',
};

/** Link / QR landing: /join?code=ABC123 */
export default function JoinTeam() {
  const [params] = useSearchParams();
  const { user, loading } = useAuth() as any;
  const nav = useNavigate();
  const ran = useRef(false);
  const [msg, setMsg] = useState('Joining…');
  const code = (params.get('code') ?? '').trim().toUpperCase();

  useEffect(() => {
    if (loading) return;
    if (!user) { nav(`/auth?next=${encodeURIComponent(`/join?code=${code}`)}`); return; }
    if (ran.current || !code) { if (!code) setMsg('No invite code in this link.'); return; }
    ran.current = true;
    supabase.rpc('join_by_invite_code', { _code: code }).then(({ data, error }) => {
      const r = data as { ok: boolean; reason?: string; name?: string } | null;
      if (error) setMsg('Something went wrong. Try again.');
      else if (r?.ok) setMsg(`You joined ${r.name ?? 'the team'}.`);
      else setMsg(REASONS[r?.reason ?? ''] ?? 'Could not join.');
    });
  }, [user, loading, code, nav]);

  return (
    <DashboardLayout>
      <Card className="mx-auto max-w-md"><CardContent className="space-y-3 p-6 text-center">
        <p className="text-lg font-medium">{msg}</p>
        <Button onClick={() => nav('/organization')}>Go to my team</Button>
      </CardContent></Card>
    </DashboardLayout>
  );
}
