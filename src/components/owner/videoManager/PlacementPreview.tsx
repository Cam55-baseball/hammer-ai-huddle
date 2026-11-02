import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { matchInfoVideos, INFO_PLACEMENTS, infoPlacementTag, type InfoPlacement, type InfoVideo } from '@/lib/videoMoments/informational';
import { GATING_DIMENSIONS, VIDEO_DIMENSIONS, type PlayerDimensions } from '@/lib/videoMoments/videoDimensions';
import { useVideoTagVocabulary } from '@/hooks/useVideoTagVocabulary';

/** Owner Nov 2: preview where, and for which kind of player, this video would be prescribed.
 *  Runs the SAME matcher the player screens use, with an owner-built sample player. */
export function PlacementPreview({ video }: { video: InfoVideo }) {
  const vocab = useVideoTagVocabulary();
  const [sport, setSport] = useState<'baseball' | 'softball'>('baseball');
  const [player, setPlayer] = useState<PlayerDimensions>({ program: ['5tool'], position: ['hitter', 'runner', 'infielder'], level: ['high_school'], progression: ['intermediate'], pitcher_role: [] });
  const [developed, setDeveloped] = useState(false);
  const toggle = (dimension: typeof GATING_DIMENSIONS[number], key: string) => {
    const now = player[dimension] ?? [];
    setPlayer({ ...player, [dimension]: now.includes(key) ? now.filter(k => k !== key) : [...now, key] });
  };
  const topics = video.topics ?? [];
  const faults = video.tags.filter(t => t.startsWith('info:fault:')).map(t => t.slice(11));
  const goals = video.tags.filter(t => t.startsWith('info:goal:')).map(t => t.slice(10).replace(/_/g, ' '));
  const placements = (Object.keys(INFO_PLACEMENTS) as InfoPlacement[]).filter(p => video.tags.includes(infoPlacementTag(p)));
  const result = placements.map(placement => ({ placement, shown: matchInfoVideos([{ ...video, distribution_tier: 'normal' }], {
    placement, sport, allowedDomains: video.skill_domains ?? [], faultKeys: faults, goals, developed, player, topics,
    careAreas: topics.filter(t => t.startsWith('tissue_care:context:')).map(t => t.split(':')[2]),
    careTypes: topics.filter(t => t.startsWith('tissue_care:movement_pattern:')).map(t => t.split(':')[2]),
  }).length > 0 }));
  return <section aria-label="Placement preview" className="space-y-2 rounded-md border border-border p-3">
    <p className="text-sm font-semibold">Preview: would this player see it?</p>
    <div className="flex flex-wrap gap-1">{(['baseball', 'softball'] as const).map(s => <button key={s} type="button" aria-pressed={sport === s} onClick={() => setSport(s)}><Badge variant={sport === s ? 'default' : 'outline'}>{s}</Badge></button>)}
      <button type="button" aria-pressed={developed} onClick={() => setDeveloped(!developed)}><Badge variant={developed ? 'default' : 'outline'}>Developed player</Badge></button></div>
    {GATING_DIMENSIONS.map(dimension => <div key={dimension} className="flex flex-wrap items-center gap-1"><span className="text-xs text-muted-foreground">{VIDEO_DIMENSIONS[dimension]}:</span>
      {(vocab.data?.dimensions ?? []).filter(v => v.dimension === dimension).map(v => { const on = (player[dimension] ?? []).includes(v.key);
        return <button key={v.key} type="button" aria-pressed={on} onClick={() => toggle(dimension, v.key)}><Badge variant={on ? 'secondary' : 'outline'}>{v.label}</Badge></button>; })}</div>)}
    {!placements.length ? <p className="text-sm text-muted-foreground">Pick where it appears to see a preview.</p>
      : <ul className="space-y-1 text-sm">{result.map(r => <li key={r.placement} data-preview={r.placement} data-shown={r.shown}>{INFO_PLACEMENTS[r.placement]}: <strong>{r.shown ? 'Shows' : 'Hidden'}</strong></li>)}</ul>}
    <p className="text-xs text-muted-foreground">Sport and program are always respected. Real players also need a matching finding, goal, Mind item or tissue area that day.</p>
  </section>;
}
