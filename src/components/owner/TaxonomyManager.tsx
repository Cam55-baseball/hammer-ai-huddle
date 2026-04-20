import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { TagLayer, SkillDomain } from '@/lib/videoRecommendationEngine';

const LAYERS: TagLayer[] = ['movement_pattern', 'result', 'context', 'correction'];
const DOMAINS: SkillDomain[] = ['hitting', 'fielding', 'throwing', 'base_running', 'pitching'];

export function TaxonomyManager() {
  const qc = useQueryClient();
  const [layer, setLayer] = useState<TagLayer>('movement_pattern');
  const [domain, setDomain] = useState<SkillDomain>('hitting');
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');

  const { data: tags = [] } = useQuery({
    queryKey: ['taxonomy-admin', layer, domain],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('video_tag_taxonomy')
        .select('*')
        .eq('layer', layer)
        .eq('skill_domain', domain)
        .order('label');
      if (error) throw error;
      return data || [];
    },
  });

  const handleAdd = async () => {
    if (!key.trim() || !label.trim()) return;
    const { error } = await (supabase as any).from('video_tag_taxonomy').insert({
      layer, skill_domain: domain,
      key: key.trim().toLowerCase().replace(/\s+/g, '_'),
      label: label.trim(),
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setKey(''); setLabel('');
    qc.invalidateQueries({ queryKey: ['taxonomy-admin'] });
    qc.invalidateQueries({ queryKey: ['video-taxonomy'] });
    toast({ title: 'Tag added' });
  };

  const handleDeactivate = async (id: string) => {
    const { error } = await (supabase as any).from('video_tag_taxonomy').update({ active: false }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['taxonomy-admin'] });
    qc.invalidateQueries({ queryKey: ['video-taxonomy'] });
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="font-semibold">Tag Taxonomy</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Layer</Label>
          <Select value={layer} onValueChange={v => setLayer(v as TagLayer)}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LAYERS.map(l => <SelectItem key={l} value={l} className="capitalize text-xs">{l.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Skill Domain</Label>
          <Select value={domain} onValueChange={v => setDomain(v as SkillDomain)}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOMAINS.map(d => <SelectItem key={d} value={d} className="capitalize text-xs">{d.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Key (snake_case)</Label>
          <Input value={key} onChange={e => setKey(e.target.value)} placeholder="hands_forward_early" className="h-8 text-xs" />
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Label</Label>
          <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Hands drifting forward early" className="h-8 text-xs" />
        </div>
        <Button size="sm" onClick={handleAdd}><Plus className="h-3 w-3 mr-1" />Add</Button>
      </div>

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {tags.map((t: any) => (
          <div key={t.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/40">
            <div className="min-w-0 flex-1">
              <span className="font-medium">{t.label}</span>
              <span className="text-muted-foreground ml-2">({t.key})</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeactivate(t.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {tags.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-4">No tags. Add some above.</p>}
      </div>
    </Card>
  );
}
