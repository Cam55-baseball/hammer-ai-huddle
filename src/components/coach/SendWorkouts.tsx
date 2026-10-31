import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useSentActivities } from '@/hooks/useSentActivities';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { BulkSendDialog } from './BulkSendDialog';
import { CoachCardTemplates } from './CoachCardTemplates';
import { Send } from 'lucide-react';

export function SendWorkouts() {
  const { user } = useAuth();
  const { followedPlayers, loadingPlayers, fetchFollowedPlayers } = useSentActivities();
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  useEffect(() => { void fetchFollowedPlayers(); }, [fetchFollowedPlayers]);
  const teams = useQuery({ queryKey: ['send-workout-teams', user?.id], enabled: !!user, queryFn: async () => {
    const result = await supabase.from('org_teams').select('id, name').is('archived_at', null).order('name');
    if (result.error) throw result.error;
    return result.data;
  }});
  const pickTeam = async (id: string) => {
    const result = await supabase.from('org_team_members').select('user_id').eq('team_id', id).eq('seat', 'player').is('removed_at', null);
    if (result.error) return;
    const available = new Set(followedPlayers.map(player => player.id));
    setSelected((result.data ?? []).map(row => row.user_id).filter(id => available.has(id)));
  };
  return <section aria-label="Send workouts" className="space-y-4">
    <h2 className="text-xl font-bold">Send workouts</h2>
    <Input aria-label="Find a player to send to" placeholder="Find a player…" value={search} onChange={event => setSearch(event.target.value)} />
    <select aria-label="Pick a team" defaultValue="" onChange={event => void pickTeam(event.target.value)} className="w-full rounded-md border border-input bg-background p-2 text-sm"><option value="">Pick a team</option>{teams.data?.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
    <div className="max-h-72 space-y-2 overflow-y-auto">
      {loadingPlayers ? <p role="status">Loading players…</p> : followedPlayers.filter(player => (player.full_name ?? '').toLowerCase().includes(search.toLowerCase())).map(player => <label key={player.id} className="flex items-center gap-3 border-b border-border py-3"><Checkbox aria-label={`Select ${player.full_name}`} checked={selected.includes(player.id)} onCheckedChange={checked => setSelected(previous => checked ? [...new Set([...previous, player.id])] : previous.filter(id => id !== player.id))}/><span className="text-sm">{player.full_name}</span></label>)}
    </div>
    <Button disabled={!selected.length} onClick={() => setOpen(true)}><Send className="mr-2 h-4 w-4"/>Build workout ({selected.length})</Button>
    <CoachCardTemplates/>
    <BulkSendDialog open={open} onOpenChange={setOpen} selectedPlayerIds={selected} selectedPlayerNames={followedPlayers.filter(player => selected.includes(player.id)).map(player => player.full_name ?? 'Player')}/>
  </section>;
}