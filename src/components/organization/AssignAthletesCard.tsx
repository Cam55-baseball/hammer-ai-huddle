import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserCheck } from 'lucide-react';
import { fetchCoachPrograms } from '@/lib/coachPrograms';

type Row = { user_id: string; full_name: string; role_in_org: string; assigned_coaches: string[] };

export function splitRoster(rows: Row[]) {
  return {
    coaches: rows.filter((r) => r.role_in_org === 'coach' || r.role_in_org === 'admin' || r.role_in_org === 'owner'),
    athletes: rows.filter((r) => r.role_in_org === 'player'),
  };
}

/** Organization admin: choose a coach, tick athletes, assign or remove. Coaches see only athletes assigned here. */
export function AssignAthletesCard({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const [coach, setCoach] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const q = useQuery({
    queryKey: ['org-roster', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_org_roster', { _organization_id: orgId });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
  const { coaches, athletes } = useMemo(() => splitRoster(q.data ?? []), [q.data]);
  const progs = useQuery({ queryKey: ['coach-programs', coaches.map((c) => c.user_id).join()], enabled: coaches.length > 0, queryFn: () => fetchCoachPrograms(coaches.map((c) => c.user_id)) });
  const label = (id: string, name: string) => { const a = progs.data?.get(id)?.age_groups; return a?.length ? `${name} · Coaches: ${a.join(', ')}` : name; };
  const run = useMutation({
    mutationFn: async (assign: boolean) => {
      const { error } = await supabase.rpc('assign_athletes', {
        _organization_id: orgId, _coach: coach, _athletes: [...picked], _assign: assign,
      });
      if (error) throw error;
    },
    onSuccess: (_d, assign) => {
      toast.success(assign ? 'Assigned — the coach can see them now' : 'Removed — access is off now');
      setPicked(new Set()); qc.invalidateQueries({ queryKey: ['org-roster', orgId] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not save'),
  });
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><UserCheck className="h-5 w-5 text-primary" /> Assign athletes to coaches</CardTitle>
        <p className="text-sm text-muted-foreground">Coaches only see the athletes you assign them.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={coach} onValueChange={setCoach}>
          <SelectTrigger><SelectValue placeholder="Pick a coach" /></SelectTrigger>
          <SelectContent>{coaches.map((c) => <SelectItem key={c.user_id} value={c.user_id}>{label(c.user_id, c.full_name)}</SelectItem>)}</SelectContent>
        </Select>
        {athletes.length === 0 && <p className="text-sm text-muted-foreground">No athletes in this organization yet.</p>}
        <div className="space-y-1">
          {athletes.map((a) => (
            <label key={a.user_id} className="flex items-center gap-2 rounded border p-2 text-sm">
              <Checkbox checked={picked.has(a.user_id)} onCheckedChange={() => toggle(a.user_id)} />
              <span className="flex-1">{a.full_name}</span>
              {coach && a.assigned_coaches.includes(coach) && <span className="text-xs text-primary">Assigned</span>}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button disabled={!coach || picked.size === 0 || run.isPending} onClick={() => run.mutate(true)}>Assign ({picked.size})</Button>
          <Button variant="outline" disabled={!coach || picked.size === 0 || run.isPending} onClick={() => run.mutate(false)}>Remove</Button>
        </div>
      </CardContent>
    </Card>
  );
}
