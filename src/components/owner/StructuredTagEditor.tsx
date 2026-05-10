import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVideoTaxonomy, groupTaxonomyByLayer } from '@/hooks/useVideoTaxonomy';
import type { SkillDomain, TagLayer } from '@/lib/videoRecommendationEngine';
import { LAYER_GUIDANCE } from './TaxonomyManager';
import { HammerDescriptionComposer } from './HammerDescriptionComposer';
import { FormulaLinkageEditor, type FormulaLinkageValue, emptyFormulaLinkage } from './FormulaLinkageEditor';

const VIDEO_FORMATS = ['drill', 'game_at_bat', 'practice_rep', 'breakdown', 'slow_motion', 'pov', 'comparison'];
const SKILL_DOMAINS: SkillDomain[] = ['hitting', 'fielding', 'throwing', 'base_running', 'pitching'];

const LAYER_LABELS: Record<TagLayer, string> = {
  movement_pattern: 'Movement Patterns',
  result: 'Result Tags',
  context: 'Context Tags',
  correction: 'Correction / Intent',
};

// Explicit weight model: 1 = Normal, 3 = Strong, 5 = Max priority.
const WEIGHT_OPTIONS = [1, 3, 5] as const;
const DEFAULT_WEIGHT = 1;

export interface StructuredTagState {
  videoFormat: string;
  skillDomains: SkillDomain[];
  aiDescription: string;
  tagAssignments: Record<string, number>; // tagId -> weight (1 / 3 / 5)
  formulaLinkage: FormulaLinkageValue;
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

  const toggleTag = (tagId: string) => {
    const next = { ...value.tagAssignments };
    if (next[tagId] != null) delete next[tagId];
    else next[tagId] = DEFAULT_WEIGHT;
    onChange({ ...value, tagAssignments: next });
  };
  const setWeight = (tagId: string, weight: number) => {
    onChange({ ...value, tagAssignments: { ...value.tagAssignments, [tagId]: weight } });
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

      {/* Coach's Notes to Hammer — freeform primary */}
      <div className="space-y-1.5">
        <Label className="text-xs">Coach's Notes to Hammer *</Label>
        <p className="text-[10px] text-muted-foreground -mt-0.5">
          Talk to Hammer in your own voice. Tell it who this video is for, what it teaches, and the fault it fixes.
        </p>
        <Textarea
          value={value.aiDescription}
          onChange={e => onChange({ ...value, aiDescription: e.target.value })}
          placeholder="e.g. Best for advanced hitters rolling over inside fastballs due to early hand drift…"
          rows={4}
          className="text-xs"
        />
        <details className="group rounded-md border border-border/60 bg-background/40">
          <summary className="cursor-pointer list-none px-2 py-1.5 text-[10px] text-muted-foreground select-none flex items-center gap-1.5 hover:text-foreground">
            <span className="transition-transform group-open:rotate-90">▸</span>
            Quick-fill helpers (optional)
          </summary>
          <div className="p-2 border-t border-border/60">
            <HammerDescriptionComposer
              value=""
              onChange={(text) => {
                if (!text) return;
                const cur = value.aiDescription.trim();
                onChange({ ...value, aiDescription: cur ? `${cur}\n\n${text}` : text });
              }}
              compact
            />
          </div>
        </details>
      </div>

      {/* Formula Linkage */}
      <FormulaLinkageEditor
        domains={value.skillDomains}
        value={value.formulaLinkage}
        onChange={(next) => onChange({ ...value, formulaLinkage: next })}
      />

      {/* Layers 3-6: Taxonomy tags with explicit 1 / 3 / 5 weights */}
      {primaryDomain ? (
        <div className="space-y-3">
          <p className="text-[10px] text-muted-foreground -mb-1">
            Tap a tag to add it. Choose <span className="font-semibold">1</span> normal, <span className="font-semibold">3</span> strong, <span className="font-semibold">5</span> max priority.
          </p>
          {(['movement_pattern', 'result', 'context', 'correction'] as TagLayer[]).map(layer => (
            <div key={layer} className="space-y-1.5">
              <Label className="text-xs">{LAYER_LABELS[layer]}{layer === 'movement_pattern' ? ' *' : ''}</Label>
              <p className="text-[10px] text-muted-foreground -mt-1">{LAYER_GUIDANCE[layer].short}</p>
              <div className="flex flex-wrap gap-1.5">
                {grouped[layer].map(tag => {
                  const w = value.tagAssignments[tag.id];
                  const selected = w != null;
                  return (
                    <div key={tag.id} className="inline-flex items-center gap-0.5">
                      <Badge
                        variant={selected ? 'default' : 'outline'}
                        className="cursor-pointer text-[10px]"
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.label}
                      </Badge>
                      {selected && (
                        <div className="inline-flex rounded border border-border overflow-hidden">
                          {WEIGHT_OPTIONS.map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setWeight(tag.id, val)}
                              className={`px-1.5 text-[9px] font-medium transition-colors ${
                                w === val ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
                              }`}
                              title={val === 5 ? 'Max priority' : val === 3 ? 'Strong' : 'Normal'}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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
    </div>
  );
}

export const emptyStructuredTagState: StructuredTagState = {
  videoFormat: '',
  skillDomains: [],
  aiDescription: '',
  tagAssignments: {},
  formulaLinkage: emptyFormulaLinkage,
};
