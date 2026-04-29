import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const POSITIONS = ['infield', 'outfield', 'catcher', 'pitcher_fielding', 'first_base', 'shortstop', 'second_base', 'third_base'];
const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced', 'elite'];
const PROGRESSION_LEVELS = [
  { value: 1, label: 'Tee Ball' },
  { value: 2, label: 'Youth' },
  { value: 3, label: 'Middle School' },
  { value: 4, label: 'High School' },
  { value: 5, label: 'College' },
  { value: 6, label: 'Pro' },
  { value: 7, label: 'Elite' },
];

interface DrillEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drillId: string | null;
  onSaved: () => void;
}

interface TagSelection {
  tagId: string;
  name: string;
  category: string;
  selected: boolean;
  weight: number;
}

export function DrillEditorDialog({ open, onOpenChange, drillId, onSaved }: DrillEditorDialogProps) {
  const { user } = useAuth();
  const isEditing = !!drillId;

  // Form state
  const [name, setName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [sport, setSport] = useState('baseball');
  const [module, setModule] = useState('fielding');
  const [skillTarget, setSkillTarget] = useState('');
  const [description, setDescription] = useState('');
  const [aiContext, setAiContext] = useState('');
  const [premium, setPremium] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [difficultyLevels, setDifficultyLevels] = useState<string[]>(['beginner']);
  const [tagSelections, setTagSelections] = useState<TagSelection[]>([]);
  const [showWeights, setShowWeights] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progressionLevel, setProgressionLevel] = useState(4);
  const [sportModifier, setSportModifier] = useState(1.0);
  const [version, setVersion] = useState(1);

  // Fetch all available tags
  const { data: allTags } = useQuery({
    queryKey: ['all-drill-tags'],
    queryFn: async () => {
      const { data } = await supabase.from('drill_tags').select('*').order('category').order('name');
      return data ?? [];
    },
  });

  // Fetch existing drill data if editing
  const { data: existingDrill } = useQuery({
    queryKey: ['edit-drill', drillId],
    queryFn: async () => {
      if (!drillId) return null;
      const { data } = await supabase.from('drills').select('*').eq('id', drillId).single();
      return data;
    },
    enabled: !!drillId,
  });

  const { data: existingPositions } = useQuery({
    queryKey: ['edit-drill-positions', drillId],
    queryFn: async () => {
      if (!drillId) return [];
      const { data } = await supabase.from('drill_positions').select('position').eq('drill_id', drillId);
      return data?.map(p => p.position) ?? [];
    },
    enabled: !!drillId,
  });

  const { data: existingTagMap } = useQuery({
    queryKey: ['edit-drill-tagmap', drillId],
    queryFn: async () => {
      if (!drillId) return [];
      const { data } = await supabase.from('drill_tag_map').select('tag_id, weight').eq('drill_id', drillId);
      return data ?? [];
    },
    enabled: !!drillId,
  });

  // Populate form when editing
  useEffect(() => {
    if (existingDrill) {
      setName(existingDrill.name || '');
      setVideoUrl(existingDrill.video_url || '');
      setSport(existingDrill.sport || 'baseball');
      setModule(existingDrill.module || 'fielding');
      setSkillTarget(existingDrill.skill_target || '');
      setDescription(existingDrill.description || '');
      setAiContext(existingDrill.ai_context || '');
      setPremium(existingDrill.premium || false);
      setIsPublished(existingDrill.is_published || false);
      setDifficultyLevels(existingDrill.difficulty_levels ?? ['beginner']);
      setProgressionLevel((existingDrill as any).progression_level ?? 4);
      setSportModifier(Number((existingDrill as any).sport_modifier) || 1.0);
      setVersion((existingDrill as any).version ?? 1);
    } else if (!drillId) {
      setName(''); setVideoUrl(''); setSport('baseball'); setModule('fielding');
      setSkillTarget(''); setDescription(''); setAiContext('');
      setPremium(false); setIsPublished(false);
      setSelectedPositions([]);
      setDifficultyLevels(['beginner']);
      setProgressionLevel(4);
      setSportModifier(1.0);
      setVersion(1);
    }
  }, [existingDrill, drillId]);

  useEffect(() => {
    if (existingPositions) setSelectedPositions(existingPositions);
  }, [existingPositions]);

  // Build tag selections when tags load
  useEffect(() => {
    if (!allTags) return;
    const tagMap = new Map(existingTagMap?.map(t => [t.tag_id, t.weight]) ?? []);
    setTagSelections(
      allTags.map(t => ({
        tagId: t.id,
        name: t.name,
        category: t.category,
        selected: tagMap.has(t.id),
        weight: tagMap.get(t.id) ?? 1,
      })),
    );
  }, [allTags, existingTagMap]);

  const togglePosition = (pos: string) => {
    setSelectedPositions(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos],
    );
  };

  const toggleDifficulty = (level: string) => {
    setDifficultyLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level],
    );
  };

  const toggleTag = (tagId: string) => {
    setTagSelections(prev =>
      prev.map(t => t.tagId === tagId ? { ...t, selected: !t.selected } : t),
    );
  };

  const setTagWeight = (tagId: string, weight: number) => {
    setTagSelections(prev =>
      prev.map(t => t.tagId === tagId ? { ...t, weight } : t),
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      let finalDrillId = drillId;

      const drillData: Record<string, any> = {
        name: name.trim(),
        video_url: videoUrl.trim() || null,
        sport,
        module,
        skill_target: skillTarget.trim() || null,
        description: description.trim() || null,
        ai_context: aiContext.trim() || null,
        premium,
        is_published: isPublished,
        difficulty_levels: difficultyLevels,
        created_by: user?.id || null,
        updated_at: new Date().toISOString(),
        progression_level: progressionLevel,
        sport_modifier: sportModifier,
      };

      if (isEditing) {
        drillData.version = version + 1;
      }

      if (isEditing && drillId) {
        const { error } = await supabase.from('drills').update(drillData as any).eq('id', drillId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('drills').insert(drillData as any).select('id').single();
        if (error) throw error;
        finalDrillId = data.id;
      }

      if (!finalDrillId) throw new Error('No drill ID');

      // Update positions
      await supabase.from('drill_positions').delete().eq('drill_id', finalDrillId);
      if (selectedPositions.length > 0) {
        await supabase.from('drill_positions').insert(
          selectedPositions.map(p => ({ drill_id: finalDrillId!, position: p })),
        );
      }

      // Update tag map
      await supabase.from('drill_tag_map').delete().eq('drill_id', finalDrillId);
      const selectedTags = tagSelections.filter(t => t.selected);
      if (selectedTags.length > 0) {
        await supabase.from('drill_tag_map').insert(
          selectedTags.map(t => ({ drill_id: finalDrillId!, tag_id: t.tagId, weight: t.weight })),
        );
      }

      toast.success(isEditing ? 'Drill updated' : 'Drill created');
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to save drill');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const groupedTags = tagSelections.reduce<Record<string, TagSelection[]>>((acc, t) => {
    (acc[t.category] = acc[t.category] || []).push(t);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    error_type: 'Error Tags',
    skill: 'Skill Tags',
    situation: 'Situation Tags',
    body_part: 'Body Part',
    equipment: 'Equipment',
    intensity: 'Intensity',
    phase: 'Phase',
    position: 'Position',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{isEditing ? 'Edit Drill' : 'Create Drill'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] px-6 pb-6">
          <div className="space-y-6 pt-2">
            {/* Core Info */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Core Info</h3>
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Quick Transfer Drill" />
              </div>
              <div className="space-y-2">
                <Label>Video URL</Label>
                <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Sport</Label>
                  <Select value={sport} onValueChange={setSport}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baseball">Baseball</SelectItem>
                      <SelectItem value="softball">Softball</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Module</Label>
                  <Select value={module} onValueChange={setModule}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fielding">Fielding</SelectItem>
                      <SelectItem value="hitting">Hitting</SelectItem>
                      <SelectItem value="pitching">Pitching</SelectItem>
                      <SelectItem value="throwing">Throwing</SelectItem>
                      <SelectItem value="baserunning">Baserunning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Skill Target</Label>
                <Input value={skillTarget} onChange={e => setSkillTarget(e.target.value)} placeholder="e.g., transfer, footwork" />
              </div>

              {/* Positions */}
              <div className="space-y-2">
                <Label>Positions</Label>
                <div className="flex flex-wrap gap-2">
                  {POSITIONS.map(pos => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => togglePosition(pos)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                        selectedPositions.includes(pos)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border hover:bg-accent',
                      )}
                    >
                      {pos.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label>Difficulty Levels</Label>
                <div className="flex flex-wrap gap-2">
                  {DIFFICULTY_LEVELS.map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => toggleDifficulty(level)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize',
                        difficultyLevels.includes(level)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border hover:bg-accent',
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progression Level */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Progression Level</Label>
                  <Select value={String(progressionLevel)} onValueChange={(v) => setProgressionLevel(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROGRESSION_LEVELS.map(l => (
                        <SelectItem key={l.value} value={String(l.value)}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sport Modifier</Label>
                  <Input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="2.0"
                    value={sportModifier}
                    onChange={(e) => setSportModifier(Number(e.target.value) || 1.0)}
                  />
                  <p className="text-[10px] text-muted-foreground">Priority boost (1.0 = normal)</p>
                </div>
              </div>

              {isEditing && (
                <p className="text-xs text-muted-foreground">Version: {version}</p>
              )}
            </section>

            <Separator />

            {/* Coaching Layer */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Coaching Layer</h3>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Coach-level teaching description..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Hammer Context</Label>
                <p className="text-xs text-muted-foreground">Explain WHEN this drill should be used and WHAT it fixes</p>
                <Textarea
                  value={aiContext}
                  onChange={e => setAiContext(e.target.value)}
                  placeholder="This drill targets late transfers by forcing quick glove-to-hand movement under pressure..."
                  rows={3}
                />
              </div>
            </section>

            <Separator />

            {/* Tagging System */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Tagging System</h3>
                <div className="flex items-center gap-2">
                  <Label htmlFor="show-weights" className="text-xs">Show Weights</Label>
                  <Switch id="show-weights" checked={showWeights} onCheckedChange={setShowWeights} />
                </div>
              </div>

              {Object.entries(groupedTags).map(([category, tags]) => (
                <div key={category} className="space-y-2">
                  <Label className="text-xs text-muted-foreground capitalize">
                    {categoryLabels[category] || category}
                  </Label>
                  <div className="space-y-1.5">
                    {tags.map(tag => (
                      <div key={tag.tagId} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleTag(tag.tagId)}
                          className={cn(
                            'px-2.5 py-1 rounded text-xs font-medium border transition-colors',
                            tag.selected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted text-muted-foreground border-border hover:bg-accent',
                          )}
                        >
                          {tag.name.replace(/_/g, ' ')}
                        </button>
                        {showWeights && tag.selected && (
                          <div className="flex items-center gap-2 flex-1 max-w-[180px]">
                            <Slider
                              value={[tag.weight]}
                              onValueChange={([v]) => setTagWeight(tag.tagId, v)}
                              min={1}
                              max={5}
                              step={1}
                              className="flex-1"
                            />
                            <span className="text-xs text-muted-foreground w-4 text-center">{tag.weight}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <Separator />

            {/* Access Control */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Access & Publishing</h3>
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/50">
                <div>
                  <Label className="text-sm font-medium">Subscription Gated</Label>
                  <p className="text-xs text-muted-foreground">All drills require an active subscription</p>
                </div>
                <Badge variant="default" className="text-xs">Always</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm font-medium">Published</Label>
                  <p className="text-xs text-muted-foreground">Visible to players</p>
                </div>
                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              </div>
            </section>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 pt-0 border-t mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEditing ? 'Update Drill' : 'Create Drill'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
