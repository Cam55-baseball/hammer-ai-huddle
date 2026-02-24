import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProfessionalStatus } from '@/hooks/useProfessionalStatus';
import { Briefcase, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ContractStatusCard() {
  const { data: status, isLoading, updateStatus } = useProfessionalStatus();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    contract_status: status?.contract_status ?? '',
    current_league: status?.current_league ?? '',
    current_team: status?.current_team ?? '',
    mlb_seasons_completed: status?.mlb_seasons_completed ?? 0,
    ausl_seasons_completed: status?.ausl_seasons_completed ?? 0,
  });

  const handleSave = async () => {
    try {
      await updateStatus.mutateAsync(form);
      toast({ title: 'Updated', description: 'Professional status saved.' });
      setEditing(false);
    } catch {
      toast({ title: 'Error', description: 'Failed to update.', variant: 'destructive' });
    }
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Professional Status
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
            {editing ? 'Cancel' : 'Edit'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-2">
            <Select value={form.contract_status} onValueChange={v => setForm(f => ({ ...f, contract_status: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Contract Status" /></SelectTrigger>
              <SelectContent>
                {['active', 'free_agent', 'released', 'retired', 'amateur'].map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="League" value={form.current_league} onChange={e => setForm(f => ({ ...f, current_league: e.target.value }))} className="h-8 text-xs" />
              <Input placeholder="Team" value={form.current_team} onChange={e => setForm(f => ({ ...f, current_team: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">MLB Seasons</label>
                <Input type="number" value={form.mlb_seasons_completed} onChange={e => setForm(f => ({ ...f, mlb_seasons_completed: Number(e.target.value) }))} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">AUSL Seasons</label>
                <Input type="number" value={form.ausl_seasons_completed} onChange={e => setForm(f => ({ ...f, ausl_seasons_completed: Number(e.target.value) }))} className="h-8 text-xs" />
              </div>
            </div>
            <Button onClick={handleSave} disabled={updateStatus.isPending} size="sm" className="w-full">
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Contract</p>
              <p className="font-medium capitalize">{status?.contract_status?.replace('_', ' ') || 'Not Set'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">League / Team</p>
              <p className="font-medium">{status?.current_league || '—'} / {status?.current_team || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">MLB Seasons</p>
              <p className="font-medium">{status?.mlb_seasons_completed ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">AUSL Seasons</p>
              <p className="font-medium">{status?.ausl_seasons_completed ?? 0}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
