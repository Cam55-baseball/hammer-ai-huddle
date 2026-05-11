import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, X, FileVideo, Sparkles, Wand2 } from "lucide-react";
import { useVideoLibraryAdmin } from "@/hooks/useVideoLibraryAdmin";
import { useVideoTaxonomy, groupTaxonomyByLayer } from "@/hooks/useVideoTaxonomy";
import { supabase } from "@/integrations/supabase/client";
import type { LibraryVideo, LibraryTag } from "@/hooks/useVideoLibrary";
import type { SkillDomain, TagLayer } from "@/lib/videoRecommendationEngine";
import { computeMissingFields } from "@/lib/videoReadiness";
import { computeVideoConfidence, computeFoundationConfidence } from "@/lib/videoConfidence";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { AIComparePanel } from "./AIComparePanel";
import { HammerDescriptionComposer } from "./HammerDescriptionComposer";
import { FormulaLinkageEditor, type FormulaLinkageValue } from "./FormulaLinkageEditor";
import { WhatHammerHears } from "./WhatHammerHears";
import { FoundationTagEditor, isFoundationMetaValid } from "./FoundationTagEditor";
import { EMPTY_FOUNDATION_META, type FoundationMeta } from "@/lib/foundationVideos";
import { VideoPlayer } from "@/components/video-library/VideoPlayer";
import { toast } from "@/hooks/use-toast";

const VIDEO_FORMATS = ['drill', 'game_at_bat', 'practice_rep', 'breakdown', 'slow_motion', 'pov', 'comparison'];
const SKILL_DOMAINS: SkillDomain[] = ['hitting', 'fielding', 'throwing', 'base_running', 'pitching'];
const LAYER_LABELS: Record<TagLayer, string> = {
  movement_pattern: 'Movement',
  result: 'Result',
  context: 'Context',
  correction: 'Correction',
};

interface VideoEditFormProps {
  video: LibraryVideo;
  tags: LibraryTag[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function VideoEditForm({ video, tags, onSuccess, onCancel }: VideoEditFormProps) {
  const {
    updateVideo,
    replaceVideoFile,
    updateStructuredFields,
    syncTagAssignments,
    regenerateAISuggestions,
    uploading,
  } = useVideoLibraryAdmin();

  // Existing fields
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(video.tags);
  const [selectedSports, setSelectedSports] = useState<string[]>(video.sport);
  const [category, setCategory] = useState(video.category || "");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Engine-critical fields (the fix)
  const [videoFormat, setVideoFormat] = useState<string>(video.video_format || "");
  const [skillDomains, setSkillDomains] = useState<SkillDomain[]>(
    (video.skill_domains as SkillDomain[]) || []
  );
  const [aiDescription, setAiDescription] = useState<string>(video.ai_description || "");
  const [assignments, setAssignments] = useState<Record<string, number>>({});
  const [formulaLinkage, setFormulaLinkage] = useState<FormulaLinkageValue>({
    phases: (video as any).formula_phases ?? [],
    notes: (video as any).formula_notes ?? "",
  });
  // Foundation track — long-form A–Z philosophy / mechanics primer videos.
  const [isFoundation, setIsFoundation] = useState<boolean>(
    (video as any).video_class === 'foundation'
  );
  const [foundationMeta, setFoundationMeta] = useState<FoundationMeta>(
    ((video as any).foundation_meta as FoundationMeta) ?? EMPTY_FOUNDATION_META
  );
  const [regenLoading, setRegenLoading] = useState(false);

  const primaryDomain = skillDomains[0];
  const { data: taxonomy = [] } = useVideoTaxonomy(primaryDomain);
  const grouped = useMemo(() => groupTaxonomyByLayer(taxonomy), [taxonomy]);

  // Load existing assignments for this video on mount
  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from('video_tag_assignments')
        .select('tag_id, weight')
        .eq('video_id', video.id);
      if (!error && data) {
        const map: Record<string, number> = {};
        for (const r of data) map[r.tag_id] = r.weight;
        setAssignments(map);
      }
    })();
  }, [video.id]);

  const sportOptions = ["baseball", "softball"];

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
    );
  };

  const toggleSport = (sport: string) => {
    setSelectedSports(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
    );
  };

  const toggleDomain = (d: SkillDomain) => {
    setSkillDomains(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  // Explicit weight model: 1 = Normal, 3 = Strong, 5 = Max priority.
  const WEIGHT_OPTIONS = [1, 3, 5] as const;
  const DEFAULT_WEIGHT = 1;
  const toggleAssignment = (tagId: string) => {
    setAssignments(prev => {
      const next = { ...prev };
      if (next[tagId] != null) delete next[tagId];
      else next[tagId] = DEFAULT_WEIGHT;
      return next;
    });
  };
  const setAssignmentWeight = (tagId: string, weight: number) => {
    setAssignments(prev => ({ ...prev, [tagId]: weight }));
  };

  const layersCovered = useMemo<TagLayer[]>(() => {
    const layers: TagLayer[] = [];
    for (const t of taxonomy) {
      if (assignments[t.id] != null) layers.push(t.layer);
    }
    return layers;
  }, [assignments, taxonomy]);

  const applicationMissing = computeMissingFields({
    videoFormat,
    skillDomains,
    aiDescription,
    assignmentCount: Object.keys(assignments).length,
  });
  const foundationReady = isFoundationMetaValid(foundationMeta) && aiDescription.trim().length > 0;
  const missing = isFoundation ? [] : applicationMissing;
  const isReady = isFoundation ? foundationReady : applicationMissing.length === 0;
  const canAutoSuggest = aiDescription.trim().length >= 20;
  const conf = isFoundation
    ? computeFoundationConfidence({ foundationMeta, aiDescription })
    : computeVideoConfidence({
        videoFormat,
        skillDomains,
        aiDescription,
        layersCovered,
        assignmentCount: Object.keys(assignments).length,
      });

  const handleRegenAI = async () => {
    if (!aiDescription.trim()) {
      toast({ title: "Add a description first", variant: "destructive" });
      return;
    }
    setRegenLoading(true);
    // Save the description before re-running so the function sees the latest text
    await updateStructuredFields(video.id, { aiDescription });
    await regenerateAISuggestions(video.id);
    setRegenLoading(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    if (selectedSports.length === 0) {
      toast({ title: "Select at least one sport", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (newFile) {
        const result = await replaceVideoFile(video.id, newFile);
        if (!result) { setSaving(false); return; }
      }

      const ok = await updateVideo(video.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        tags: selectedTags,
        sport: selectedSports,
        category: category.trim() || undefined,
      });
      if (!ok) return;

      const okStruct = await updateStructuredFields(video.id, {
        // Foundation videos blank out the application-only fields with explicit nulls
        videoFormat: isFoundation ? null : (videoFormat || null),
        skillDomains: isFoundation ? [] : skillDomains,
        aiDescription,
        formulaPhases: isFoundation ? [] : formulaLinkage.phases,
        formulaNotes: isFoundation ? null : (formulaLinkage.notes.trim() ? formulaLinkage.notes : null),
        videoClass: isFoundation ? 'foundation' : 'application',
        foundationMeta: isFoundation ? foundationMeta : null,
      });
      if (!okStruct) return;

      // Foundation videos don't carry per-rep tag assignments — clear them.
      const okAssign = await syncTagAssignments(video.id, isFoundation ? {} : assignments);
      if (!okAssign) return;

      toast({ title: "Saved", description: "Video updated." });
      onSuccess();
    } finally {
      setSaving(false);
    }
  };

  const tagsByCategory = tags.reduce<Record<string, LibraryTag[]>>((acc, tag) => {
    const cat = tag.parent_category || tag.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tag);
    return acc;
  }, {});

  const isProcessing = saving || uploading;

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="edit-title">Title</Label>
        <Input
          id="edit-title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          disabled={isProcessing}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="edit-desc">Description</Label>
        <Textarea
          id="edit-desc"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          disabled={isProcessing}
        />
      </div>

      {/* Sport */}
      <div className="space-y-1.5">
        <Label>Sport</Label>
        <div className="flex gap-2">
          {sportOptions.map(s => (
            <Badge
              key={s}
              variant={selectedSports.includes(s) ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => !isProcessing && toggleSport(s)}
            >
              {s}
            </Badge>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label htmlFor="edit-cat">Category</Label>
        <Input
          id="edit-cat"
          value={category}
          onChange={e => setCategory(e.target.value)}
          placeholder="Optional category"
          disabled={isProcessing}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="max-h-40 overflow-y-auto space-y-2 rounded border p-2">
          {Object.entries(tagsByCategory).map(([cat, catTags]) => (
            <div key={cat}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">{cat}</p>
              <div className="flex flex-wrap gap-1">
                {catTags.map(tag => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.name) ? "default" : "outline"}
                    className="cursor-pointer text-[10px]"
                    onClick={() => !isProcessing && toggleTag(tag.name)}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Video — inline preview (uses smart player so YouTube/Vimeo/X/TikTok all work) */}
      <Card className="p-3 space-y-2">
        <Label>Current Video</Label>
        {video.video_url?.trim() ? (
          <VideoPlayer
            videoUrl={video.video_url}
            videoType={video.video_type}
            title={video.title}
          />
        ) : (
          <div className="aspect-video w-full bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
            No file — external link
          </div>
        )}
        <p className="text-xs text-muted-foreground truncate">
          {video.video_url || "No file — external link"}
        </p>
        <p className="text-[10px] text-muted-foreground">Type: {video.video_type}</p>
      </Card>

      {/* Replace Video File */}
      <div className="space-y-1.5">
        <Label>Replace Video File (optional)</Label>
        {newFile ? (
          <div className="flex items-center gap-2 text-sm">
            <FileVideo className="h-4 w-4 text-primary" />
            <span className="truncate flex-1">{newFile.name}</span>
            <span className="text-xs text-muted-foreground">
              {(newFile.size / (1024 * 1024)).toFixed(1)} MB
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setNewFile(null)}
              disabled={isProcessing}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline">
            <Upload className="h-4 w-4" />
            Choose new file
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) setNewFile(f);
                e.target.value = "";
              }}
              disabled={isProcessing}
            />
          </label>
        )}
        <p className="text-[10px] text-muted-foreground">
          Previous versions are preserved — replacing does not delete the old file.
        </p>
      </div>

      {/* ─── ENGINE FIELDS (Required for Recommendations) ─── */}
      <div
        data-engine-fields
        className="space-y-4 rounded-lg border-2 border-primary/30 bg-primary/5 p-4"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="font-semibold text-sm flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              Engine Fields
            </h4>
            <p className="text-[11px] text-muted-foreground">Required for recommendations</p>
          </div>
          <div className="flex items-center gap-1.5">
            <ConfidenceBadge score={conf.score} tier={conf.tier} compact />
            <Badge variant={isReady ? "default" : "outline"} className="text-[10px]">
              {isFoundation
                ? (isReady ? "Foundation Ready" : "Foundation incomplete")
                : (isReady ? "Ready" : `${4 - applicationMissing.length}/4 done`)}
            </Badge>
          </div>
        </div>

        {/* Foundation toggle — flips the editor between Application and Foundation tracks */}
        <button
          type="button"
          onClick={() => !isProcessing && setIsFoundation(v => !v)}
          className={`w-full text-left rounded-lg border p-3 transition-colors ${
            isFoundation
              ? 'border-primary bg-primary/15'
              : 'border-border hover:border-primary/50 bg-background/60'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">
                {isFoundation ? '✓ Foundation video' : 'This is a Foundation video'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Long-form A–Z philosophy / mechanics primer / mental framework. Skips per-rep tagging — surfaces on refresher triggers.
              </p>
            </div>
            <Badge variant={isFoundation ? 'default' : 'outline'} className="text-[10px] shrink-0">
              {isFoundation ? 'Foundation' : 'Application'}
            </Badge>
          </div>
        </button>

        {isFoundation ? (
          <FoundationTagEditor
            value={foundationMeta}
            onChange={setFoundationMeta}
            aiDescription={aiDescription}
            onDescriptionChange={setAiDescription}
          />
        ) : (
        <>
        
        {/* Video Format */}
        <div className="space-y-1.5">
          <Label className="text-xs">Video Format</Label>
          <Select value={videoFormat} onValueChange={setVideoFormat} disabled={isProcessing}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Pick a format (drill, breakdown, etc.)" />
            </SelectTrigger>
            <SelectContent>
              {VIDEO_FORMATS.map(f => (
                <SelectItem key={f} value={f} className="capitalize text-xs">
                  {f.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Skill Domains */}
        <div className="space-y-1.5">
          <Label className="text-xs">Skill Domains</Label>
          <div className="flex flex-wrap gap-1.5">
            {SKILL_DOMAINS.map(d => (
              <Badge
                key={d}
                variant={skillDomains.includes(d) ? "default" : "outline"}
                className="cursor-pointer text-[11px] capitalize"
                onClick={() => !isProcessing && toggleDomain(d)}
              >
                {d.replace('_', ' ')}
              </Badge>
            ))}
          </div>
          {skillDomains.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic">Pick at least one.</p>
          )}
        </div>

        {/* Coach's Notes to Hammer — freeform (PRIMARY) + Auto-Suggest */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-coach-notes" className="text-xs">
            Coach's Notes to Hammer <span className="text-destructive">*</span>
          </Label>
          <p className="text-[10px] text-muted-foreground -mt-0.5">
            Talk to Hammer in your own voice. Tell it who this video is for, what it teaches, and the fault it fixes. Hammer reads this verbatim.
          </p>
          <Textarea
            id="edit-coach-notes"
            value={aiDescription}
            onChange={e => setAiDescription(e.target.value)}
            placeholder="e.g. Best for advanced hitters rolling over inside fastballs due to early hand drift. Drills the P1 hands-break trigger and the P4 elite move…"
            rows={5}
            disabled={isProcessing}
            className="text-xs"
          />
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[10px] text-muted-foreground">
              {aiDescription.trim().length} chars · 20+ to enable Auto-Suggest
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRegenAI}
              disabled={!canAutoSuggest || regenLoading || isProcessing}
              className="h-7 text-xs"
            >
              {regenLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
              Auto-Suggest Tags
            </Button>
          </div>

          {/* Quick-fill helpers (optional) — chips append to the textarea */}
          <details className="group rounded-md border border-border/60 bg-background/40 mt-1">
            <summary className="cursor-pointer list-none px-2 py-1.5 text-[10px] text-muted-foreground select-none flex items-center gap-1.5 hover:text-foreground">
              <span className="transition-transform group-open:rotate-90">▸</span>
              Quick-fill helpers (optional) — append a structured sentence with chips
            </summary>
            <div className="p-2 border-t border-border/60">
              <HammerDescriptionComposer
                value=""
                onChange={(text) => {
                  if (!text) return;
                  const cur = aiDescription.trim();
                  setAiDescription(cur ? `${cur}\n\n${text}` : text);
                }}
                compact
              />
            </div>
          </details>
        </div>

        {/* Formula Linkage — what does this video teach? */}
        <FormulaLinkageEditor
          domains={skillDomains}
          value={formulaLinkage}
          onChange={setFormulaLinkage}
          disabled={isProcessing}
        />

        {/* Tag assignments grouped by layer with explicit 1 / 3 / 5 weights */}
        <div className="space-y-2">
          <Label className="text-xs">Tag Assignments ({Object.keys(assignments).length} picked, need 2+)</Label>
          <p className="text-[10px] text-muted-foreground -mt-1">
            Tap to add. Use <span className="font-semibold">1</span> = normal, <span className="font-semibold">3</span> = strong, <span className="font-semibold">5</span> = max priority.
          </p>
          {!primaryDomain ? (
            <p className="text-[11px] text-muted-foreground italic px-2 py-3 rounded bg-background/60">
              Pick a skill domain above to load taxonomy.
            </p>
          ) : (
            <div className="space-y-3">
              {(['movement_pattern', 'result', 'context', 'correction'] as TagLayer[]).map(layer => (
                <div key={layer} className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {LAYER_LABELS[layer]}
                  </p>
                  {grouped[layer].length === 0 ? (
                    <p className="text-[10px] text-muted-foreground italic">
                      No {LAYER_LABELS[layer].toLowerCase()} tags yet — add some in the Taxonomy tab.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {grouped[layer].map(tag => {
                        const w = assignments[tag.id];
                        const selected = w != null;
                        return (
                          <div key={tag.id} className="inline-flex items-center gap-0.5">
                            <Badge
                              variant={selected ? 'default' : 'outline'}
                              className="cursor-pointer text-[10px]"
                              onClick={() => !isProcessing && toggleAssignment(tag.id)}
                              title={selected ? 'Tap to remove' : 'Tap to add'}
                            >
                              {tag.label}
                            </Badge>
                            {selected && (
                              <div className="inline-flex rounded border border-border overflow-hidden">
                                {WEIGHT_OPTIONS.map(val => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => !isProcessing && setAssignmentWeight(tag.id, val)}
                                    disabled={isProcessing}
                                    className={`px-1.5 text-[9px] font-medium transition-colors ${
                                      w === val
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-background hover:bg-muted'
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI vs Owner Compare (collapsed by default) */}
        <AIComparePanel
          videoId={video.id}
          taxonomy={taxonomy}
          ownerTagIds={Object.keys(assignments)}
          onAdoptTag={toggleAssignment}
        />

        {/* What Hammer hears — derived preview */}
        <WhatHammerHears
          domains={skillDomains}
          videoFormat={videoFormat}
          phases={formulaLinkage.phases}
          aiDescription={aiDescription}
          boostedTagLabels={taxonomy
            .filter(t => (assignments[t.id] ?? 0) >= 3)
            .map(t => t.label)}
        />
        </>
        )}
      </div>

      {/* Missing-fields list */}
      {!isReady && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
            Before saving:
          </p>
          <ul className="text-xs space-y-0.5 list-disc pl-4 text-amber-700/90 dark:text-amber-400/90">
            {missing.map(m => <li key={m.key}>{m.message}</li>)}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isProcessing || !isReady}>
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {uploading ? "Uploading…" : "Saving…"}
            </>
          ) : (
            isReady ? "Save Changes" : `Save (${missing.length} to fix)`
          )}
        </Button>
      </div>
    </div>
  );
}
