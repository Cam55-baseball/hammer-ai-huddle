import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Users, Plus, Copy, QrCode } from 'lucide-react';

type Team = { id: string; name: string; sport: string | null; age_group: string | null; level: string | null; invite_code: string | null };

export function teamJoinLink(code: string): string {
  return `${window.location.origin}/join?code=${encodeURIComponent(code)}`;
}

/** Coach Dashboard → "Create team". The app quietly keeps a small organization in the coach's name. */
export function TeamsCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [sport, setSport] = useState('baseball');
  const [age, setAge] = useState('');
  const [qrFor, setQrFor] = useState<string | null>(null);

  const teams = useQuery({
    queryKey: ['my-teams', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('org_teams')
        .select('id, name, sport, age_group, level, invite_code')
        .is('archived_at', null).order('created_at');
      if (error) throw error;
      return (data ?? []) as Team[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('create_solo_team', { _name: name.trim(), _sport: sport, _age_group: age.trim() || null as any });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Team created'); setName(''); setAge(''); setOpen(false); qc.invalidateQueries({ queryKey: ['my-teams'] }); },
    onError: (e: any) => toast.error(e.message ?? 'Could not create team'),
  });

  const copy = (text: string, what: string) => { navigator.clipboard.writeText(text); toast.success(`${what} copied`); };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Users className="h-5 w-5 text-primary" /> My teams</CardTitle>
        <Button size="sm" variant={open ? 'ghost' : 'default'} onClick={() => setOpen((o) => !o)}><Plus className="mr-1 h-4 w-4" /> Create team</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {open && (
          <div className="space-y-2 rounded-lg border p-3">
            <Input placeholder="Team name (e.g. 14U Gold)" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="baseball">Baseball</SelectItem><SelectItem value="softball">Softball</SelectItem></SelectContent>
              </Select>
              <Input placeholder="Age group / level" value={age} onChange={(e) => setAge(e.target.value)} maxLength={30} />
            </div>
            <Button className="w-full" onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>Create</Button>
          </div>
        )}
        {(teams.data ?? []).length === 0 && !open && <p className="text-sm text-muted-foreground">No teams yet. Create one, then share its code with your players.</p>}
        {(teams.data ?? []).map((t) => (
          <div key={t.id} className="rounded-lg border p-3">
            <p className="font-medium">{t.name}</p>
            <p className="text-xs text-muted-foreground">{[t.sport, t.age_group, t.level].filter(Boolean).join(' · ') || 'Team'}</p>
            {t.invite_code && (
              <>
                <p className="mt-2 text-xs text-muted-foreground">Invite code</p>
                <p className="font-mono text-lg tracking-widest">{t.invite_code}</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Button size="sm" variant="outline" onClick={() => copy(t.invite_code!, 'Code')}><Copy className="mr-1 h-3 w-3" /> Code</Button>
                  <Button size="sm" variant="outline" onClick={() => copy(teamJoinLink(t.invite_code!), 'Link')}><Copy className="mr-1 h-3 w-3" /> Link</Button>
                  <Button size="sm" variant="outline" onClick={() => setQrFor(qrFor === t.id ? null : t.id)}><QrCode className="mr-1 h-3 w-3" /> QR</Button>
                </div>
                {qrFor === t.id && (
                  <div className="mt-3 flex justify-center rounded-lg bg-card p-3">
                    <QRCodeSVG value={teamJoinLink(t.invite_code)} size={180} aria-label={`QR code to join ${t.name}`} />
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
