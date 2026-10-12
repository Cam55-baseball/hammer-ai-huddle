import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Send, CheckCircle2, Dumbbell, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useCoachPlayerPool } from '@/hooks/useCoachPlayerPool';
import { useAssignDrill, useCoachAssignments } from '@/hooks/useDrillAssignments';
import {
  checkDrillSafety,
  findSafeAlternatives,
  type DrillSafetyInput,
  type AthleteSafetyContext,
} from '@/lib/coach/drillSafety';

const PROGRESSION_LABELS: Record<number, string> = {
  1: 'Tee Ball', 2: 'Youth', 3: 'MS', 4: 'HS', 5: 'College', 6: 'Pro', 7: 'Elite',
};

export function CoachDrillAssign() {
  const [search, setSearch] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedDrillId, setSelectedDrillId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  const { data: drills, isLoading } = useQuery({
    queryKey: ['coach-drill-library'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drills')
        .select('*')
        .eq('is_published', true)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Required equipment per drill (for the safety check).
  const { data: equipRows } = useQuery({
    queryKey: ['coach-drill-equipment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drill_equipment')
        .select('drill_id, equipment')
        .eq('required', true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const safetyDrills: DrillSafetyInput[] = (drills ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    module: d.module ?? null,
    skill_target: (d as any).skill_target ?? null,
    sport: d.sport ?? null,
    progression_level: d.progression_level ?? null,
    requiredEquipment: (equipRows ?? [])
      .filter((e) => e.drill_id === d.id)
      .map((e) => e.equipment),
  }));

  // Selected player's safety context: age, sport, owned equipment.
  const { data: athleteCtx } = useQuery({
    queryKey: ['coach-drill-safety-ctx', selectedPlayerId],
    enabled: !!selectedPlayerId,
    queryFn: async (): Promise<AthleteSafetyContext> => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('date_of_birth')
        .eq('id', selectedPlayerId)
        .maybeSingle();
      const { data: ctx } = await supabase
        .from('athlete_context')
        .select('sport_primary')
        .eq('user_id', selectedPlayerId)
        .maybeSingle();
      const { data: eq } = await supabase
        .from('athlete_equipment_context')
        .select('equipment')
        .eq('user_id', selectedPlayerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      let ageYears: number | null = null;
      if (prof?.date_of_birth) {
        const dob = new Date(prof.date_of_birth);
        ageYears = Math.floor((Date.now() - dob.getTime()) / (365.25 * 86400 * 1000));
      }
      return {
        ageYears,
        sport: (ctx as any)?.sport_primary ?? null,
        equipment: (eq?.equipment as string[]) ?? [],
      };
    },
  });

  const { data: players } = useCoachPlayerPool();
  const assignMutation = useAssignDrill();
  const { data: myAssignments } = useCoachAssignments();

  const filtered = drills?.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.module.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const handleAssignClick = (drillId: string) => {
    setSelectedDrillId(drillId);
    setSelectedPlayerId('');
    setAssignNotes('');
    setAssignDialogOpen(true);
  };

  const handleAssign = () => {
    if (!selectedDrillId || !selectedPlayerId) return;
    assignMutation.mutate(
      { drillId: selectedDrillId, playerId: selectedPlayerId, notes: assignNotes },
      {
        onSuccess: () => {
          toast.success('Drill assigned to player');
          setAssignDialogOpen(false);
        },
        onError: () => toast.error('Failed to assign drill'),
      }
    );
  };

  const selectedDrill = drills?.find(d => d.id === selectedDrillId);
  const selectedSafetyDrill = safetyDrills.find(d => d.id === selectedDrillId);
  const safety =
    selectedSafetyDrill && athleteCtx && selectedPlayerId
      ? checkDrillSafety(selectedSafetyDrill, athleteCtx)
      : null;
  const alternatives =
    safety && !safety.ok && selectedSafetyDrill && athleteCtx
      ? findSafeAlternatives(safetyDrills, selectedSafetyDrill, athleteCtx)
      : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Assign Drills to Players
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search drills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse">Loading drills...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No drills found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drill</TableHead>
                    <TableHead className="hidden sm:table-cell">Sport</TableHead>
                    <TableHead className="hidden md:table-cell">Level</TableHead>
                    <TableHead className="hidden md:table-cell">Module</TableHead>
                    <TableHead className="w-[100px]">Assign</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((drill) => (
                    <TableRow key={drill.id}>
                      <TableCell className="font-medium max-w-[200px]">
                        <div className="truncate">{drill.name}</div>
                        {drill.description && (
                          <div className="text-xs text-muted-foreground truncate">{drill.description}</div>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell capitalize">{drill.sport}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="text-[10px]">
                          {PROGRESSION_LABELS[drill.progression_level] ?? 'HS'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell capitalize">{drill.module}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => handleAssignClick(drill.id)}>
                          <Send className="h-3.5 w-3.5" />
                          Assign
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Assignments */}
      {myAssignments && myAssignments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Recent Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myAssignments.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                  <div>
                    <span className="font-medium">{a.drill_name}</span>
                    <span className="text-muted-foreground ml-2">→ {a.coach_name}</span>
                  </div>
                  {a.completed && (
                    <Badge variant="default" className="text-[10px] gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Done
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Drill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDrill && (
              <div className="p-3 rounded-md bg-muted/50">
                <p className="font-medium">{selectedDrill.name}</p>
                {selectedDrill.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedDrill.description}</p>
                )}
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Select Player</label>
              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a player..." />
                </SelectTrigger>
                <SelectContent>
                  {(players || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.position ? `(${p.position})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {safety && !safety.ok && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  Not safe to assign to this player
                </p>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  {safety.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                {alternatives.length > 0 && (
                  <div className="pt-1">
                    <p className="text-xs font-medium mb-1">Safe alternatives:</p>
                    <div className="flex flex-wrap gap-1">
                      {alternatives.map((a) => (
                        <Button
                          key={a.id}
                          size="sm"
                          variant="secondary"
                          className="text-xs"
                          onClick={() => setSelectedDrillId(a.id)}
                        >
                          {a.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
              <Textarea
                placeholder="Focus on quick hands..."
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedPlayerId || assignMutation.isPending || (safety !== null && !safety.ok)}
            >
              {assignMutation.isPending ? 'Assigning...' : 'Assign Drill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
