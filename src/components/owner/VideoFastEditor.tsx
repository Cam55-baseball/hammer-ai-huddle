import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Wand2, Zap, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVideoLibraryAdmin } from "@/hooks/useVideoLibraryAdmin";
import { useVideoTaxonomy, groupTaxonomyByLayer } from "@/hooks/useVideoTaxonomy";
import { supabase } from "@/integrations/supabase/client";
import type { LibraryVideo } from "@/hooks/useVideoLibrary";
import type { SkillDomain, TagLayer } from "@/lib/videoRecommendationEngine";
import { computeMissingFields } from "@/lib/videoReadiness";
import { computeVideoConfidence } from "@/lib/videoConfidence";
import { getSmartDefaults } from "@/lib/ownerLearning";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { HammerDescriptionComposer } from "./HammerDescriptionComposer";
import { toast } from "@/hooks/use-toast";

const VIDEO_FORMATS = ['drill', 'game_at_bat', 'practice_rep', 'breakdown', 'slow_motion', 'pov', 'comparison'];
const SKILL_DOMAINS: SkillDomain[] = ['hitting', 'fielding', 'throwing', 'base_running', 'pitching'];
const LAYER_LABELS: Record<TagLayer, string> = {
  movement_pattern: 'Movement', result: 'Result', context: 'Context', correction: 'Correction',
};
const NORMAL_WEIGHT = 1;
const BOOST_WEIGHT = 3;

interface Props {
  video: LibraryVideo;
  onSuccess: () => void;
  onCancel: () => void;
  /** Phase 6 — focus a specific missing field on mount. */
  initialFocus?: 'video_format' | 'skill_domains' | 'ai_description' | 'tag_assignments' | string;
  /** Phase 6 — auto-run Hammer suggestions on mount (still NOT applied). */
  autoOpenSuggestions?: boolean;
}

/**
 * Compact, keyboard-first editor for elite owners.
 * - Single-pane layout (no scroll on most screens)
 * - All 4 engine fields visible at once
 * - Cmd/Ctrl+Enter saves, Esc cancels
 * - Smart defaults pre-applied (format, primary domain) when video is empty
 */
export function VideoFastEditor({ video, onSuccess, onCancel, initialFocus, autoOpenSuggestions }: Props) {
  const { updateStructuredFields, syncTagAssignments, regenerateAISuggestions, uploading } = useVideoLibraryAdmin();

  const defaults = useMemo(() => getSmartDefaults(), []);

  const [videoFormat, setVideoFormat] = useState<string>(
    video.video_format || defaults.topFormat || ''
  );
  const [skillDomains, setSkillDomains] = useState<SkillDomain[]>(
    (video.skill_domains as SkillDomain[]) || (defaults.topDomains.slice(0, 1) as SkillDomain[]) || []
  );
  const [aiDescription, setAiDescription] = useState<string>(video.ai_description || '');
  const [assignments, setAssignments] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [regen, setRegen] = useState(false);
  const initialConfRef = useRef<number | null>(null);

  const primaryDomain = skillDomains[0];
  const { data: taxonomy = [] } = useVideoTaxonomy(primaryDomain);
  const grouped = useMemo(() => groupTaxonomyByLayer(taxonomy), [taxonomy]);

  const descRef = useRef<HTMLTextAreaElement>(null);
  const formatRef = useRef<HTMLDivElement>(null);
  const domainsRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);

  // Load existing assignments
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('video_tag_assignments')
        .select('tag_id, weight')
        .eq('video_id', video.id);
      if (data) {
        const map: Record<string, number> = {};
        for (const r of data) map[r.tag_id] = r.weight;
        setAssignments(map);
      }
    })();
  }, [video.id]);

  // Phase 6 — focus the requested field, falling back to description.
  useEffect(() => {
    requestAnimationFrame(() => {
      const target = initialFocus;
      if (target === 'video_format') formatRef.current?.scrollIntoView({ block: 'center' });
      else if (target === 'skill_domains') domainsRef.current?.scrollIntoView({ block: 'center' });
      else if (target === 'tag_assignments') tagsRef.current?.scrollIntoView({ block: 'center' });
      else descRef.current?.focus();
    });
  }, [initialFocus]);

  const layersCovered = useMemo<TagLayer[]>(() => {
    const layers: TagLayer[] = [];
    for (const t of taxonomy) {
      if (assignments[t.id] != null) layers.push(t.layer);
    }
    return layers;
  }, [assignments, taxonomy]);

  const conf = computeVideoConfidence({
    videoFormat,
    skillDomains,
    aiDescription,
    layersCovered,
    assignmentCount: Object.keys(assignments).length,
  });

  // Capture the very first non-zero confidence for the save-preview delta.
  if (initialConfRef.current === null && conf.score > 0) initialConfRef.current = conf.score;

  const missing = computeMissingFields({
    videoFormat,
    skillDomains,
    aiDescription,
    assignmentCount: Object.keys(assignments).length,
  });
  const isReady = missing.length === 0;
  const canAutoSuggest = aiDescription.trim().length >= 20;

  // Phase 6 — per-field "what you'd gain" deltas (matches videoConfidence weights).
  const deltaFor = (key: string): number | null => {
    if (key === 'video_format' && !videoFormat) return 15;
    if (key === 'skill_domains' && skillDomains.length === 0) return 15;
    if (key === 'ai_description') {
      const len = aiDescription.trim().length;
      if (len < 20) return 10;
      if (len < 60) return 10; // bump to 20
      if (len < 140) return 5;  // bump to 25
    }
    if (key === 'tag_assignments') {
      const n = Object.keys(assignments).length;
      if (n === 0) return 12;
      if (n === 1) return 7;
      if (n < 6) return 8; // diversity boost potential
    }
    return null;
  };

  const toggleDomain = (d: SkillDomain) =>
    setSkillDomains(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);

  const toggleAssignment = (id: string) =>
    setAssignments(p => {
      const n = { ...p };
      if (n[id] != null) delete n[id]; else n[id] = 3;
      return n;
    });

  const handleAutoSuggest = async () => {
    if (!canAutoSuggest) return;
    setRegen(true);
    await updateStructuredFields(video.id, { aiDescription });
    await regenerateAISuggestions(video.id);
    setRegen(false);
  };

  // Phase 6 — autoOpenSuggestions: run once on mount when description is rich enough.
  // Suggestions land in the suggestions table — owner still must click to adopt.
  const autoSuggestRanRef = useRef(false);
  useEffect(() => {
    if (!autoOpenSuggestions || autoSuggestRanRef.current) return;
    if (aiDescription.trim().length >= 20) {
      autoSuggestRanRef.current = true;
      void handleAutoSuggest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenSuggestions, aiDescription]);

  const handleSave = async () => {
    if (!isReady) {
      toast({ title: 'Not ready', description: missing.map(m => m.message).join(' · '), variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const okStruct = await updateStructuredFields(video.id, {
        videoFormat: videoFormat || null,
        skillDomains,
        aiDescription,
      });
      if (!okStruct) return;
      const okAssign = await syncTagAssignments(video.id, assignments);
      if (!okAssign) return;
      toast({ title: 'Saved', description: `Confidence ${conf.score} · ${conf.tier}` });
      onSuccess();
    } finally {
      setSaving(false);
    }
  };

  // Keyboard: Cmd/Ctrl+Enter = save, Esc = cancel
  // Re-attaches each render so it always has the latest closures (handleSave / onCancel
  // capture current state). Cleanup runs every render — no leak.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void handleSave();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const isProcessing = saving || uploading;

  return (
    <Card className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Zap className="h-3 w-3 text-primary" /> Fast Mode · {video.title.slice(0, 40)}
          </p>
        </div>
        <ConfidenceBadge score={conf.score} tier={conf.tier} />
      </div>

      {/* 2-column engine fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1" ref={formatRef}>
          <div className="flex items-center justify-between">
            <Label className="text-[10px]">Format</Label>
            {deltaFor('video_format') && (
              <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">+{deltaFor('video_format')}</span>
            )}
          </div>
          <Select value={videoFormat} onValueChange={setVideoFormat} disabled={isProcessing}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick format" /></SelectTrigger>
            <SelectContent>
              {VIDEO_FORMATS.map(f => (
                <SelectItem key={f} value={f} className="capitalize text-xs">
                  {f.replace(/_/g, ' ')}
                  {defaults.topFormat === f && <span className="ml-1 text-[9px] text-muted-foreground">· suggested</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1" ref={domainsRef}>
          <div className="flex items-center justify-between">
            <Label className="text-[10px]">Skill Domains</Label>
            {deltaFor('skill_domains') && (
              <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">+{deltaFor('skill_domains')}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {SKILL_DOMAINS.map(d => (
              <Badge
                key={d}
                variant={skillDomains.includes(d) ? 'default' : 'outline'}
                className="cursor-pointer text-[10px] capitalize"
                onClick={() => !isProcessing && toggleDomain(d)}
              >
                {d.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] flex items-center gap-1.5">
            Description
            {deltaFor('ai_description') && (
              <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">+{deltaFor('ai_description')}</span>
            )}
          </Label>
          <Button
            size="sm" variant="ghost" className="h-6 text-[10px] px-1.5"
            disabled={!canAutoSuggest || regen || isProcessing}
            onClick={handleAutoSuggest}
          >
            {regen ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
            Run Hammer Suggestions
          </Button>
        </div>
        <OwnerAuthorityNote compact className="block" />
        <Textarea
          ref={descRef}
          value={aiDescription}
          onChange={e => setAiDescription(e.target.value)}
          placeholder="What this video teaches, in one or two sentences."
          rows={2}
          className="text-xs"
          disabled={isProcessing}
        />
      </div>

      {/* Tags */}
      <div className="space-y-1" ref={tagsRef}>
        <div className="flex items-center justify-between">
          <Label className="text-[10px]">Tags ({Object.keys(assignments).length})</Label>
          {deltaFor('tag_assignments') && (
            <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">+{deltaFor('tag_assignments')}</span>
          )}
        </div>
        {!primaryDomain ? (
          <p className="text-[10px] text-muted-foreground italic">Pick a domain to load tags.</p>
        ) : (
          <div className="space-y-1.5 max-h-44 overflow-y-auto rounded border bg-background/50 p-2">
            {(['movement_pattern', 'result', 'context', 'correction'] as TagLayer[]).map(layer => (
              <div key={layer}>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase">{LAYER_LABELS[layer]}</p>
                <div className="flex flex-wrap gap-1">
                  {grouped[layer].length === 0 ? (
                    <span className="text-[10px] text-muted-foreground italic">none</span>
                  ) : grouped[layer].map(tag => (
                    <Badge
                      key={tag.id}
                      variant={assignments[tag.id] != null ? 'default' : 'outline'}
                      className="cursor-pointer text-[10px]"
                      onClick={() => !isProcessing && toggleAssignment(tag.id)}
                    >
                      {tag.label}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1 border-t">
        <p className="text-[10px] text-muted-foreground">
          {isReady ? `⌘↵ to save` : missing.map(m => m.message).join(' · ')}
          {initialConfRef.current !== null && conf.score !== initialConfRef.current && (
            <span className="ml-2 font-semibold text-foreground">
              · Confidence {initialConfRef.current} → {conf.score}
            </span>
          )}
        </p>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isProcessing}>
            <X className="h-3.5 w-3.5 mr-1" /> Esc
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isProcessing || !isReady}>
            {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Save
          </Button>
        </div>
      </div>
    </Card>
  );
}
