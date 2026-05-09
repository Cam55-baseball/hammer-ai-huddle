import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  FOUNDATION_DOMAINS, FOUNDATION_SCOPES, FOUNDATION_AUDIENCES, FOUNDATION_TRIGGERS,
  FOUNDATION_LABELS, type FoundationMeta, type FoundationDomain, type FoundationScope,
  type FoundationAudience, type FoundationTrigger,
} from '@/lib/foundationVideos';
import { HammerDescriptionComposer } from './HammerDescriptionComposer';

interface Props {
  value: FoundationMeta;
  onChange: (next: FoundationMeta) => void;
  aiDescription: string;
  onDescriptionChange: (text: string) => void;
}

export function FoundationTagEditor({ value, onChange, aiDescription, onDescriptionChange }: Props) {
  const setDomain = (d: FoundationDomain) => onChange({ ...value, domain: d });
  const setScope = (s: FoundationScope) => onChange({ ...value, scope: s });

  const toggleAudience = (a: FoundationAudience) => {
    const has = value.audience_levels.includes(a);
    onChange({
      ...value,
      audience_levels: has
        ? value.audience_levels.filter(x => x !== a)
        : [...value.audience_levels, a],
    });
  };

  const toggleTrigger = (t: FoundationTrigger) => {
    const has = value.refresher_triggers.includes(t);
    onChange({
      ...value,
      refresher_triggers: has
        ? value.refresher_triggers.filter(x => x !== t)
        : [...value.refresher_triggers, t],
    });
  };

  return (
    <div className="space-y-5 border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Foundation Video (A–Z philosophy)</h4>
        <Badge variant="outline" className="text-[10px]">Long-form refresher</Badge>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-3">
        Foundation videos skip the per-rep tag taxonomy and surface when athletes need a refresher.
        Pick the chips below — that's all the tagging.
      </p>

      <div className="space-y-1.5">
        <Label className="text-xs">Domain *</Label>
        <div className="flex flex-wrap gap-1">
          {FOUNDATION_DOMAINS.map(d => (
            <Badge
              key={d}
              variant={value.domain === d ? 'default' : 'outline'}
              className="cursor-pointer text-[10px]"
              onClick={() => setDomain(d)}
            >
              {FOUNDATION_LABELS.domain[d]}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Scope *</Label>
        <div className="flex flex-wrap gap-1">
          {FOUNDATION_SCOPES.map(s => (
            <Badge
              key={s}
              variant={value.scope === s ? 'default' : 'outline'}
              className="cursor-pointer text-[10px]"
              onClick={() => setScope(s)}
            >
              {FOUNDATION_LABELS.scope[s]}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Audience Level * (multi)</Label>
        <div className="flex flex-wrap gap-1">
          {FOUNDATION_AUDIENCES.map(a => {
            const on = value.audience_levels.includes(a);
            return (
              <Badge
                key={a}
                variant={on ? 'default' : 'outline'}
                className="cursor-pointer text-[10px]"
                onClick={() => toggleAudience(a)}
              >
                {FOUNDATION_LABELS.audience[a]}
              </Badge>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Refresher Triggers * (when Hammer should suggest this)</Label>
        <p className="text-[10px] text-muted-foreground -mt-1">
          Pick every situation this video helps — Hammer will surface it automatically when an athlete hits one.
        </p>
        <div className="flex flex-wrap gap-1">
          {FOUNDATION_TRIGGERS.map(t => {
            const on = value.refresher_triggers.includes(t);
            return (
              <Badge
                key={t}
                variant={on ? 'default' : 'outline'}
                className="cursor-pointer text-[10px]"
                onClick={() => toggleTrigger(t)}
              >
                {FOUNDATION_LABELS.trigger[t]}
              </Badge>
            );
          })}
        </div>
      </div>

      <HammerDescriptionComposer
        value={aiDescription}
        onChange={onDescriptionChange}
      />
    </div>
  );
}

export function isFoundationMetaValid(m: FoundationMeta): boolean {
  return Boolean(m.domain) && Boolean(m.scope)
    && m.audience_levels.length > 0
    && m.refresher_triggers.length > 0;
}
