import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Wand2, Zap, Save, X, Check, Sparkles, ArrowRight } from "lucide-react";
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
import { computeMissingFields, type MissingFieldKey } from "@/lib/videoReadiness";
import { computeVideoConfidence, computeFoundationConfidence } from "@/lib/videoConfidence";
import { getSmartDefaults, getFoundationSmartDefaults, recordFoundationChoice } from "@/lib/ownerLearning";
import {
  EMPTY_FOUNDATION_META,
  parseFoundationMeta,
  type FoundationMeta,
} from "@/lib/foundationVideos";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { HammerDescriptionComposer } from "./HammerDescriptionComposer";
import { FoundationTagEditor } from "./FoundationTagEditor";
import { toast } from "@/hooks/use-toast";

const VIDEO_FORMATS = ['drill', 'game_at_bat', 'practice_rep', 'breakdown', 'slow_motion', 'pov', 'comparison'];
const SKILL_DOMAINS: SkillDomain[] = ['hitting', 'fielding', 'throwing', 'base_running', 'pitching'];
const LAYER_LABELS: Record<TagLayer, string> = {
  movement_pattern: 'Movement', result: 'Result', context: 'Context', correction: 'Correction',
};
const NORMAL_WEIGHT = 1;
const BOOST_WEIGHT = 3;
const SUGGEST_MIN_CHARS = 20;

const FIELD_LABEL: Record<MissingFieldKey, string> = {
  video_format: 'Format',
  skill_domains: 'Skill domains',
  ai_description: 'Description',
  tag_assignments: 'Tags',
  foundation_domain: 'Foundation topic',
  foundation_scope: 'Foundation scope',
  foundation_audience: 'Audience level',
  foundation_triggers: 'Refresher triggers',
};

interface InlineSuggestion {
  id: string;
  layer: string;
  suggested_key: string;
  confidence: number;
  reasoning: string | null;
}

interface Props {
  video: LibraryVideo;
  onSuccess: () => void;
  onCancel: () => void;
  /** Focus (and highlight) a specific missing field on mount. */
  initialFocus?: MissingFieldKey | string;
  /** Auto-run Hammer suggestions on mount (results reviewed inline, never auto-applied). */
  autoOpenSuggestions?: boolean;
  /** Apply owner smart defaults to empty fields on mount and announce it. */
  applySmartDefaults?: boolean;
  /** Step through the missing fields one at a time. */
  walkMissing?: boolean;
}

/**
 * Compact, keyboard-first editor for elite owners.
 * - Class-aware: foundation videos edit their chip set, application videos the per-rep set
 * - Missing-field walker actually focuses + highlights the field
 * - Hammer suggestions are reviewed inline (Accept / Reject) — nothing auto-saves
 */
export function VideoFastEditor({
  video, onSuccess, onCancel, initialFocus, autoOpenSuggestions, applySmartDefaults, walkMissing,
}: Props) {
  const { updateStructuredFields, syncTagAssignments, regenerateAISuggestions, uploading } = useVideoLibraryAdmin();

  const defaults = useMemo(() => getSmartDefaults(), []);
  const fDefaults = useMemo(() => getFoundationSmartDefaults(), []);

  const [videoClass, setVideoClass] = useState<'application' | 'foundation'>(
    (video as any).video_class === 'foundation' ? 'foundation' : 'application'
  );
  const isFoundation = videoClass === 'foundation';

  const [foundationMeta, setFoundationMeta] = useState<FoundationMeta>(() => {
    const parsed = parseFoundationMeta((video as any).foundation_meta);
    if (parsed) return parsed;
    const raw = (video as any).foundation_meta;
    // Partial/incomplete meta must still round-trip into the form so the owner
    // can finish it (parseFoundationMeta returns null for incomplete rows).
    if (raw && typeof raw === 'object') {
      return {
        ...EMPTY_FOUNDATION_META,
        ...(raw as Partial<FoundationMeta>),
        audience_levels: Array.isArray((raw as any).audience_levels) ? (raw as any).audience_levels : [],
        refresher_triggers: Array.isArray((raw as any).refresher_triggers) ? (raw as any).refresher_triggers : [],
      } as FoundationMeta;
    }
    return { ...EMPTY_FOUNDATION_META, audience_levels: [], refresher_triggers: [] };
  });

  const [videoFormat, setVideoFormat] = useState<string>(video.video_format || '');
  const [skillDomains, setSkillDomains] = useState<SkillDomain[]>(
    (video.skill_domains as SkillDomain[]) || []
  );
  const [aiDescription, setAiDescription] = useState<string>(video.ai_description || '');
  const [assignments, setAssignments] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [regen, setRegen] = useState(false);
  const [prefilled, setPrefilled] = useState<Record<string, boolean>>({});
  const [suggestions, setSuggestions] = useState<InlineSuggestion[]>([]);
  const [suggestState, setSuggestState] = useState<'idle' | 'loading' | 'empty' | 'error' | 'ready'>('idle');
  const [activeField, setActiveField] = useState<MissingFieldKey | null>(
    (initialFocus as MissingFieldKey) ?? null
  );
  const initialConfRef = useRef<number | null>(null);

  const primaryDomain = skillDomains[0];
  const { data: taxonomy = [] } = useVideoTaxonomy(primaryDomain);
  const grouped = useMemo(() => groupTaxonomyByLayer(taxonomy), [taxonomy]);

  const descRef = useRef<HTMLDivElement>(null);
  const formatRef = useRef<HTMLDivElement>(null);
  const domainsRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const foundationRef = useRef<HTMLDivElement>(null);
  const formatTriggerRef = useRef<HTMLButtonElement>(null);

  const refFor = useCallback((key: MissingFieldKey | null) => {
    switch (key) {
      case 'video_format': return formatRef;
      case 'skill_domains': return domainsRef;
      case 'tag_assignments': return tagsRef;
      case 'ai_description': return descRef;
      case 'foundation_domain':
      case 'foundation_scope':
      case 'foundation_audience':
      case 'foundation_triggers': return foundationRef;
      default: return null;
    }
  }, []);

  // Load existing assignments
  const loadAssignments = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('video_tag_assignments')
      .select('tag_id, weight')
      .eq('video_id', video.id);
    if (data) {
      const map: Record<string, number> = {};
      for (const r of data) map[r.tag_id] = r.weight;
      setAssignments(map);
    }
  }, [video.id]);

  useEffect(() => { void loadAssignments(); }, [loadAssignments]);

  // Smart Defaults — apply immediately to EMPTY fields and say what changed.
  // Foundation videos have their own field set, so they get their own defaults.
  const smartDefaultsRanRef = useRef(false);
  useEffect(() => {
    if (!applySmartDefaults || smartDefaultsRanRef.current) return;
    smartDefaultsRanRef.current = true;
    const applied: string[] = [];
    const marks: Record<string, boolean> = {};

    if (isFoundation) {
      const next: Partial<FoundationMeta> = {};
      const hasDomain = Boolean((video as any).foundation_meta?.domain);
      const hasScope = Boolean((video as any).foundation_meta?.scope);
      if (!hasDomain && fDefaults.topDomain) {
        next.domain = fDefaults.topDomain as FoundationMeta['domain'];
        applied.push(`topic: ${fDefaults.topDomain.replace(/_/g, ' ')}`);
        marks.foundation_domain = true;
      }
      if (!hasScope && fDefaults.topScope) {
        next.scope = fDefaults.topScope as FoundationMeta['scope'];
        applied.push(`scope: ${fDefaults.topScope.replace(/_/g, ' ')}`);
        marks.foundation_scope = true;
      }
      if (foundationMeta.audience_levels.length === 0 && fDefaults.topAudiences.length > 0) {
        next.audience_levels = fDefaults.topAudiences as FoundationMeta['audience_levels'];
        applied.push(`audience: ${fDefaults.topAudiences.join(', ').replace(/_/g, ' ')}`);
        marks.foundation_audience = true;
      }
      if (foundationMeta.refresher_triggers.length === 0 && fDefaults.topTriggers.length > 0) {
        next.refresher_triggers = fDefaults.topTriggers as FoundationMeta['refresher_triggers'];
        applied.push(`triggers: ${fDefaults.topTriggers.length}`);
        marks.foundation_triggers = true;
      }
      if (Object.keys(next).length > 0) setFoundationMeta(p => ({ ...p, ...next }));
      setPrefilled(marks);
      toast(
        applied.length > 0
          ? { title: 'Smart Defaults applied', description: `${applied.join(' · ')} — review, then save.` }
          : {
              title: 'Nothing to pre-fill',
              description: fDefaults.sampleSize === 0
                ? 'Save a few foundation videos first — Hammer learns your most-used choices.'
                : 'These fields already have values. Finish the remaining ones below.',
            }
      );
      return;
    }

    if (!videoFormat && defaults.topFormat) {
      setVideoFormat(defaults.topFormat);
      applied.push(`format: ${defaults.topFormat.replace(/_/g, ' ')}`);
      marks.video_format = true;
    }
    if (skillDomains.length === 0 && defaults.topDomains.length > 0) {
      const d = defaults.topDomains.slice(0, 1) as SkillDomain[];
      setSkillDomains(d);
      applied.push(`skill: ${d[0].replace('_', ' ')}`);
      marks.skill_domains = true;
    }
    setPrefilled(marks);
    toast(
      applied.length > 0
        ? { title: 'Smart Defaults applied', description: `${applied.join(' · ')} — review, then save.` }
        : {
            title: 'Nothing to pre-fill',
            description: defaults.sampleSize === 0
              ? 'Tag a few videos first — Hammer learns your most-used choices.'
              : 'These fields already have values. Finish the remaining ones below.',
          }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applySmartDefaults]);


  const conf = isFoundation
    ? computeFoundationConfidence({ foundationMeta, aiDescription })
    : computeVideoConfidence({
        videoFormat,
        skillDomains,
        aiDescription,
        layersCovered: taxonomy.filter(t => assignments[t.id] != null).map(t => t.layer),
        assignmentCount: Object.keys(assignments).length,
      });

  // Capture the very first non-zero confidence for the save-preview delta.
  if (initialConfRef.current === null && conf.score > 0) initialConfRef.current = conf.score;

  const missing = computeMissingFields({
    videoClass,
    foundationMeta,
    videoFormat,
    skillDomains,
    aiDescription,
    assignmentCount: Object.keys(assignments).length,
  });
  const isReady = missing.length === 0;
  const canAutoSuggest = !isFoundation && aiDescription.trim().length >= SUGGEST_MIN_CHARS;

  // Keep the walker pointed at a field that is still missing.
  useEffect(() => {
    if (!activeField) return;
    if (!missing.some(m => m.key === activeField)) {
      setActiveField(walkMissing ? (missing[0]?.key ?? null) : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing.map(m => m.key).join('|')]);

  // Scroll + focus + highlight the active field.
  useEffect(() => {
    const target = refFor(activeField) ?? descRef;
    requestAnimationFrame(() => {
      target.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (activeField === 'video_format') formatTriggerRef.current?.focus();
      else {
        const focusable = target.current?.querySelector<HTMLElement>(
          'textarea, input, button, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus({ preventScroll: true });
      }
    });
  }, [activeField, refFor]);

  const nextMissing = () => {
    if (missing.length === 0) return;
    const idx = missing.findIndex(m => m.key === activeField);
    setActiveField(missing[(idx + 1) % missing.length].key);
  };

  const highlight = (key: MissingFieldKey) =>
    activeField === key ? 'rounded-md ring-2 ring-primary ring-offset-2 ring-offset-background' : '';

  const toggleDomain = (d: SkillDomain) =>
    setSkillDomains(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);

  // Tap cycle: None → Normal (1) → Boost (3) → None
  const cycleAssignment = (id: string) =>
    setAssignments(p => {
      const n = { ...p };
      const cur = n[id];
      if (cur == null) n[id] = NORMAL_WEIGHT;
      else if (cur < BOOST_WEIGHT) n[id] = BOOST_WEIGHT;
      else delete n[id];
      return n;
    });

  const fetchSuggestions = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('video_tag_suggestions')
      .select('id, layer, suggested_key, confidence, reasoning')
      .eq('video_id', video.id)
      .eq('status', 'pending')
      .order('confidence', { ascending: false })
      .limit(30);
    if (error) return [];
    return (data || []) as InlineSuggestion[];
  }, [video.id]);

  const handleAutoSuggest = async () => {
    if (isFoundation) return;
    setRegen(true);
    setSuggestState('loading');
    try {
      let desc = aiDescription;
      // Too short to analyse — draft a baseline description from the video's own
      // fields so the button never silently no-ops.
      if (desc.trim().length < SUGGEST_MIN_CHARS) {
        desc = `Best for All Levels athletes working on a Skill Build. Focus: Sequencing. ${video.title}`.trim();
        setAiDescription(desc);
        toast({
          title: 'Drafted a description first',
          description: 'Hammer needs text to analyse — edit the chips after reviewing.',
        });
      }
      await updateStructuredFields(video.id, { aiDescription: desc });
      const inserted = await regenerateAISuggestions(video.id);
      if (inserted === null) { setSuggestState('error'); return; }
      const rows = await fetchSuggestions();
      setSuggestions(rows);
      setSuggestState(rows.length > 0 ? 'ready' : 'empty');
    } finally {
      setRegen(false);
    }
  };

  const acceptSuggestion = async (s: InlineSuggestion) => {
    let tagId = taxonomy.find(t => t.layer === s.layer && (t as any).key === s.suggested_key)?.id;
    if (!tagId) {
      const { data } = await (supabase as any)
        .from('video_tag_taxonomy')
        .select('id')
        .eq('layer', s.layer)
        .eq('key', s.suggested_key)
        .maybeSingle();
      tagId = data?.id;
    }
    if (!tagId) {
      toast({ title: 'Tag not in taxonomy', description: `${s.layer} · ${s.suggested_key}`, variant: 'destructive' });
      return;
    }
    setAssignments(p => ({ ...p, [tagId as string]: 2 }));
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase as any).from('video_tag_suggestions')
      .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', s.id);
    setSuggestions(p => p.filter(x => x.id !== s.id));
  };

  const rejectSuggestion = async (s: InlineSuggestion) => {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase as any).from('video_tag_suggestions')
      .update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', s.id);
    setSuggestions(p => p.filter(x => x.id !== s.id));
  };

  // autoOpenSuggestions: run once on mount. Results are reviewed inline.
  const autoSuggestRanRef = useRef(false);
  useEffect(() => {
    if (!autoOpenSuggestions || autoSuggestRanRef.current || isFoundation) return;
    autoSuggestRanRef.current = true;
    void handleAutoSuggest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenSuggestions]);

  const handleSave = async () => {
    if (!isReady) {
      toast({ title: 'Not ready', description: missing.map(m => m.message).join(' · '), variant: 'destructive' });
      setActiveField(missing[0].key);
      return;
    }
    setSaving(true);
    try {
      const okStruct = await updateStructuredFields(video.id, {
        videoFormat: isFoundation ? null : (videoFormat || null),
        skillDomains: isFoundation ? [] : skillDomains,
        aiDescription,
        videoClass,
        foundationMeta: isFoundation ? foundationMeta : null,
      });
      if (!okStruct) return;
      if (!isFoundation) {
        const okAssign = await syncTagAssignments(video.id, assignments);
        if (!okAssign) return;
      }
      toast({ title: 'Saved', description: `Confidence ${conf.score} · ${conf.tier}` });
      onSuccess();
    } finally {
      setSaving(false);
    }
  };

  // Keyboard: Cmd/Ctrl+Enter = save, Esc = cancel
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
  const walkerIndex = Math.max(0, missing.findIndex(m => m.key === activeField));

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

      {/* Class switch */}
      <div className="flex items-center gap-2">
        <Label className="text-[10px]">Video class</Label>
        <div className="flex gap-1">
          {(['application', 'foundation'] as const).map(c => (
            <Badge
              key={c}
              variant={videoClass === c ? 'default' : 'outline'}
              className="cursor-pointer text-[10px] capitalize"
              onClick={() => !isProcessing && setVideoClass(c)}
            >
              {c === 'application' ? 'Per-rep clip' : 'Foundation (A–Z)'}
            </Badge>
          ))}
        </div>
      </div>

      {/* Missing-field walker */}
      {missing.length > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5">
          <p className="text-[11px]">
            <span className="font-semibold">Missing {walkerIndex + 1} of {missing.length}:</span>{' '}
            {FIELD_LABEL[missing[walkerIndex]?.key] ?? missing[0]?.message}
          </p>
          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={nextMissing}>
            Next <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      )}

      {isFoundation ? (
        <div ref={foundationRef} className={highlight(activeField ?? 'foundation_domain')}>
          <FoundationTagEditor
            value={foundationMeta}
            onChange={setFoundationMeta}
            aiDescription={aiDescription}
            onDescriptionChange={setAiDescription}
          />
        </div>
      ) : (
        <>
          {/* 2-column engine fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`space-y-1 p-1 ${highlight('video_format')}`} ref={formatRef}>
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">Format</Label>
                {prefilled.video_format && (
                  <span className="text-[9px] font-semibold text-primary">suggested — review</span>
                )}
              </div>
              <Select value={videoFormat} onValueChange={setVideoFormat} disabled={isProcessing}>
                <SelectTrigger ref={formatTriggerRef} className="h-8 text-xs">
                  <SelectValue placeholder="Pick format" />
                </SelectTrigger>
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

            <div className={`space-y-1 p-1 ${highlight('skill_domains')}`} ref={domainsRef}>
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">Skill Domains</Label>
                {prefilled.skill_domains && (
                  <span className="text-[9px] font-semibold text-primary">suggested — review</span>
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

          {/* Description — chip composer (no typing) */}
          <div className={`space-y-1 p-1 ${highlight('ai_description')}`} ref={descRef}>
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">Description</Label>
              <Button
                size="sm" variant="ghost" className="h-6 text-[10px] px-1.5"
                disabled={regen || isProcessing}
                onClick={handleAutoSuggest}
                title={canAutoSuggest
                  ? 'Run Hammer suggestions on this description'
                  : 'Hammer will draft a starter description first, then analyse it'}
              >
                {regen ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
                Run Hammer Suggestions
              </Button>
            </div>
            <HammerDescriptionComposer value={aiDescription} onChange={setAiDescription} compact />
          </div>

          {/* Inline suggestion review */}
          {suggestState !== 'idle' && (
            <div className="rounded-md border bg-muted/30 p-2 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" /> Hammer suggestions
              </p>
              {suggestState === 'loading' && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Analysing description…
                </p>
              )}
              {suggestState === 'error' && (
                <p className="text-[11px] text-destructive">
                  Hammer couldn't run just now. Try again in a moment.
                </p>
              )}
              {suggestState === 'empty' && (
                <p className="text-[11px] text-muted-foreground">
                  No new tags proposed for this description. Add more detail in the chips above and re-run.
                </p>
              )}
              {suggestState === 'ready' && suggestions.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-2 rounded border bg-background px-2 py-1">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium truncate">
                      {s.suggested_key.replace(/_/g, ' ')}
                      <span className="ml-1 text-[9px] uppercase text-muted-foreground">{s.layer.replace('_', ' ')}</span>
                    </p>
                    {s.reasoning && <p className="text-[10px] text-muted-foreground truncate">{s.reasoning}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="outline" className="h-6 px-1.5" onClick={() => acceptSuggestion(s)} title="Accept">
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => rejectSuggestion(s)} title="Reject">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {suggestState === 'ready' && suggestions.length === 0 && (
                <p className="text-[11px] text-muted-foreground">All suggestions reviewed.</p>
              )}
            </div>
          )}

          {/* Tags — tap to add, tap again to Boost ⚡, third tap removes */}
          <div className={`space-y-1 p-1 ${highlight('tag_assignments')}`} ref={tagsRef}>
            <Label className="text-[10px]">Tags ({Object.keys(assignments).length}) · tap again to ⚡ Boost</Label>
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
                      ) : grouped[layer].map(tag => {
                        const w = assignments[tag.id];
                        const selected = w != null;
                        const boosted = selected && w >= BOOST_WEIGHT;
                        return (
                          <Badge
                            key={tag.id}
                            variant={selected ? 'default' : 'outline'}
                            className={`cursor-pointer text-[10px] gap-0.5 ${boosted ? 'ring-2 ring-primary/60' : ''}`}
                            onClick={() => !isProcessing && cycleAssignment(tag.id)}
                          >
                            {boosted && <Zap className="h-2.5 w-2.5" />}
                            {tag.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

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
