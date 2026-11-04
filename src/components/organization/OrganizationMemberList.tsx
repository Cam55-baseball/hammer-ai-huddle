import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrganization } from '@/hooks/useOrganization';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function OrganizationMemberList() {
  const { members } = useOrganization();
  const memberList = members.data ?? [];
  const userIds = memberList.map((m: any) => m.user_id);

  // Fetch profile names from profiles_public view
  const { data: profiles } = useQuery({
    queryKey: ['member-profiles', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      const { data } = await supabase
        .from('profiles_public')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      const out: Record<string, { full_name?: string | null; avatar_url?: string | null }> =
        Object.fromEntries((data ?? []).map(p => [p.id, p]));
      // Organization admins may not see private profiles; fall back to the server-checked roster names.
      const orgIds = [...new Set(memberList.map((m: any) => m.organization_id))];
      for (const orgId of orgIds) {
        const { data: roster } = await supabase.rpc('list_org_roster', { _organization_id: orgId });
        for (const r of (roster ?? []) as { user_id: string; full_name: string }[]) {
          if (!out[r.user_id]?.full_name && r.full_name) out[r.user_id] = { ...out[r.user_id], full_name: r.full_name };
        }
      }
      return out;
    },
    enabled: userIds.length > 0,
  });

  const orgIds = [...new Set(memberList.map((m: any) => m.organization_id as string))];
  const { data: teams } = useQuery({
    queryKey: ['member-teams', orgIds],
    enabled: orgIds.length > 0,
    queryFn: async () => {
      const t = await (supabase as any).from('org_teams').select('id,name').in('organization_id', orgIds).is('archived_at', null);
      if (t.error || !t.data?.length) return {} as Record<string, string[]>;
      const names = new Map<string, string>(t.data.map((r: any) => [r.id, r.name]));
      const tm = await (supabase as any).from('org_team_members').select('team_id,user_id').in('team_id', [...names.keys()]).is('removed_at', null);
      const out: Record<string, string[]> = {};
      for (const r of (tm.data ?? []) as { team_id: string; user_id: string }[]) (out[r.user_id] ??= []).push(names.get(r.team_id) ?? 'Team');
      return out;
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Connections ({memberList.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : memberList.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No members yet.</p>
        ) : (
          <div className="space-y-4">
            {groupMembers(memberList).map(([label, rows]) => (
              <section key={label} aria-label={label} className="space-y-2">
                <h4 className="text-sm font-semibold">{label} ({rows.length})</h4>
                {rows.length === 0 && <p className="text-xs text-muted-foreground">None yet.</p>}
                {rows.map((m: any) => {
                  const profile = profiles?.[m.user_id];
                  const displayName = profile?.full_name || 'Name not shared';
                  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                  const teamNames = teams?.[m.user_id] ?? [];
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile?.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium">{displayName}</p>
                          <p className="text-xs text-muted-foreground">{memberRoleLabel(m.role_in_org)}{teamNames.length ? ` · ${teamNames.join(', ')}` : ' · No team yet'}</p>
                        </div>
                      </div>
                      {m.role_in_org === 'player' && m.status === 'active' && <Button asChild size="sm" variant="outline"><Link to={`/coach/athlete/${m.user_id}`}>Player profile</Link></Button>}
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Owner Nov 4 #3: organization connections grouped by membership role. Pure; tested. */
export function memberGroup(role: string | null | undefined): 'Coaches' | 'Athletes' | 'Staff' {
  if (role === 'coach' || role === 'admin' || role === 'owner') return 'Coaches';
  if (role === 'player') return 'Athletes';
  return 'Staff';
}
export function memberRoleLabel(role: string | null | undefined): string {
  return ({ coach: 'Coach', admin: 'Organization admin · coach', owner: 'Organization owner', player: 'Athlete' } as Record<string, string>)[role ?? ''] ?? 'Staff';
}
export function groupMembers<T extends { role_in_org?: string | null }>(rows: T[]): [string, T[]][] {
  const g: Record<string, T[]> = { Coaches: [], Athletes: [], Staff: [] };
  for (const r of rows) g[memberGroup(r.role_in_org)].push(r);
  return (Object.entries(g) as [string, T[]][]).filter(([k, v]) => k !== 'Staff' || v.length > 0);
}
