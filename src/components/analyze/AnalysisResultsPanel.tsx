import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  BookMarked,
  Camera,
  ChevronDown,
  ClipboardList,
  Heart,
  Home,
  ListChecks,
  MessageSquareText,
  Play,
  Sparkles,
  Square,
  Sun,
  Timer,
  Trophy,
  User,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AnalysisCoachChat } from "@/components/AnalysisCoachChat";
import { RevealSection } from "./RevealSection";
import { RadialDial } from "@/components/demo/viz/RadialDial";
import {
  efficiencyToScoutGrade,
  gradeToColor,
  gradeToHex,
  gradeToLabel,
  gradeToSurface,
} from "@/lib/gradeEngine";
import { branding } from "@/branding";

export interface AnalysisDrill {
  title: string;
  purpose: string;
  steps: string[];
  reps_sets: string;
  equipment: string;
  cues?: string[];
}

export interface AnalysisResultData {
  efficiency_score: number;
  summary?: string[];
  feedback: string;
  positives?: string[];
  drills: AnalysisDrill[];
}

export interface PersistedTempo {
  value: number | null;
  missing_reason: string | null;
  evidence_sha256_hex: string;
}

interface Props {
  analysis: AnalysisResultData;
  /** Discipline key, e.g. "pitching" — drives pitching-only surfaces like Tempo. */
  moduleKey: string;
  persistedTempo: PersistedTempo | null;
  savedDrillIds: Set<string>;
  onSaveDrill: (drill: AnalysisDrill) => void;
  onSaveToLibrary: () => void;
  onReturnToDashboard: () => void;
  /**
   * Release gate. When false the score dial, the 20–80 scout-grade band and
   * every grade colour are replaced by an honest line. Coaching text is
   * untouched — words stay, scores go.
   */
  showScore?: boolean;
}

function SectionHeading({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {icon}
      {children}
    </h4>
  );
}

/**
 * Analysis results — composed reveal.
 *
 * Visual order is intentional: the score anchors the screen first (20–80
 * grade language drives its color, never decoration), then what the model
 * saw, then what to do about it. Every section cascades in via
 * RevealSection so results feel delivered, not dumped.
 *
 * Presentation-only: renders data the pipeline already produced. No
 * measurement logic, no new claims — the Phase 49 trust-lock removals
 * (scorecard trends, report-card surfaces) stay removed.
 */
export function AnalysisResultsPanel({
  analysis,
  moduleKey,
  persistedTempo,
  savedDrillIds,
  onSaveDrill,
  onSaveToLibrary,
  onReturnToDashboard,
  showScore = true,
}: Props) {
  const { t } = useTranslation();

  const score = Math.round(analysis.efficiency_score ?? 0);
  const grade = efficiencyToScoutGrade(score);
  const gradeLabel = gradeToLabel(grade);
  const gradeColor = gradeToColor(grade);
  const gradeHex = gradeToHex(grade);
  const gradeSurface = gradeToSurface(grade);

  const summary = analysis.summary ?? [];
  const [topTakeaway, ...restFindings] = summary;
  const feedbackParagraphs = (analysis.feedback ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="space-y-5">
      {/* ── 1 · SCORE ANCHOR ─────────────────────────────────────────── */}
      <RevealSection order={0}>
        {showScore ? (
          <Card className={cn("overflow-hidden border-2", gradeSurface)}>
            <div className="flex items-center gap-5 p-5 sm:gap-8 sm:p-7">
              <div className="shrink-0">
                <RadialDial value={score} size={132} color={gradeHex} label={t('videoAnalysis.scoreDialLabel', 'score')} />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t('videoAnalysis.analysisResults')}
                </p>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className={cn("text-3xl font-black leading-none sm:text-4xl", gradeColor)}>
                    {gradeLabel}
                  </span>
                  <span className={cn("rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums", gradeColor, gradeSurface)}>
                    {t('videoAnalysis.scoutGradeChip', 'Scout grade')} {grade}
                    <span className="font-normal text-muted-foreground"> / 80</span>
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t(
                    'videoAnalysis.scoreContext',
                    "Model read of this clip on the 20–80 scouting scale — a coaching signal from this video, not a measurement of game performance."
                  )}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden border-2 border-dashed">
            <div className="space-y-1.5 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t('videoAnalysis.analysisResults')}
              </p>
              <p className="text-sm font-semibold">{SCORED_GRADING_NOTICE}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Everything below — what the clip showed, what to change and the drills for
                it — is unaffected.
              </p>
            </div>
          </Card>
        )}
      </RevealSection>


      {/* ── 2 · KEY FINDINGS ─────────────────────────────────────────── */}
      {summary.length > 0 && (
        <RevealSection order={1}>
          <Card className="space-y-4 p-5 sm:p-6">
            <SectionHeading icon={<Sparkles className="h-3.5 w-3.5 text-primary" />}>
              {t('videoAnalysis.keyFindings')}
            </SectionHeading>

            {topTakeaway && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                  {t('videoAnalysis.topTakeaway', 'Top takeaway')}
                </p>
                <p className="mt-1 text-base font-medium leading-snug">{topTakeaway}</p>
              </div>
            )}

            {restFindings.length > 0 && (
              <ol className="space-y-2.5">
                {restFindings.map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold tabular-nums text-muted-foreground">
                      {index + 2}
                    </span>
                    <span className="text-sm leading-relaxed">{point}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </RevealSection>
      )}

      {/* ── 3 · TEMPO (pitching only) ────────────────────────────────── */}
      {persistedTempo && moduleKey === "pitching" && (
        <RevealSection order={2}>
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <SectionHeading icon={<Timer className="h-3.5 w-3.5 text-primary" />}>
                  {t('videoAnalysis.tempoTitle', 'Tempo')}
                </SectionHeading>
                {persistedTempo.value != null ? (
                  <p className="text-3xl font-black tabular-nums">
                    {persistedTempo.value.toFixed(2)}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      {t('videoAnalysis.tempoUnit', 'sec')}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('videoAnalysis.tempoUnreadable', 'Tempo could not be read from this clip.')}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground/80">
                  {t('videoAnalysis.tempoNote', 'Measured deterministically from your video — leg lift to front-foot strike.')}
                </p>
              </div>

              <Collapsible className="w-full sm:w-auto sm:min-w-[280px]">
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-xs font-semibold hover:bg-muted/40">
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                  {t('videoAnalysis.tempoRecordingTips', 'How to record for reliable Tempo')}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Tempo needs to see your peak leg lift and front-foot strike. A few small framing choices make this consistent.
                    </p>
                    <ul className="space-y-2">
                      {[
                        { Icon: Camera, label: 'Side-on camera', body: 'Film from the open side (3B side for RHP, 1B side for LHP), perpendicular to the rubber-to-plate line.' },
                        { Icon: User, label: 'Full body in frame', body: 'Head to spikes visible the entire delivery; leave ~1 ft of headroom and foot-room.' },
                        { Icon: Play, label: 'Start before the leg lift', body: "Begin recording at the set position; don't trim the front of the clip." },
                        { Icon: Square, label: 'End after release', body: 'Keep filming through ball release and into follow-through.' },
                        { Icon: Sun, label: 'Good lighting, low motion blur', body: 'Daylight or bright cage lighting; phone in 1080p/60fps if available; lock exposure on the pitcher.' },
                      ].map(({ Icon, label, body }) => (
                        <li key={label} className="flex items-start gap-2">
                          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="text-xs">
                            <span className="font-semibold">{label}</span>
                            <span className="text-muted-foreground"> — {body}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[11px] text-muted-foreground/80">
                      If Tempo keeps failing to read with these conditions met, the lead leg may be occluded by the glove-side arm — try a slightly higher camera (chest height) and step back 2–3 ft.
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </Card>
        </RevealSection>
      )}

      {/* ── 4 · WHAT'S WORKING ───────────────────────────────────────── */}
      {analysis.positives && analysis.positives.length > 0 && (
        <RevealSection order={3}>
          <Card className="border-green-500/40 bg-green-500/5 p-5 sm:p-6">
            <SectionHeading icon={<Trophy className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />}>
              <span className="text-green-700 dark:text-green-300">
                {t('videoAnalysis.whatYoureDoingWell')}
              </span>
            </SectionHeading>
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {analysis.positives.map((positive, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2.5 rounded-md border border-green-500/20 bg-background/60 px-3 py-2.5"
                >
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm leading-snug">{positive}</span>
                </li>
              ))}
            </ul>
          </Card>
        </RevealSection>
      )}

      {/* ── 5 · DETAILED ANALYSIS ────────────────────────────────────── */}
      {feedbackParagraphs.length > 0 && (
        <RevealSection order={4}>
          <Card className="space-y-4 p-5 sm:p-6">
            <SectionHeading icon={<MessageSquareText className="h-3.5 w-3.5 text-primary" />}>
              {t('videoAnalysis.detailedAnalysis')}
            </SectionHeading>
            <div className="space-y-3">
              {feedbackParagraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className="border-l-2 border-primary/30 pl-4 text-sm leading-relaxed text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </Card>
        </RevealSection>
      )}

      {/* ── 6 · YOUR PRESCRIPTION (drills) ───────────────────────────── */}
      {analysis.drills && analysis.drills.length > 0 && (
        <RevealSection order={5}>
          <Card className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionHeading icon={<ClipboardList className="h-3.5 w-3.5 text-primary" />}>
                {t('videoAnalysis.yourPrescription', 'Your prescription')}
              </SectionHeading>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Heart className="h-3.5 w-3.5" />
                {t('videoAnalysis.drillSaveHint')}
              </p>
            </div>

            <div className="space-y-4">
              {analysis.drills.map((drill, index) => {
                const isSaved = savedDrillIds.has(drill.title);
                return (
                  <div
                    key={index}
                    className="rounded-xl border border-border bg-muted/30 p-4 transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <h5 className="text-base font-semibold leading-snug">{drill.title}</h5>
                          <p className="mt-1 text-sm text-muted-foreground">{drill.purpose}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onSaveDrill(drill)}
                        disabled={isSaved}
                        className={isSaved ? "shrink-0 text-red-500" : "shrink-0 text-muted-foreground hover:text-red-500"}
                        title={isSaved ? t('vault.drills.saved', 'Saved to Vault') : t('vault.drills.save', 'Save to Vault')}
                      >
                        <Heart className={cn("h-5 w-5", isSaved && "fill-current")} />
                      </Button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-md bg-primary/10 px-2.5 py-1 font-semibold text-primary">
                        {drill.reps_sets}
                      </span>
                      <span className="rounded-md bg-secondary/60 px-2.5 py-1 text-secondary-foreground">
                        {drill.equipment}
                      </span>
                    </div>

                    <Collapsible className="mt-3">
                      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                        <ListChecks className="h-3.5 w-3.5" />
                        {t('videoAnalysis.howToRunIt', 'How to run it')}
                        <ChevronDown className="h-3.5 w-3.5 transition-transform data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <ol className="list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
                          {drill.steps?.map((step, stepIndex) => (
                            <li key={stepIndex}>{step}</li>
                          ))}
                        </ol>
                        {drill.cues && drill.cues.length > 0 && (
                          <div className="mt-3 border-t border-border/50 pt-3">
                            <p className="mb-1.5 text-xs font-medium">{t('videoAnalysis.coachingCues')}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {drill.cues.map((cue, cueIndex) => (
                                <span
                                  key={cueIndex}
                                  className="rounded-md bg-background px-2 py-0.5 text-xs text-muted-foreground"
                                >
                                  {cue}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          </Card>
        </RevealSection>
      )}

      {/* ── 7 · ASK THE COACH ────────────────────────────────────────── */}
      <RevealSection order={6}>
        <div className="space-y-2">
          <SectionHeading icon={<Wrench className="h-3.5 w-3.5 text-primary" />}>
            {t('videoAnalysis.askTheCoach', 'Ask the coach')}
          </SectionHeading>
          <AnalysisCoachChat
            module={moduleKey || 'hitting'}
            analysisContext={{
              // Phase 51 — no fabricated numeric biomechanical claim seeded.
              feedback: analysis.feedback,
              positives: analysis.positives,
              drills: analysis.drills,
              summary: analysis.summary,
            }}
          />
        </div>
      </RevealSection>

      {/* ── 8 · FOOTER ───────────────────────────────────────────────── */}
      <RevealSection order={7}>
        <div className="space-y-4">
          <p className="border-t pt-4 text-xs leading-relaxed text-muted-foreground/70">
            <strong>{t('videoAnalysis.disclaimer')}</strong> {branding.appName} waives all liability for any injuries that may occur from performing training techniques demonstrated or recommended through this platform. Users assume full responsibility for their safety and should consult with qualified professionals before beginning any training program.
          </p>
          <div className="flex max-w-full flex-col gap-2 overflow-x-hidden xs:flex-row">
            <Button onClick={onSaveToLibrary} variant="outline" className="w-full xs:flex-1">
              <BookMarked className="h-4 w-4 sm:mr-2" />
              {t('videoAnalysis.saveToLibrary')}
            </Button>
            <Button onClick={onReturnToDashboard} className="w-full xs:flex-1">
              <Home className="h-4 w-4 xs:hidden" />
              <span className="hidden xs:inline">{t('videoAnalysis.returnToDashboard')}</span>
              <span className="xs:hidden">{t('navigation.dashboard')}</span>
            </Button>
          </div>
        </div>
      </RevealSection>
    </div>
  );
}
