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
import { INFO_PLACEMENTS, infoPlacementTag, infoFaultTag, type InfoPlacement, type InfoVideo } from '@/lib/videoMoments/informational';
import { faultKeysFor } from '../../../supabase/functions/analyze-video/constructiveCriticism';
import { isAcceptedDrillVideoUrl } from '@/lib/prescription/drillVideoSource';
import { toast } from '@/hooks/use-toast';
import { VideoPlayer } from '@/components/video-library/VideoPlayer';
import type { SkillDomain } from '@/lib/videoRecommendationEngine';

type Draft = { id?: string; title: string; url: string; sport: string; domain: string; placements: InfoPlacement[]; faults: string[]; tags: string[]; active: boolean };
const empty: Draft = { title: '', url: '', sport: 'both', domain: 'hitting', placements: [], faults: [], tags: [], active: true };
export default function VideoManager() {
  const qc = useQueryClient();
  const { uploadVideo, uploading } = useVideoLibraryAdmin();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const { data: videos = [], error } = useQuery({ queryKey: ['owner-informational-videos'], queryFn: async () => {
    const result = await supabase.from('library_videos').select('*').eq('category', 'informational').order('created_at', { ascending: false });
    if (result.error) throw result.error;
    return result.data as InfoVideo[];
  } });
  const keys = draft ? [...new Set((draft.sport === 'both' ? ['baseball', 'softball'] : [draft.sport]).flatMap(sport => faultKeysFor(draft.domain, sport)))] : [];
  const save = async () => {
    if (!draft || saving || uploading) return;
    if (!draft.title.trim() || !draft.placements.length || (!file && (!draft.url || !isAcceptedDrillVideoUrl(draft.url)))) { toast({ title: 'Add a title, video and place to show it' }); return; }
    if (draft.placements.some(place => place === 'after_analysis' || place === 'recurring') && !draft.faults.length) { toast({ title: 'Pick a matching finding' }); return; }
    const tags = [...draft.tags.filter(tag => !tag.startsWith('info:')), ...draft.placements.map(infoPlacementTag), ...draft.faults.map(infoFaultTag)];
    setSaving(true);
    try {
      let id = draft.id;
      if (!id) {
        const result = await uploadVideo({ title: draft.title.trim(), tags, sport: [draft.sport], category: 'informational', skillDomains: [draft.domain],
          videoType: file ? 'upload' : 'external', externalUrl: draft.url, videoFile: file ?? undefined, skillDomains: [draft.domain as SkillDomain] });
        if (!result) return;
        id = result.id;
        setDraft({ ...draft, id });
      }
      const result = await supabase.from('library_videos').update({ title: draft.title.trim(), tags, sport: [draft.sport], skill_domains: [draft.domain],
        ...(!file ? { video_url: draft.url } : {}), distribution_tier: draft.active ? 'normal' : 'blocked' }).eq('id', id).select('id,tags,distribution_tier').single();
      if (result.error) throw result.error;
      if (result.data.tags?.length !== tags.length) throw new Error('Video tags did not read back.');
      await qc.invalidateQueries({ queryKey: ['owner-informational-videos'] });
      await qc.invalidateQueries({ queryKey: ['informational-videos'] });
      setDraft(null); setFile(null); toast({ title: 'Informational video saved' });
    } catch (err) { toast({ title: 'Video not ready to show', description: err instanceof Error ? err.message : 'Try saving again.' }); }
    finally { setSaving(false); }
  };
  return <DashboardLayout><div className="mx-auto max-w-5xl space-y-4 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">Video Manager</h1><Button onClick={() => { setDraft({ ...empty }); setFile(null); }}>Create new</Button></div>
    <Input aria-label="Search informational videos" placeholder="Search informational videos" value={search} onChange={e => setSearch(e.target.value)} />
    {error && <p role="alert" className="text-destructive">Couldn't load informational videos.</p>}
    {videos.filter(video => video.title.toLowerCase().includes(search.toLowerCase())).map(video => <div key={video.id} className="space-y-2 border-b border-border py-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="break-words font-semibold">{video.title}</h2><Button variant="outline" size="sm" onClick={() => { setFile(null); setDraft({ id: video.id, title: video.title, url: video.video_url ?? '', sport: video.sport[0] ?? 'both', domain: video.skill_domains?.[0] ?? 'hitting', tags: video.tags, placements: (Object.keys(INFO_PLACEMENTS) as InfoPlacement[]).filter(place => video.tags.includes(infoPlacementTag(place))), faults: video.tags.filter(tag => tag.startsWith('info:fault:')).map(tag => tag.slice(11)), active: video.distribution_tier !== 'blocked' }); }}>Edit</Button></div>
      <p className="text-xs text-muted-foreground">{video.distribution_tier === 'blocked' ? 'Off' : 'On'} · {video.tags.filter(tag => tag.startsWith('info:place:')).map(tag => INFO_PLACEMENTS[tag.slice(11) as InfoPlacement]).join(' · ')}</p>
    </div>)}
    <Dialog open={Boolean(draft)} onOpenChange={open => { if (!open && !saving) setDraft(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{draft?.id ? 'Edit informational video' : 'New informational video'}</DialogTitle></DialogHeader>
      {draft && <div className="space-y-4">
        <div><Label htmlFor="info-title">Title</Label><Input id="info-title" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></div>
        <div><Label htmlFor="info-url">Video link</Label><Input id="info-url" value={draft.url} onChange={e => { setFile(null); setDraft({ ...draft, url: e.target.value }); }} /></div>
        {!draft.id && <div><Label htmlFor="info-file">Or upload a video</Label><Input id="info-file" type="file" accept="video/*" onChange={e => setFile(e.target.files?.[0] ?? null)} /></div>}
        <div className="grid grid-cols-2 gap-3"><label className="space-y-1 text-sm">Sport<select aria-label="Video sport" className="h-9 w-full rounded-md border border-input bg-background" value={draft.sport} onChange={e => setDraft({ ...draft, sport: e.target.value, faults: [] })}>{['both', 'baseball', 'softball'].map(sport => <option key={sport}>{sport}</option>)}</select></label>
        <label className="space-y-1 text-sm">Skill<select aria-label="Video skill" className="h-9 w-full rounded-md border border-input bg-background" value={draft.domain} onChange={e => setDraft({ ...draft, domain: e.target.value, faults: [] })}>{['hitting', 'pitching', 'throwing', 'fielding', 'base_running'].map(domain => <option key={domain} value={domain}>{domain.replace('_', ' ')}</option>)}</select></label></div>
        <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">Where it appears</legend>{(Object.keys(INFO_PLACEMENTS) as InfoPlacement[]).map(place => <label key={place} className="flex items-center gap-2 text-sm"><Checkbox checked={draft.placements.includes(place)} onCheckedChange={checked => setDraft({ ...draft, placements: checked ? [...draft.placements, place] : draft.placements.filter(item => item !== place) })} />{INFO_PLACEMENTS[place]}</label>)}</fieldset>
        {draft.placements.some(place => place === 'after_analysis' || place === 'recurring') && <fieldset className="max-h-48 space-y-2 overflow-y-auto"><legend className="text-sm font-semibold">Matching findings</legend>{keys.map(key => <label key={key} className="flex items-center gap-2 text-sm"><Checkbox checked={draft.faults.includes(key)} onCheckedChange={checked => setDraft({ ...draft, faults: checked ? [...draft.faults, key] : draft.faults.filter(item => item !== key) })} />{key.replace(/_/g, ' ')}</label>)}</fieldset>}
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={draft.active} onCheckedChange={checked => setDraft({ ...draft, active: Boolean(checked) })} />Show when it matches</label>
        {draft.url && <VideoPlayer videoUrl={draft.url} videoType="external" title={draft.title} />}
      </div>}
      <DialogFooter><Button variant="outline" disabled={saving || uploading} onClick={() => setDraft(null)}>Cancel</Button><Button disabled={saving || uploading} onClick={() => void save()}>{saving || uploading ? 'Saving…' : 'Save video'}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div></DashboardLayout>;
}