import { useState } from 'react';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { SkillDomain } from '@/lib/videoRecommendationEngine';

const DOMAINS: SkillDomain[] = ['hitting', 'fielding', 'throwing', 'base_running', 'pitching'];

export function RuleEngineManager() {
  const qc = useQueryClient();
  const [domain, setDomain] = useState<SkillDomain>('hitting');
  const [movement, setMovement] = useState('');
  const [result, setResult] = useState('');
  const [context, setContext] = useState('');
  const [correction, setCorrection] = useState('');
  const [strength, setStrength] = useState(5);

  const { data: rules = [] } = useQuery({
    queryKey: ['rules-admin', domain],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('video_tag_rules')
        .select('*')
        .eq('skill_domain', domain)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleAdd = async () => {
    if (!movement.trim() || !correction.trim()) return;
    const { error } = await (supabase as any).from('video_tag_rules').insert({
      skill_domain: domain,
      movement_key: movement.trim(),
      result_key: result.trim() || null,
      context_key: context.trim() || null,
      correction_key: correction.trim(),
      strength,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setMovement(''); setResult(''); setContext(''); setCorrection('');
    qc.invalidateQueries({ queryKey: ['rules-admin'] });
    qc.invalidateQueries({ queryKey: ['video-tag-rules'] });
    toast({ title: 'Rule added' });
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from('video_tag_rules').update({ active: false }).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    qc.invalidateQueries({ queryKey: ['rules-admin'] });
    qc.invalidateQueries({ queryKey: ['video-tag-rules'] });
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="font-semibold">Recommendation Rules</h3>
      <p className="text-xs text-muted-foreground">Movement + Result + Context → Correction</p>

      <div className="space-y-2">
        <div className="space-y-1">
          <Label className="text-xs">Skill Domain</Label>
          <Select value={domain} onValueChange={v => setDomain(v as SkillDomain)}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOMAINS.map(d => <SelectItem key={d} value={d} className="text-xs capitalize">{d.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="movement key (required)" value={movement} onChange={e => setMovement(e.target.value)} className="h-8 text-xs" />
          <Input placeholder="result key (optional)" value={result} onChange={e => setResult(e.target.value)} className="h-8 text-xs" />
          <Input placeholder="context key (optional)" value={context} onChange={e => setContext(e.target.value)} className="h-8 text-xs" />
          <Input placeholder="correction key (required)" value={correction} onChange={e => setCorrection(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Strength</Label>
          <Input type="number" min={1} max={10} value={strength} onChange={e => setStrength(Number(e.target.value))} className="h-8 text-xs w-20" />
          <Button size="sm" onClick={handleAdd} className="ml-auto"><Plus className="h-3 w-3 mr-1" />Add Rule</Button>
        </div>
      </div>

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {rules.map((r: any) => (
          <div key={r.id} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/40">
            <div className="flex-1 flex items-center gap-1 flex-wrap">
              <span className="font-medium">{r.movement_key}</span>
              {r.result_key && <span className="text-muted-foreground">+ {r.result_key}</span>}
              {r.context_key && <span className="text-muted-foreground">+ {r.context_key}</span>}
              <ArrowRight className="h-3 w-3 mx-1" />
              <span className="text-primary">{r.correction_key}</span>
              <span className="text-muted-foreground ml-1">({r.strength})</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(r.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {rules.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-4">No rules yet.</p>}
      </div>
    </Card>
  );
}
