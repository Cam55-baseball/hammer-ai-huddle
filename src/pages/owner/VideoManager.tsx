import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useVideoLibraryAdmin } from '@/hooks/useVideoLibraryAdmin';
import { INFO_PLACEMENTS, infoPlacementTag, infoFaultTag, infoGoalTag, topicKey, type InfoPlacement, type InfoVideo } from '@/lib/videoMoments/informational';
import { dimValues } from '@/lib/videoMoments/videoDimensions';
import { subGoalsFor, type CategoryKey } from '@/lib/hammer/goals/subGoalCatalog';
import { faultKeysFor } from '../../../supabase/functions/analyze-video/constructiveCriticism';
import { isAcceptedDrillVideoUrl } from '@/lib/prescription/drillVideoSource';
import { toast } from '@/hooks/use-toast';
import { VideoPlayer } from '@/components/video-library/VideoPlayer';
import { useVideoTagVocabulary, SKILL_AREA_LABEL } from '@/hooks/useVideoTagVocabulary';
import { DimensionPickers, TopicPickers, VideoSuggestions, saveTopicAssignments } from '@/components/owner/videoManager/VideoTagPanel';
import { PlacementPreview } from '@/components/owner/videoManager/PlacementPreview';
import type { SkillDomain } from '@/lib/videoRecommendationEngine';

type Row = InfoVideo & { video_class?: string | null; topicIds: string[] };
type Draft = { id?: string; informational: boolean; title: string; url: string; sport: string; domains: string[]; placements: InfoPlacement[]; faults: string[]; tags: string[]; topicIds: string[]; active: boolean };
const empty: Draft = { informational: true, title: '', url: '', sport: 'both', domains: ['hitting'], placements: [], faults: [], tags: [], topicIds: [], active: true };
const FAULT_DOMAINS = ['hitting', 'pitching', 'throwing', 'fielding', 'base_running'];
type Filter = 'informational' | 'all' | 'missing';

/** Owner Nov 2 missing-tags finder: what a video still needs before it can be matched well. */
export function missingTags(video: Pick<Row, 'tags' | 'sport' | 'skill_domains' | 'category' | 'topicIds'>): string[] {
  const out: string[] = [];
  if (!video.sport?.length) out.push('sport');
  if (!(video.skill_domains ?? []).length) out.push('skill area');
  if (!video.topicIds.length) out.push('what it teaches');
  if (!dimValues(video.tags, 'purpose').length) out.push('video purpose');
  if (video.category === 'informational' && !video.tags.some(t => t.startsWith('info:place:'))) out.push('where it appears');
  return out;
}

export default function VideoManager() {
  const qc = useQueryClient();
  const vocab = useVideoTagVocabulary();
  const { uploadVideo, uploading } = useVideoLibraryAdmin();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('informational');
  const { data: videos = [], error } = useQuery({ queryKey: ['owner-informational-videos'], queryFn: async () => {
    const result = await supabase.from('library_videos').select('id,title,video_url,video_type,tags,sport,skill_domains,category,distribution_tier,moderation_removed_at,video_class').order('created_at', { ascending: false }).limit(1000);
    if (result.error) throw result.error;
    const ids = (result.data ?? []).map(v => v.id);
    const assign = ids.length ? await supabase.from('video_tag_assignments').select('video_id,tag_id,video_tag_taxonomy(key,layer,skill_domain)').in('video_id', ids) : { data: [], error: null };
    if (assign.error) throw assign.error;
    return (result.data ?? []).map(v => {
      const mine = (assign.data ?? []).filter((a: any) => a.video_id === v.id) as any[];
      return { ...v, topicIds: mine.map(a => a.tag_id), topics: mine.filter(a => a.video_tag_taxonomy).map(a => topicKey(a.video_tag_taxonomy.skill_domain, a.video_tag_taxonomy.layer, a.video_tag_taxonomy.key)) };
    }) as Row[];
  } });
  const faultDomains = draft ? draft.domains.filter(d => FAULT_DOMAINS.includes(d)) : [];
  const sports = draft ? (draft.sport === 'both' ? ['baseball', 'softball'] as const : [draft.sport as 'baseball' | 'softball']) : [];
  const keys = [...new Set(sports.flatMap(sport => faultDomains.flatMap(domain => faultKeysFor(domain, sport))))];
  const goalLabels = [...new Set(sports.flatMap(sport => ['position', 'pitcher'].flatMap(discipline => faultDomains.flatMap(domain => subGoalsFor(sport, discipline as 'position' | 'pitcher', domain as CategoryKey).map(goal => goal.label)))))];
  const previewVideo: InfoVideo | null = draft ? {
    id: draft.id ?? 'draft', title: draft.title, video_url: draft.url || 'preview', video_type: 'external', category: 'informational', sport: [draft.sport], skill_domains: draft.domains,
    tags: [...draft.tags.filter(t => !t.startsWith('info:place:') && !t.startsWith('info:fault:')), ...draft.placements.map(infoPlacementTag), ...draft.faults.map(infoFaultTag)],
    topics: (vocab.data?.taxonomy ?? []).filter(t => draft.topicIds.includes(t.id)).map(t => topicKey(t.skill_domain, t.layer, t.key)),
  } : null;
  const openVideo = (video: Row) => { setFile(null); setDraft({ id: video.id, informational: video.category === 'informational', title: video.title, url: video.video_url ?? '', sport: video.sport.length > 1 ? 'both' : video.sport[0] ?? 'both', domains: video.skill_domains?.length ? [...video.skill_domains] : ['hitting'], tags: video.tags, topicIds: video.topicIds,
    placements: (Object.keys(INFO_PLACEMENTS) as InfoPlacement[]).filter(place => video.tags.includes(infoPlacementTag(place))), faults: video.tags.filter(tag => tag.startsWith('info:fault:')).map(tag => tag.slice(11)), active: video.distribution_tier !== 'blocked' }); };
  const save = async () => {
    if (!draft || saving || uploading) return;
    if (!draft.domains.length) { toast({ title: 'Pick at least one skill area' }); return; }
    const info = draft.informational;
    if (info && (!draft.title.trim() || !draft.placements.length || (!file && (!draft.url || !isAcceptedDrillVideoUrl(draft.url))))) { toast({ title: 'Add a title, video and place to show it' }); return; }
    if (info && draft.placements.includes('recurring') && !draft.faults.length) { toast({ title: 'Pick a matching finding for recurring issues' }); return; }
    if (info && draft.placements.includes('after_analysis') && !draft.faults.length && !draft.tags.some(tag => tag.startsWith('info:goal:'))) { toast({ title: 'Pick a matching finding or goal' }); return; }
    const domainTopics = (vocab.data?.taxonomy ?? []).filter(t => draft.topicIds.includes(t.id));
    if (info && draft.placements.includes('mind') && !domainTopics.some(t => t.skill_domain === 'mind' || t.skill_domain === 'vision')) { toast({ title: 'Pick which Mind item it teaches' }); return; }
    if (info && draft.placements.includes('tissue_care') && !domainTopics.some(t => t.skill_domain === 'tissue_care')) { toast({ title: 'Pick the tissue care area or type' }); return; }
    const tags = info ? [...draft.tags.filter(tag => !tag.startsWith('info:') || tag.startsWith('info:goal:')), ...draft.placements.map(infoPlacementTag), ...draft.faults.map(infoFaultTag)] : draft.tags;
    const sport = draft.sport === 'both' && !info ? ['baseball', 'softball'] : [draft.sport];
    setSaving(true);
    try {
      let id = draft.id;
      if (!id) {
        const result = await uploadVideo({ title: draft.title.trim(), tags, sport, category: 'informational',
          videoType: file ? 'upload' : 'external', externalUrl: draft.url, videoFile: file ?? undefined, skillDomains: draft.domains as SkillDomain[] });
        if (!result) return;
        id = result.id;
        setDraft({ ...draft, id });
      }
      // Non-informational videos: only tags, sport and skill areas change (tier/links stay as they are).
      const patch = info ? { title: draft.title.trim(), tags, sport, skill_domains: draft.domains as SkillDomain[], ...(!file ? { video_url: draft.url } : {}), distribution_tier: draft.active ? 'normal' : 'blocked' }
        : { tags, sport, skill_domains: draft.domains as SkillDomain[] };
      const result = await supabase.from('library_videos').update(patch).eq('id', id).select('id,tags').single();
      if (result.error) throw result.error;
      if (result.data.tags?.length !== tags.length || !tags.every(tag => result.data.tags?.includes(tag))) throw new Error('Video tags did not read back.');
      await saveTopicAssignments(id, draft.topicIds);
      await qc.invalidateQueries({ queryKey: ['owner-informational-videos'] });
      await qc.invalidateQueries({ queryKey: ['informational-videos'] });
      setDraft(null); setFile(null); toast({ title: 'Video tags saved' });
    } catch (err) { toast({ title: 'Video not ready to show', description: err instanceof Error ? err.message : 'Try saving again.' }); }
    finally { setSaving(false); }
  };
  const acceptSuggestion = async (tagId: string, suggestionId: string) => {
    if (!draft) return;
    setDraft({ ...draft, topicIds: draft.topicIds.includes(tagId) ? draft.topicIds : [...draft.topicIds, tagId] });
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('video_tag_suggestions').update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', suggestionId);
    await qc.invalidateQueries({ queryKey: ['video-tag-suggestions'] });
  };
  const shown = videos.filter(video => video.title.toLowerCase().includes(search.toLowerCase()))
    .filter(video => filter === 'all' || (filter === 'informational' ? video.category === 'informational' : missingTags(video).length > 0));
  return <DashboardLayout><div className="mx-auto max-w-5xl space-y-4 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">Video Manager</h1><Button onClick={() => { setDraft({ ...empty }); setFile(null); }}>Create new</Button></div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Which videos">{([['informational', 'Informational'], ['all', 'All videos'], ['missing', 'Missing tags']] as const).map(([key, label]) =>
      <Button key={key} size="sm" variant={filter === key ? 'default' : 'outline'} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</Button>)}</div>
    <Input aria-label="Search videos" placeholder="Search videos" value={search} onChange={e => setSearch(e.target.value)} />
    {error && <p role="alert" className="text-destructive">Couldn't load videos.</p>}
    {shown.map(video => { const missing = missingTags(video); return <div key={video.id} className="space-y-1 border-b border-border py-3" data-video-row={video.id}>
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="break-words font-semibold">{video.title}</h2><Button variant="outline" size="sm" onClick={() => openVideo(video)}>{video.category === 'informational' ? 'Edit' : 'Edit tags'}</Button></div>
      <p className="text-xs text-muted-foreground">{video.distribution_tier === 'blocked' ? 'Off' : 'On'} · {(video.skill_domains ?? []).map(d => SKILL_AREA_LABEL[d] ?? d).join(', ')}{video.category === 'informational' ? ' · ' + video.tags.filter(tag => tag.startsWith('info:place:')).map(tag => INFO_PLACEMENTS[tag.slice(11) as InfoPlacement]).filter(Boolean).join(' · ') : ''}</p>
      {missing.length > 0 && <p className="text-xs text-destructive">Missing: {missing.join(', ')}</p>}
    </div>; })}
    <Dialog open={Boolean(draft)} onOpenChange={open => { if (!open && !saving) setDraft(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{draft?.id ? (draft.informational ? 'Edit informational video' : 'Edit video tags') : 'New informational video'}</DialogTitle></DialogHeader>
      {draft && <div className="space-y-4">
        {draft.informational ? <>
          <div><Label htmlFor="info-title">Title</Label><Input id="info-title" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></div>
          <div><Label htmlFor="info-url">Video link</Label><Input id="info-url" value={draft.url} onChange={e => { setFile(null); setDraft({ ...draft, url: e.target.value }); }} /></div>
          {!draft.id && <div><Label htmlFor="info-file">Or upload a video</Label><Input id="info-file" type="file" accept="video/*" onChange={e => setFile(e.target.files?.[0] ?? null)} /></div>}
        </> : <p className="font-medium">{draft.title}</p>}
        <label className="block space-y-1 text-sm">Sport<select aria-label="Video sport" className="h-9 w-full rounded-md border border-input bg-background" value={draft.sport} onChange={e => setDraft({ ...draft, sport: e.target.value, faults: [] })}>{['both', 'baseball', 'softball'].map(sport => <option key={sport}>{sport}</option>)}</select></label>
        <fieldset className="space-y-1"><legend className="text-sm font-semibold">Skill areas</legend><div className="flex flex-wrap gap-2">{Object.entries(SKILL_AREA_LABEL).map(([domain, label]) =>
          <label key={domain} className="flex items-center gap-1 text-sm"><Checkbox aria-label={`Skill ${label}`} checked={draft.domains.includes(domain)} onCheckedChange={checked => setDraft({ ...draft, faults: [], domains: checked ? [...draft.domains, domain] : draft.domains.filter(d => d !== domain) })} />{label}</label>)}</div></fieldset>
        <TopicPickers domains={draft.domains} sport={draft.sport} topicIds={draft.topicIds} onChange={topicIds => setDraft({ ...draft, topicIds })} />
        {draft.id && <VideoSuggestions videoId={draft.id} domains={draft.domains} onAccept={(tagId, sid) => void acceptSuggestion(tagId, sid)} />}
        <DimensionPickers tags={draft.tags} onChange={tags => setDraft({ ...draft, tags })} />
        {draft.informational && <>
          <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">Where it appears</legend>{(Object.keys(INFO_PLACEMENTS) as InfoPlacement[]).map(place => <label key={place} className="flex items-center gap-2 text-sm"><Checkbox checked={draft.placements.includes(place)} onCheckedChange={checked => setDraft({ ...draft, placements: checked ? [...draft.placements, place] : draft.placements.filter(item => item !== place) })} />{INFO_PLACEMENTS[place]}</label>)}
            <p className="text-xs text-muted-foreground">A drill's own video is attached in the drill builder.</p></fieldset>
          {goalLabels.length > 0 && <fieldset className="max-h-48 space-y-2 overflow-y-auto"><legend className="text-sm font-semibold">Matching goals</legend>{goalLabels.map(goal => <label key={goal} className="flex items-center gap-2 text-sm"><Checkbox checked={draft.tags.includes(infoGoalTag(goal))} onCheckedChange={checked => setDraft({ ...draft, tags: checked ? [...draft.tags, infoGoalTag(goal)] : draft.tags.filter(tag => tag !== infoGoalTag(goal)) })} />{goal}</label>)}</fieldset>}
          {draft.placements.some(place => place === 'after_analysis' || place === 'recurring') && <fieldset className="max-h-48 space-y-2 overflow-y-auto"><legend className="text-sm font-semibold">Matching findings</legend>{keys.map(key => <label key={key} className="flex items-center gap-2 text-sm"><Checkbox checked={draft.faults.includes(key)} onCheckedChange={checked => setDraft({ ...draft, faults: checked ? [...draft.faults, key] : draft.faults.filter(item => item !== key) })} />{key.replace(/_/g, ' ')}</label>)}</fieldset>}
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={draft.active} onCheckedChange={checked => setDraft({ ...draft, active: Boolean(checked) })} />Show when it matches</label>
          {previewVideo && <PlacementPreview video={previewVideo} />}
          {draft.url && <VideoPlayer videoUrl={draft.url} videoType="external" title={draft.title} />}
        </>}
      </div>}
      <DialogFooter><Button variant="outline" disabled={saving || uploading} onClick={() => setDraft(null)}>Cancel</Button><Button disabled={saving || uploading} onClick={() => void save()}>{saving || uploading ? 'Saving…' : 'Save video'}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div></DashboardLayout>;
}
