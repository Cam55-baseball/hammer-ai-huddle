import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useVideoTagVocabulary, SKILL_AREA_LABEL, LAYER_LABEL, type TaxonomyTag } from '@/hooks/useVideoTagVocabulary';
import { VIDEO_DIMENSIONS, dimTag, type VideoDimension } from '@/lib/videoMoments/videoDimensions';

function Chips({ label, options, value, onToggle }: { label: string; options: { key: string; label: string }[]; value: (key: string) => boolean; onToggle: (key: string) => void }) {
  if (!options.length) return null;
  return <div className="space-y-1"><p className="text-xs font-semibold text-muted-foreground">{label}</p>
    <div className="flex flex-wrap gap-1" role="group" aria-label={label}>
      {options.map(o => { const on = value(o.key); return <button key={o.key} type="button" aria-pressed={on} onClick={() => onToggle(o.key)}><Badge variant={on ? 'default' : 'outline'}>{o.label}</Badge></button>; })}
    </div></div>;
}

/** Dimension pickers (multi-select). Writes `dim:<dimension>:<key>` entries into the video's tags. */
export function DimensionPickers({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const vocab = useVideoTagVocabulary();
  const qc = useQueryClient();
  const [adding, setAdding] = useState<{ dimension: VideoDimension; label: string } | null>(null);
  const toggle = (tag: string) => onChange(tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]);
  const addValue = async () => {
    if (!adding?.label.trim()) return;
    const key = adding.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const { error } = await supabase.from('video_tag_dimension_values').insert({ dimension: adding.dimension, key, label: adding.label.trim(), sort: 99 });
    if (error) { toast({ title: 'Choice not added', description: error.message }); return; }
    await qc.invalidateQueries({ queryKey: ['video-tag-vocabulary'] });
    setAdding(null);
  };
  if (vocab.isError) return <p role="alert" className="text-sm text-destructive">Couldn't load tag choices.</p>;
  return <fieldset className="space-y-3"><legend className="text-sm font-semibold">Who and when (pick any)</legend>
    <p className="text-xs text-muted-foreground">Position, role, program and level limit who sees it. Nothing picked = everyone who matches the rest.</p>
    {(Object.keys(VIDEO_DIMENSIONS) as VideoDimension[]).map(dimension => <div key={dimension} className="space-y-1">
      <Chips label={VIDEO_DIMENSIONS[dimension]} options={(vocab.data?.dimensions ?? []).filter(v => v.dimension === dimension)}
        value={key => tags.includes(dimTag(dimension, key))} onToggle={key => toggle(dimTag(dimension, key))} />
      {adding?.dimension === dimension
        ? <div className="flex gap-2"><Input aria-label={`New ${VIDEO_DIMENSIONS[dimension]} choice`} value={adding.label} onChange={e => setAdding({ dimension, label: e.target.value })} /><Button size="sm" type="button" onClick={() => void addValue()}>Add</Button></div>
        : <button type="button" className="text-xs text-primary underline" onClick={() => setAdding({ dimension, label: '' })}>+ Add a {VIDEO_DIMENSIONS[dimension].toLowerCase()} choice</button>}
    </div>)}
  </fieldset>;
}

/** 4-layer topic pickers for each chosen skill area. Values are taxonomy ids (saved as video_tag_assignments). */
export function TopicPickers({ domains, sport, topicIds, onChange }: { domains: string[]; sport: string; topicIds: string[]; onChange: (ids: string[]) => void }) {
  const vocab = useVideoTagVocabulary();
  const toggle = (id: string) => onChange(topicIds.includes(id) ? topicIds.filter(t => t !== id) : [...topicIds, id]);
  const fits = (t: TaxonomyTag) => sport === 'both' || t.sport === 'both' || t.sport === sport;
  return <fieldset className="space-y-3"><legend className="text-sm font-semibold">What it teaches</legend>
    {domains.map(domain => <div key={domain} className="space-y-2 border-l-2 border-border pl-2">
      <p className="text-sm font-medium">{SKILL_AREA_LABEL[domain] ?? domain}</p>
      {Object.keys(LAYER_LABEL).map(layer => <Chips key={layer} label={LAYER_LABEL[layer]}
        options={(vocab.data?.taxonomy ?? []).filter(t => t.skill_domain === domain && t.layer === layer && fits(t)).map(t => ({ key: t.id, label: t.label }))}
        value={id => topicIds.includes(id)} onToggle={toggle} />)}
    </div>)}
  </fieldset>;
}

/** Pending auto-suggestions for this video (existing video_tag_suggestions). */
export function VideoSuggestions({ videoId, domains, onAccept }: { videoId: string; domains: string[]; onAccept: (tagId: string, suggestionId: string) => void }) {
  const vocab = useVideoTagVocabulary();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['video-tag-suggestions', 'video', videoId], queryFn: async () => {
    const { data, error } = await supabase.from('video_tag_suggestions').select('id,layer,suggested_key,confidence,reasoning').eq('video_id', videoId).eq('status', 'pending').order('confidence', { ascending: false });
    if (error) throw error; return data ?? [];
  } });
  const reject = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('video_tag_suggestions').update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', id);
    await qc.invalidateQueries({ queryKey: ['video-tag-suggestions'] });
  };
  if (!q.data?.length) return null;
  return <div className="space-y-2"><p className="text-sm font-semibold">Suggested tags</p>
    {q.data.map(s => {
      const tag = (vocab.data?.taxonomy ?? []).find(t => t.layer === s.layer && t.key === s.suggested_key && domains.includes(t.skill_domain));
      return <div key={s.id} className="flex flex-wrap items-center gap-2 text-sm">
        <span>{tag?.label ?? s.suggested_key.replace(/_/g, ' ')} · {LAYER_LABEL[s.layer as string] ?? s.layer} · {Math.round(Number(s.confidence) * 100)}% sure</span>
        <Button size="sm" variant="outline" type="button" disabled={!tag} onClick={() => tag && onAccept(tag.id, s.id)}>Use</Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => void reject(s.id)}>Dismiss</Button>
      </div>;
    })}
  </div>;
}

/** Save topic picks as canonical assignments: add new, remove unpicked, read back. */
export async function saveTopicAssignments(videoId: string, topicIds: string[]) {
  const current = await supabase.from('video_tag_assignments').select('tag_id').eq('video_id', videoId);
  if (current.error) throw current.error;
  const have = new Set((current.data ?? []).map(r => r.tag_id));
  const add = topicIds.filter(id => !have.has(id));
  const remove = [...have].filter(id => !topicIds.includes(id));
  if (add.length) { const r = await supabase.from('video_tag_assignments').insert(add.map(tag_id => ({ video_id: videoId, tag_id, weight: 2 }))); if (r.error) throw r.error; }
  if (remove.length) { const r = await supabase.from('video_tag_assignments').delete().eq('video_id', videoId).in('tag_id', remove); if (r.error) throw r.error; }
  const back = await supabase.from('video_tag_assignments').select('tag_id').eq('video_id', videoId);
  if (back.error) throw back.error;
  const got = new Set((back.data ?? []).map(r => r.tag_id));
  if (got.size !== topicIds.length || !topicIds.every(id => got.has(id))) throw new Error('Video topics did not read back.');
}
