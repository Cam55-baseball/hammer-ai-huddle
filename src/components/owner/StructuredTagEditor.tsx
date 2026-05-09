import { useMemo } from 'react';
import { Zap } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVideoTaxonomy, groupTaxonomyByLayer } from '@/hooks/useVideoTaxonomy';
import type { SkillDomain, TagLayer } from '@/lib/videoRecommendationEngine';
import { LAYER_GUIDANCE } from './TaxonomyManager';
import { HammerDescriptionComposer } from './HammerDescriptionComposer';

const VIDEO_FORMATS = ['drill', 'game_at_bat', 'practice_rep', 'breakdown', 'slow_motion', 'pov', 'comparison'];
const SKILL_DOMAINS: SkillDomain[] = ['hitting', 'fielding', 'throwing', 'base_running', 'pitching'];

const LAYER_LABELS: Record<TagLayer, string> = {
  movement_pattern: 'Movement Patterns',
  result: 'Result Tags',
  context: 'Context Tags',
  correction: 'Correction / Intent',
};

// Tag weight model: tap-to-cycle. None → Normal (1) → Boost (3) → None.
const NORMAL_WEIGHT = 1;
const BOOST_WEIGHT = 3;

export interface StructuredTagState {
  videoFormat: string;
  skillDomains: SkillDomain[];
  aiDescription: string;
  tagAssignments: Record<string, number>; // tagId -> weight (1 = normal, 3 = boosted)
}

interface Props {
  value: StructuredTagState;
  onChange: (next: StructuredTagState) => void;
}

export function StructuredTagEditor({ value, onChange }: Props) {
  const primaryDomain = value.skillDomains[0];
  const { data: taxonomy = [] } = useVideoTaxonomy(primaryDomain);

  const grouped = useMemo(() => groupTaxonomyByLayer(taxonomy), [taxonomy]);

  const toggleDomain = (d: SkillDomain) => {
    const next = value.skillDomains.includes(d)
      ? value.skillDomains.filter(x => x !== d)
      : [...value.skillDomains, d];
    onChange({ ...value, skillDomains: next });
  };

  // Tap cycles: None → Normal → Boost → None
  const cycleTag = (tagId: string) => {
    const next = { ...value.tagAssignments };
    const cur = next[tagId];
    if (cur == null) next[tagId] = NORMAL_WEIGHT;
    else if (cur < BOOST_WEIGHT) next[tagId] = BOOST_WEIGHT;
    else delete next[tagId];
    onChange({ ...value, tagAssignments: next });
  };

  return (
    <div className="space-y-5 border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Structured Tagging (required)</h4>
        <Badge variant="outline" className="text-[10px]">6-Layer Engine</Badge>
      </div>

      {/* Layer 1: Video format */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Video Format *</Label>
          <Select value={value.videoFormat} onValueChange={v => onChange({ ...value, videoFormat: v })}>
            <SelectTrigger className="h-8"><SelectValue placeholder="Select format" /></SelectTrigger>
            <SelectContent>
              {VIDEO_FORMATS.map(f => <SelectItem key={f} value={f} className="capitalize text-xs">{f.replace(/_/g, ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Layer 2: Skill domains */}
        <div className="space-y-1.5">
          <Label className="text-xs">Skill Domains *</Label>
          <div className="flex flex-wrap gap-1">
            {SKILL_DOMAINS.map(d => (
              <Badge
                key={d}
                variant={value.skillDomains.includes(d) ? 'default' : 'outline'}
                className="cursor-pointer text-[10px] capitalize"
                onClick={() => toggleDomain(d)}
              >
                {d.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Layers 3-6: Taxonomy tags — tap to cycle Normal → Boost → Off */}
      {primaryDomain ? (
        <div className="space-y-3">
          <p className="text-[10px] text-muted-foreground -mb-1">
            Tap a tag to add it. Tap again to <span className="font-semibold text-primary">Boost</span> ⚡ (treated as a strong signal).
          </p>
          {(['movement_pattern', 'result', 'context', 'correction'] as TagLayer[]).map(layer => (
            <div key={layer} className="space-y-1.5">
              <Label className="text-xs">{LAYER_LABELS[layer]}{layer === 'movement_pattern' ? ' *' : ''}</Label>
              <p className="text-[10px] text-muted-foreground -mt-1">{LAYER_GUIDANCE[layer].short}</p>
              <div className="flex flex-wrap gap-1">
                {grouped[layer].map(tag => {
                  const w = value.tagAssignments[tag.id];
                  const selected = w != null;
                  const boosted = selected && w >= BOOST_WEIGHT;
                  return (
                    <Badge
                      key={tag.id}
                      variant={selected ? 'default' : 'outline'}
                      className={`cursor-pointer text-[10px] gap-0.5 ${boosted ? 'ring-2 ring-primary/60' : ''}`}
                      onClick={() => cycleTag(tag.id)}
                    >
                      {boosted && <Zap className="h-2.5 w-2.5" />}
                      {tag.label}
                    </Badge>
                  );
                })}
                {grouped[layer].length === 0 && (
                  <span className="text-[10px] text-muted-foreground italic">No tags yet — add some in Taxonomy tab.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground italic">Select a skill domain to see its tag taxonomy.</p>
      )}

      {/* Hammer description — chip composer (no typing) */}
      <HammerDescriptionComposer
        value={value.aiDescription}
        onChange={text => onChange({ ...value, aiDescription: text })}
      />
    </div>
  );
}

export const emptyStructuredTagState: StructuredTagState = {
  videoFormat: '',
  skillDomains: [],
  aiDescription: '',
  tagAssignments: {},
};
