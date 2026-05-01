import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { useVideoTaxonomy, groupTaxonomyByLayer } from '@/hooks/useVideoTaxonomy';
import type { SkillDomain, TagLayer } from '@/lib/videoRecommendationEngine';
import { LAYER_GUIDANCE } from './TaxonomyManager';

const VIDEO_FORMATS = ['drill', 'game_at_bat', 'practice_rep', 'breakdown', 'slow_motion', 'pov', 'comparison'];
const SKILL_DOMAINS: SkillDomain[] = ['hitting', 'fielding', 'throwing', 'base_running', 'pitching'];

const LAYER_LABELS: Record<TagLayer, string> = {
  movement_pattern: 'Movement Patterns',
  result: 'Result Tags',
  context: 'Context Tags',
  correction: 'Correction / Intent',
};

export interface StructuredTagState {
  videoFormat: string;
  skillDomains: SkillDomain[];
  aiDescription: string;
  tagAssignments: Record<string, number>; // tagId -> weight
}

interface Props {
  value: StructuredTagState;
  onChange: (next: StructuredTagState) => void;
}

export function StructuredTagEditor({ value, onChange }: Props) {
  // Pull taxonomy for the union of selected domains (or all if none picked yet)
  const primaryDomain = value.skillDomains[0];
  const { data: taxonomy = [] } = useVideoTaxonomy(primaryDomain);

  const grouped = useMemo(() => groupTaxonomyByLayer(taxonomy), [taxonomy]);

  const toggleDomain = (d: SkillDomain) => {
    const next = value.skillDomains.includes(d)
      ? value.skillDomains.filter(x => x !== d)
      : [...value.skillDomains, d];
    onChange({ ...value, skillDomains: next });
  };

  const toggleTag = (tagId: string) => {
    const next = { ...value.tagAssignments };
    if (next[tagId] != null) delete next[tagId];
    else next[tagId] = 1;
    onChange({ ...value, tagAssignments: next });
  };

  const setWeight = (tagId: string, w: number) => {
    onChange({ ...value, tagAssignments: { ...value.tagAssignments, [tagId]: w } });
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

      {/* Layers 3-6: Taxonomy tags */}
      {primaryDomain ? (
        <div className="space-y-3">
          {(['movement_pattern', 'result', 'context', 'correction'] as TagLayer[]).map(layer => (
            <div key={layer} className="space-y-1.5">
              <Label className="text-xs">{LAYER_LABELS[layer]}{layer === 'movement_pattern' ? ' *' : ''}</Label>
              <p className="text-[10px] text-muted-foreground -mt-1">{LAYER_GUIDANCE[layer].short}</p>
              <div className="flex flex-wrap gap-1">
                {grouped[layer].map(tag => {
                  const selected = value.tagAssignments[tag.id] != null;
                  return (
                    <Badge
                      key={tag.id}
                      variant={selected ? 'default' : 'outline'}
                      className="cursor-pointer text-[10px]"
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.label}
                    </Badge>
                  );
                })}
                {grouped[layer].length === 0 && (
                  <span className="text-[10px] text-muted-foreground italic">No tags yet — add some in Taxonomy tab.</span>
                )}
              </div>
              {/* Weight sliders for selected tags in this layer */}
              {grouped[layer].filter(t => value.tagAssignments[t.id] != null).map(tag => (
                <div key={`w-${tag.id}`} className="flex items-center gap-2 pl-2">
                  <span className="text-[10px] w-32 truncate text-muted-foreground">{tag.label} weight</span>
                  <Slider
                    min={1} max={5} step={1}
                    value={[value.tagAssignments[tag.id]]}
                    onValueChange={([v]) => setWeight(tag.id, v)}
                    className="flex-1 max-w-[140px]"
                  />
                  <span className="text-[10px] w-4">{value.tagAssignments[tag.id]}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground italic">Select a skill domain to see its tag taxonomy.</p>
      )}

      {/* AI description */}
      <div className="space-y-1.5">
        <Label className="text-xs">Hammer Description (required) *</Label>
        <Textarea
          value={value.aiDescription}
          onChange={e => onChange({ ...value, aiDescription: e.target.value })}
          placeholder="Best for hitters rolling over on inside fastballs due to early hand drift. Focus on keeping barrel behind hands."
          rows={3}
          className="text-xs"
        />
        <p className="text-[10px] text-muted-foreground">
          Free text. Used by Hammer to refine recommendations beyond structured tags.
        </p>
      </div>
    </div>
  );
}

export const emptyStructuredTagState: StructuredTagState = {
  videoFormat: '',
  skillDomains: [],
  aiDescription: '',
  tagAssignments: {},
};
