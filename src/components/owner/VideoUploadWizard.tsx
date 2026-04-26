import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileVideo, Link as LinkIcon, Loader2, Sparkles, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVideoLibraryAdmin } from "@/hooks/useVideoLibraryAdmin";
import { StructuredTagEditor, emptyStructuredTagState, type StructuredTagState } from "./StructuredTagEditor";
import type { LibraryTag } from "@/hooks/useVideoLibrary";
import { computeMissingFields } from "@/lib/videoReadiness";
import { getSmartDefaults } from "@/lib/ownerLearning";
import { OwnerAuthorityNote } from "@/lib/ownerAuthority";
import { toast } from "@/hooks/use-toast";

interface Props {
  tags: LibraryTag[];
  onSuccess: () => void;
  /** When true, smart defaults pre-fill domain & format and Step 4 review is skipped. */
  fastMode?: boolean;
}

const SPORTS = ['baseball', 'softball', 'both'] as const;
const CATEGORIES = [
  'hitting', 'pitching', 'fielding', 'catching', 'baserunning',
  'throwing', 'strength', 'mobility', 'recovery', 'mental game',
  'game iq', 'practice design', 'coaching concepts',
];

const STEPS = [
  { n: 1, title: 'Upload Video' },
  { n: 2, title: 'Basic Info' },
  { n: 3, title: 'Engine Fields' },
  { n: 4, title: 'Review & Publish' },
];

function detectVideoType(url: string): 'youtube' | 'vimeo' | 'external' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  return 'external';
}

export function VideoUploadWizard({ tags, onSuccess, fastMode = false }: Props) {
  const { uploadVideo, uploading } = useVideoLibraryAdmin();
  const [step, setStep] = useState(1);
  const defaults = useMemo(() => (fastMode ? getSmartDefaults() : null), [fastMode]);

  // Step 1
  const [mode, setMode] = useState<'link' | 'upload'>('link');
  const [externalUrl, setExternalUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // Step 2 — pre-filled by smart defaults in Fast Mode (only suggests; owner can change)
  const [title, setTitle] = useState('');
  const [sport, setSport] = useState<string>('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  // Step 3 (engine fields, reusing StructuredTagEditor) — Fast Mode pre-suggests format only
  const [structured, setStructured] = useState<StructuredTagState>(() => {
    if (!fastMode || !defaults) return emptyStructuredTagState;
    return {
      ...emptyStructuredTagState,
      videoFormat: defaults.topFormat ?? '',
      // Skill domain is sport-aware in Step 2; we don't pre-fill skillDomains here
      // because they are also driven by what the owner picks at Step 2.
    };
  });

  // Autofocus refs
  const urlRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Per-step validity
  const step1Valid = mode === 'link'
    ? externalUrl.trim().length > 0 && /^https?:\/\//.test(externalUrl.trim())
    : !!videoFile;
  const step2Valid = title.trim().length > 0 && !!sport;
  const step3Missing = computeMissingFields({
    videoFormat: structured.videoFormat,
    skillDomains: structured.skillDomains,
    aiDescription: structured.aiDescription,
    assignmentCount: Object.keys(structured.tagAssignments).length,
  });
  const step3Valid = step3Missing.length === 0;

  // Fast Mode treats Step 3 as the final step (auto-publish on advance).
  const totalSteps = fastMode ? 3 : 4;
  const validBy: Record<number, boolean> = { 1: step1Valid, 2: step2Valid, 3: step3Valid, 4: true };
  const canNext = validBy[step] === true;

  // Autofocus first input on step change
  useEffect(() => {
    requestAnimationFrame(() => {
      if (step === 1) urlRef.current?.focus();
      if (step === 2) titleRef.current?.focus();
    });
  }, [step]);

  // Keyboard nav: Cmd/Ctrl+Enter → advance / publish
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (step < totalSteps && canNext) {
          setStep(step + 1);
        } else if (step === totalSteps && canNext) {
          // Final step: publish (Step 4 in beginner, Step 3 in Fast Mode)
          void handlePublish();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const sportArray = useMemo(() => {
    if (!sport) return [];
    if (sport === 'both') return ['baseball', 'softball'];
    return [sport];
  }, [sport]);

  const handlePublish = async () => {
    if (!step1Valid || !step2Valid || !step3Valid) {
      toast({ title: 'Not ready', description: 'Some fields are still missing.', variant: 'destructive' });
      return;
    }
    const videoType = mode === 'upload' ? 'upload' : detectVideoType(externalUrl);
    const result = await uploadVideo({
      title: title.trim(),
      description: description.trim() || undefined,
      tags: [],
      sport: sportArray,
      category: category || undefined,
      videoFile: videoFile || undefined,
      externalUrl: mode === 'link' ? externalUrl.trim() : undefined,
      videoType,
      videoFormat: structured.videoFormat,
      skillDomains: structured.skillDomains,
      aiDescription: structured.aiDescription,
      tagAssignments: structured.tagAssignments,
    });
    if (result) {
      // Reset
      setStep(1);
      setMode('link'); setExternalUrl(''); setVideoFile(null);
      setTitle(''); setSport(''); setCategory(''); setDescription('');
      setStructured(emptyStructuredTagState);
      onSuccess();
    }
  };

  const progress = (step / 4) * 100;

  return (
    <Card className="p-5 space-y-5">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Step {step} of 4
            </p>
            <h3 className="font-semibold text-base">{STEPS[step - 1].title}</h3>
          </div>
          <div className="flex gap-1">
            {STEPS.map(s => (
              <div
                key={s.n}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  s.n < step ? 'bg-primary' : s.n === step ? 'bg-primary/70' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      {/* Step 1 — Upload Video */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={mode === 'link' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('link')}
            >
              <LinkIcon className="h-3.5 w-3.5 mr-1" /> External Link
            </Button>
            <Button
              variant={mode === 'upload' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('upload')}
            >
              <Upload className="h-3.5 w-3.5 mr-1" /> Upload File
            </Button>
          </div>

          {mode === 'link' ? (
            <div className="space-y-1.5">
              <Label htmlFor="wiz-url">Video URL</Label>
              <Input
                id="wiz-url"
                ref={urlRef}
                placeholder="https://youtube.com/watch?v=..."
                value={externalUrl}
                onChange={e => setExternalUrl(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                YouTube, Vimeo, or any direct video URL.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Video File (max 500MB)</Label>
              {videoFile ? (
                <div className="flex items-center gap-2 text-sm p-2 rounded border">
                  <FileVideo className="h-4 w-4 text-primary" />
                  <span className="truncate flex-1">{videoFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(videoFile.size / (1024 * 1024)).toFixed(1)}MB
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setVideoFile(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={e => setVideoFile(e.target.files?.[0] || null)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 2 — Basic Info */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="wiz-title">Title</Label>
            <Input
              id="wiz-title"
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Fixing roll-overs in your swing"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Sport</Label>
            <div className="flex gap-1.5 flex-wrap">
              {SPORTS.map(s => (
                <Badge
                  key={s}
                  variant={sport === s ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => setSport(s)}
                >
                  {s}
                </Badge>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">Pick one. "Both" covers baseball + softball.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Category (optional)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wiz-desc">Short Description (optional)</Label>
            <Textarea
              id="wiz-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="One-liner shown on the card."
            />
          </div>
        </div>
      )}

      {/* Step 3 — Engine Fields */}
      {step === 3 && (
        <div className="space-y-3">
          <div className="rounded border border-primary/30 bg-primary/5 p-3 text-xs">
            <p className="font-semibold flex items-center gap-1 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              These fields wire your video to the recommendation engine.
            </p>
            <p className="text-muted-foreground mt-0.5">
              Write a description, then accept the auto-suggested tags. Need 2+ tags to publish.
            </p>
          </div>
          <StructuredTagEditor value={structured} onChange={setStructured} />
          {!step3Valid && (
            <ul className="text-xs space-y-0.5 list-disc pl-4 text-amber-600 dark:text-amber-400">
              {step3Missing.map(m => <li key={m.key}>{m.message}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Step 4 — Review */}
      {step === 4 && (
        <div className="space-y-3 text-sm">
          <Card className="p-3 space-y-2 bg-muted/30">
            <Row label="Source">
              {mode === 'link' ? <span className="truncate">{externalUrl}</span> : <span>{videoFile?.name}</span>}
            </Row>
            <Row label="Title">{title}</Row>
            <Row label="Sport"><span className="capitalize">{sport}</span></Row>
            {category && <Row label="Category"><span className="capitalize">{category}</span></Row>}
            <Row label="Format"><span className="capitalize">{structured.videoFormat.replace(/_/g, ' ')}</span></Row>
            <Row label="Skills">
              <div className="flex flex-wrap gap-1">
                {structured.skillDomains.map(d => (
                  <Badge key={d} variant="outline" className="text-[10px] capitalize">{d.replace('_', ' ')}</Badge>
                ))}
              </div>
            </Row>
            <Row label="Description"><span className="text-xs text-muted-foreground line-clamp-3">{structured.aiDescription}</span></Row>
            <Row label="Tags"><span className="text-xs">{Object.keys(structured.tagAssignments).length} assigned</span></Row>
          </Card>
          <p className="text-[11px] text-muted-foreground text-center">
            Publishing will add this video and trigger AI tag suggestions in the background.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1 || uploading}
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>

        {step < 4 ? (
          <Button
            size="sm"
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext || uploading}
          >
            Next <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        ) : (
          <Button size="sm" onClick={handlePublish} disabled={uploading || !step3Valid}>
            {uploading ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Publishing…</>
            ) : (
              <><Check className="h-3.5 w-3.5 mr-1" /> Publish to Library</>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-2 items-start">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground pt-0.5">{label}</span>
      <div className="min-w-0 text-sm">{children}</div>
    </div>
  );
}
