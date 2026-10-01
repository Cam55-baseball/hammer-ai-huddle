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
import { branding } from "@/branding";
import { withoutMeasurementNotation } from "@/lib/reportCard/athleteLanguage";

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
   * Extra prescription content folded into the single "Your prescription"
   * card, so an athlete never sees two competing prescription boxes.
   */
  prescriptionExtra?: ReactNode;
  /**
   * Cross-skill root pattern, folded into Key findings so the report never
   * repeats it in a separate block at the bottom.
   */
  crossDomainSlot?: ReactNode;

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
 * Visual order is intentional: what the clip showed, then what to do about it.
 * Every section cascades in via
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
  prescriptionExtra,
  crossDomainSlot,

}: Props) {
  const { t } = useTranslation();

  const summary = analysis.summary ?? [];
  const [topTakeaway, ...restFindings] = summary;
  const feedbackParagraphs = (analysis.feedback ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="space-y-5">
      {/* ── 2 · KEY FINDINGS ─────────────────────────────────────────── */}
      {(summary.length > 0 || crossDomainSlot) && (
        <RevealSection order={1}>
          <Card className="space-y-4 p-5 sm:p-6">
            <SectionHeading icon={<Sparkles className="h-3.5 w-3.5 text-primary" />}>
              {t('videoAnalysis.keyFindings')}
            </SectionHeading>

            {crossDomainSlot}



            {topTakeaway && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                  {t('videoAnalysis.topTakeaway', 'Top takeaway')}
                </p>
                 <p className="mt-1 text-base font-medium leading-snug">{withoutMeasurementNotation(topTakeaway)}</p>
              </div>
            )}

            {restFindings.length > 0 && (
              <ol className="space-y-2.5">
                {restFindings.map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                     <Sparkles className="mt-1 h-4 w-4 shrink-0 text-primary" />
                     <span className="text-sm leading-relaxed">{withoutMeasurementNotation(point)}</span>
                  </li>
                ))}
              </ol>
            )}
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
                   <span className="text-sm leading-snug">{withoutMeasurementNotation(positive)}</span>
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
                   {withoutMeasurementNotation(paragraph)}
                </p>
              ))}
            </div>
          </Card>
        </RevealSection>
      )}

      {/* ── 6 · YOUR PRESCRIPTION (drills) ───────────────────────────── */}
      {((analysis.drills && analysis.drills.length > 0) || prescriptionExtra) && (
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

            {analysis.drills && analysis.drills.length > 0 && (
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
                         <ListChecks className="mt-1 h-5 w-5 shrink-0 text-primary" />
                        <div className="min-w-0">
                           <h5 className="text-base font-semibold leading-snug">{withoutMeasurementNotation(drill.title)}</h5>
                           <p className="mt-1 text-sm text-muted-foreground">{withoutMeasurementNotation(drill.purpose)}</p>
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
                       <span className="rounded-md bg-primary/10 px-2.5 py-1 font-semibold text-primary">Practice drill</span>
                      <span className="rounded-md bg-secondary/60 px-2.5 py-1 text-secondary-foreground">
                         {withoutMeasurementNotation(drill.equipment)}
                      </span>
                    </div>

                    <Collapsible className="mt-3">
                      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                        <ListChecks className="h-3.5 w-3.5" />
                        {t('videoAnalysis.howToRunIt', 'How to run it')}
                        <ChevronDown className="h-3.5 w-3.5 transition-transform data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                         <ol className="space-y-1.5 text-sm text-muted-foreground">
                          {drill.steps?.map((step, stepIndex) => (
                             <li key={stepIndex}>{withoutMeasurementNotation(step)}</li>
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
                                   {withoutMeasurementNotation(cue)}
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
            )}

            {prescriptionExtra}
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
               feedback: withoutMeasurementNotation(analysis.feedback),
               positives: analysis.positives?.map(withoutMeasurementNotation),
               drills: analysis.drills.map((drill) => ({ ...drill, title: withoutMeasurementNotation(drill.title), purpose: withoutMeasurementNotation(drill.purpose), steps: drill.steps?.map(withoutMeasurementNotation), cues: drill.cues?.map(withoutMeasurementNotation) })),
               summary: analysis.summary?.map(withoutMeasurementNotation),
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
