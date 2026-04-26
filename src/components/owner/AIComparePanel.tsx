import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Sparkles, Check, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { TaxonomyTag } from "@/lib/videoRecommendationEngine";
import { TagWhyPopover, type TagWhyMeta } from "./TagWhyPopover";
import { OwnerAuthorityNote } from "@/lib/ownerAuthority";

interface SuggestionRow {
  id: string;
  layer: string;
  suggested_key: string;
  confidence: number;
  reasoning: string | null;
  status: string;
}

interface Props {
  videoId: string;
  taxonomy: TaxonomyTag[];
  /** Current owner-picked tag IDs (live from VideoEditForm). */
  ownerTagIds: string[];
  /** One-click "Add" action — reuses VideoEditForm's toggleAssignment. */
  onAdoptTag: (tagId: string) => void;
}

export function AIComparePanel({ videoId, taxonomy, ownerTagIds, onAdoptTag }: Props) {
  const [open, setOpen] = useState(false);

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['ai-compare', videoId],
    enabled: open,
    staleTime: 30_000,
    queryFn: async (): Promise<SuggestionRow[]> => {
      const { data, error } = await (supabase as any)
        .from('video_tag_suggestions')
        .select('id, layer, suggested_key, confidence, reasoning, status')
        .eq('video_id', videoId)
        .order('confidence', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SuggestionRow[];
    },
  });

  // Map (layer:key) → taxonomy tag for fast lookup
  const taxonomyByKey = useMemo(() => {
    const m = new Map<string, TaxonomyTag>();
    for (const t of taxonomy) m.set(`${t.layer}:${t.key}`, t);
    return m;
  }, [taxonomy]);

  const { matching, missing, ownerOnly } = useMemo(() => {
    const ownerSet = new Set(ownerTagIds);
    const aiTagIds = new Set<string>();
    const aiMeta = new Map<string, { tag: TaxonomyTag; sugg: SuggestionRow }>();

    for (const s of suggestions ?? []) {
      const tag = taxonomyByKey.get(`${s.layer}:${s.suggested_key}`);
      if (!tag) continue;
      aiTagIds.add(tag.id);
      // keep the highest-confidence row per tag
      const existing = aiMeta.get(tag.id);
      if (!existing || s.confidence > existing.sugg.confidence) {
        aiMeta.set(tag.id, { tag, sugg: s });
      }
    }

    const matching: Array<{ tag: TaxonomyTag; sugg: SuggestionRow }> = [];
    const missing: Array<{ tag: TaxonomyTag; sugg: SuggestionRow }> = [];
    const ownerOnly: TaxonomyTag[] = [];

    for (const [id, m] of aiMeta) {
      if (ownerSet.has(id)) matching.push(m);
      else missing.push(m);
    }

    for (const id of ownerSet) {
      if (!aiTagIds.has(id)) {
        const tag = taxonomy.find(t => t.id === id);
        if (tag) ownerOnly.push(tag);
      }
    }

    matching.sort((a, b) => b.sugg.confidence - a.sugg.confidence);
    missing.sort((a, b) => b.sugg.confidence - a.sugg.confidence);

    return { matching, missing, ownerOnly };
  }, [suggestions, taxonomyByKey, ownerTagIds, taxonomy]);

  const metaFor = (tag: TaxonomyTag, sugg?: SuggestionRow): TagWhyMeta => ({
    label: tag.label,
    layer: tag.layer,
    key: tag.key,
    description: (tag as any).description ?? null,
    reasoning: sugg?.reasoning ?? null,
    confidence: sugg?.confidence ?? null,
  });

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <Label className="text-xs flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Compare with Hammer
          </Label>
          <OwnerAuthorityNote />
        </div>
        <Switch checked={open} onCheckedChange={setOpen} />
      </div>

      {open && (
        <>
          {isLoading ? (
            <p className="text-[11px] text-muted-foreground italic">Loading Hammer suggestions…</p>
          ) : !suggestions || suggestions.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">
              No Hammer suggestions yet. Click <span className="font-medium">Auto-Suggest Tags</span> above.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Matching */}
              <Section
                title="Matching"
                count={matching.length}
                empty="No overlap yet."
                tone="emerald"
              >
                {matching.map(({ tag, sugg }) => (
                  <span key={tag.id} className="inline-flex items-center gap-0.5">
                    <Badge className="text-[10px] gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20">
                      <Check className="h-3 w-3" />
                      {tag.label}
                      <span className="opacity-70">{Math.round(sugg.confidence * 100)}%</span>
                    </Badge>
                    <TagWhyPopover meta={metaFor(tag, sugg)} />
                  </span>
                ))}
              </Section>

              {/* AI suggested, owner missed */}
              <Section
                title="Hammer suggested · you missed"
                count={missing.length}
                empty="You caught them all."
                tone="amber"
              >
                {missing.map(({ tag, sugg }) => (
                  <span key={tag.id} className="inline-flex items-center gap-0.5">
                    <Badge
                      variant="outline"
                      className="text-[10px] gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400"
                    >
                      {tag.label}
                      <span className="opacity-70">{Math.round(sugg.confidence * 100)}%</span>
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      title="Add this tag"
                      onClick={() => onAdoptTag(tag.id)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <TagWhyPopover meta={metaFor(tag, sugg)} />
                  </span>
                ))}
              </Section>

              {/* Owner picked, AI didn't */}
              <Section
                title="Owner picks · Hammer skipped"
                count={ownerOnly.length}
                empty="Every owner pick has Hammer support."
                tone="neutral"
              >
                {ownerOnly.map(tag => (
                  <span key={tag.id} className="inline-flex items-center gap-0.5">
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <User className="h-3 w-3" />
                      {tag.label}
                    </Badge>
                    <TagWhyPopover meta={metaFor(tag)} />
                  </span>
                ))}
              </Section>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  tone,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  tone: 'emerald' | 'amber' | 'neutral';
  children: React.ReactNode;
}) {
  const dot =
    tone === 'emerald' ? 'bg-emerald-500'
    : tone === 'amber' ? 'bg-amber-500'
    : 'bg-muted-foreground/40';
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title} · {count}
        </p>
      </div>
      {count === 0 ? (
        <p className="text-[10px] text-muted-foreground italic pl-3">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1 pl-3">{children}</div>
      )}
    </div>
  );
}
