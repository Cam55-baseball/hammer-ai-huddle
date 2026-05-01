import { useState } from 'react';
import { Plus, Trash2, AlertTriangle, Sparkles, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { TagLayer, SkillDomain } from '@/lib/videoRecommendationEngine';

const LAYERS: TagLayer[] = ['movement_pattern', 'result', 'context', 'correction'];
const DOMAINS: SkillDomain[] = ['hitting', 'fielding', 'throwing', 'base_running', 'pitching'];

export const LAYER_GUIDANCE: Record<TagLayer, { short: string; long: string; examples: string }> = {
  movement_pattern: {
    short: 'What the body is DOING — mechanics / biomechanics.',
    long: 'A pattern in how the athlete moves. These describe the mechanical cause Hammer fixes with a Correction.',
    examples: 'hands_forward_early, early_extension, head_pull_off, late_barrel',
  },
  result: {
    short: 'What HAPPENED on the play — the outcome.',
    long: 'The observable result of the rep — contact quality, hit type, miss type. Not how it happened.',
    examples: 'roll_over_contact, pop_up, barrel, weak_contact, missed_pitch',
  },
  context: {
    short: 'The SITUATION around the rep.',
    long: 'The game/pitch context that shaped the rep. Use this to filter videos for situations like 2-strike or RISP.',
    examples: 'two_strike, risp, inside_pitch, high_velocity, breaking_ball',
  },
  correction: {
    short: 'The COACHING INTENT — the fix being demonstrated.',
    long: 'The cue or fix the video teaches. Hammer suggests these to athletes whose movement_pattern + result match a rule.',
    examples: 'keep_hands_back, stay_connected, load_back_side, barrel_stays_behind_hands',
  },
};

export function TaxonomyManager() {
  const qc = useQueryClient();
  const [layer, setLayer] = useState<TagLayer>('movement_pattern');
  const [domain, setDomain] = useState<SkillDomain>('hitting');
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string; key: string } | null>(null);
  const [usageCount, setUsageCount] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const triggerHammerReanalysis = async (tagId: string) => {
    try {
      const { data, error } = await (supabase as any).functions.invoke('reanalyze-videos-for-new-tag', {
        body: { tagId },
      });
      if (error) throw error;
      const analyzed = data?.analyzed ?? 0;
      const inserted = data?.proposals_inserted ?? 0;
      toast({
        title: 'Hammer reviewed your library',
        description: inserted > 0
          ? `Reviewed ${analyzed} videos — ${inserted} new tag proposals waiting in the suggestion queue.`
          : `Reviewed ${analyzed} videos — none matched this tag yet.`,
      });
    } catch (err: any) {
      console.error('reanalyze error', err);
      toast({
        title: 'Hammer review failed',
        description: err?.message ?? 'Could not analyze videos for this tag right now.',
        variant: 'destructive',
      });
    }
  };

  const handleAdd = async () => {
    if (!key.trim() || !label.trim()) return;
    setAdding(true);
    const { data, error } = await (supabase as any).from('video_tag_taxonomy').insert({
      layer, skill_domain: domain,
      key: key.trim().toLowerCase().replace(/\s+/g, '_'),
      label: label.trim(),
    }).select('id').single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setAdding(false);
      return;
    }
    setKey(''); setLabel('');
    qc.invalidateQueries({ queryKey: ['taxonomy-admin'] });
    qc.invalidateQueries({ queryKey: ['video-taxonomy'] });
    toast({ title: 'Tag added', description: 'Hammer is reviewing your library for this tag…' });
    setAdding(false);

    if (data?.id) {
      // Fire and forget — toast updates when it returns
      triggerHammerReanalysis(data.id);
    }
  };

  const openDelete = async (id: string, lbl: string, k: string) => {
    setDeleteTarget({ id, label: lbl, key: k });
    setUsageCount(null);
    const { count } = await (supabase as any)
      .from('video_tag_assignments')
      .select('video_id', { count: 'exact', head: true })
      .eq('tag_id', id);
    setUsageCount(count ?? 0);
  };

  const handleDeactivate = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await (supabase as any)
      .from('video_tag_taxonomy').update({ active: false }).eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Tag deactivated', description: 'Hidden from new tagging. Existing assignments preserved.' });
    setDeleteTarget(null);
    qc.invalidateQueries({ queryKey: ['taxonomy-admin'] });
    qc.invalidateQueries({ queryKey: ['video-taxonomy'] });
  };

  const handleHardDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await (supabase as any)
      .from('video_tag_taxonomy').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Tag permanently deleted',
      description: `Removed "${deleteTarget.label}" and unlinked it from ${usageCount ?? 0} video${usageCount === 1 ? '' : 's'}.`,
    });
    setDeleteTarget(null);
    qc.invalidateQueries({ queryKey: ['taxonomy-admin'] });
    qc.invalidateQueries({ queryKey: ['video-taxonomy'] });
  };

  const guidance = LAYER_GUIDANCE[layer];

  return (
    <Card className="p-4 space-y-4">
      <h3 className="font-semibold">Tag Taxonomy</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Layer</Label>
          <Select value={layer} onValueChange={v => setLayer(v as TagLayer)}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LAYERS.map(l => (
                <SelectItem key={l} value={l} className="text-xs">
                  <div className="flex flex-col py-0.5">
                    <span className="capitalize font-medium">{l.replace('_', ' ')}</span>
                    <span className="text-[10px] text-muted-foreground">{LAYER_GUIDANCE[l].short}</span>
                  </div>
                </SelectItem>
              ))}
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

      {/* Layer guidance card — prevents misplacement */}
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold capitalize">{layer.replace('_', ' ')}</span>
          <Badge variant="outline" className="text-[10px] ml-auto">{guidance.short}</Badge>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">{guidance.long}</p>
        <p className="text-[10px] text-muted-foreground"><span className="font-medium">Examples:</span> {guidance.examples}</p>
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
        <Button size="sm" onClick={handleAdd} disabled={adding || !key.trim() || !label.trim()}>
          <Plus className="h-3 w-3 mr-1" />{adding ? 'Adding…' : 'Add'}
        </Button>
      </div>

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {tags.map((t: any) => (
          <div key={t.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/40">
            <div className="min-w-0 flex-1">
              <span className="font-medium">{t.label}</span>
              <span className="text-muted-foreground ml-2">({t.key})</span>
              {!t.active && <Badge variant="outline" className="ml-2 text-[9px]">inactive</Badge>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={() => openDelete(t.id, t.label, t.key)}
              title="Remove tag"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {tags.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-4">No tags. Add some above.</p>}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Remove tag "{deleteTarget?.label}"?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm">
                  This tag is currently assigned to{' '}
                  <span className="font-semibold text-foreground">
                    {usageCount === null ? '…' : usageCount} video{usageCount === 1 ? '' : 's'}
                  </span>.
                </p>
                <div className="rounded-md border p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-medium text-xs">
                    <EyeOff className="h-3 w-3" /> Deactivate (recommended)
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Hides the tag from new tagging UI, but keeps existing video assignments and history intact.
                  </p>
                </div>
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-medium text-xs text-destructive">
                    <Trash2 className="h-3 w-3" /> Delete permanently
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Removes the tag from the taxonomy AND unlinks it from all {usageCount ?? 0} video assignments. This cannot be undone.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={handleDeactivate} disabled={deleting}>
              <EyeOff className="h-3 w-3 mr-1" /> Deactivate
            </Button>
            <AlertDialogAction
              onClick={handleHardDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-3 w-3 mr-1" /> Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
