/**
 * Internal design preview for the analysis-results redesign.
 *
 * Fixture data only — nothing here touches the pipeline, the ledger, or any
 * athlete surface. Unlinked from navigation; reachable at
 * /dev/analysis-results-preview?v=legacy (old layout) or ?v=new (redesign).
 */

import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Camera,
  ChevronDown,
  Heart,
  Play,
  Square,
  Sun,
  User,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AnalysisResultsPanel, type AnalysisResultData } from "@/components/analyze/AnalysisResultsPanel";

const FIXTURE: AnalysisResultData = {
  efficiency_score: 74,
  summary: [
    "Your lower half drives the delivery — hip-shoulder separation at foot strike is a real weapon right now.",
    "The glove side flies open early, which leaks your front shoulder and pulls the arm across the body.",
    "Tempo from leg lift to foot strike is in a competitive band, but it drifts late in the clip as fatigue sets in.",
  ],
  feedback:
    "The foundation here is strong. You create real separation between the hips and shoulders at front-foot strike, which is where velocity actually comes from. The stride direction stays on line to the plate and the back leg loads with intent rather than just stepping.\n\nThe main leak is the glove side. Around peak leg lift the front shoulder starts to rotate before the hips have finished opening, so the arm has to make up the difference late. That is where command gets streaky and where unnecessary stress lands on the elbow. Keep the glove firm and out in front a beat longer and let the hips finish first.",
  positives: [
    "Strong hip-shoulder separation at front-foot strike",
    "Stride direction stays on line to the plate",
    "Back-leg load is athletic and repeatable",
    "Head stays level through the delivery",
  ],
  drills: [
    {
      title: "Glove-Side Hold Drill",
      purpose: "Trains the front shoulder to stay closed until the hips fully open, so the arm stops rushing to catch up.",
      steps: [
        "Start in the stretch with the glove firm out in front, chest tall.",
        "Lift the lead leg and hold at peak for a one-count.",
        "Stride and land while keeping the glove side pointed at the target.",
        "Freeze at foot strike for two seconds and check that the chest has not rotated open.",
        "Repeat for the prescribed reps, then throw at 60% intent holding the same shape.",
      ],
      reps_sets: "3 sets × 5 reps",
      equipment: "Glove, mound or flat ground",
      cues: ["Glove to target", "Hips first", "Hold the finish"],
    },
    {
      title: "Tempo Step-Backs",
      purpose: "Locks in a consistent leg-lift-to-strike tempo so timing holds late in outings when fatigue creeps in.",
      steps: [
        "Mark your normal tempo from the clip (1.2–1.4s band).",
        "Step back to 45 feet and throw with a deliberate, even lift.",
        "Match the same tempo on every rep — a coach or partner calls the count.",
        "Finish with 5 full deliveries at game intent holding the same rhythm.",
      ],
      reps_sets: "2 sets × 6 throws",
      equipment: "Ball, partner or target",
      cues: ["Same lift every time", "Even rhythm", "Finish through the target"],
    },
  ],
};

const FIXTURE_TEMPO = {
  value: 1.28,
  missing_reason: null,
  evidence_sha256_hex: "fixture",
};

/** Faithful copy of the pre-redesign markup so before/after can be compared side by side. */
function LegacyResults() {
  const analysis = FIXTURE;
  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-6 space-y-4">
        <h3 className="text-2xl font-bold">Analysis Results</h3>
      </div>

      <div className="space-y-6">
        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          <h4 className="text-lg font-semibold mb-3">Key Findings</h4>
          <ul className="space-y-2">
            {analysis.summary!.map((point, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary mt-1 text-lg">•</span>
                <span className="text-base">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 rounded-lg border border-border bg-background">
          <h4 className="text-lg font-semibold mb-1">Tempo</h4>
          <p className="text-2xl font-bold tabular-nums">
            {FIXTURE_TEMPO.value.toFixed(2)}
            <span className="text-sm font-normal text-muted-foreground"> sec</span>
          </p>
        </div>

        <div className="p-4 rounded-lg border border-border bg-background">
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold w-full text-left">
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
              How to record for reliable Tempo
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <ul className="space-y-2">
                {[
                  { Icon: Camera, label: 'Side-on camera', body: 'Film from the open side, perpendicular to the rubber-to-plate line.' },
                  { Icon: User, label: 'Full body in frame', body: 'Head to spikes visible the entire delivery.' },
                  { Icon: Play, label: 'Start before the leg lift', body: "Begin recording at the set position." },
                  { Icon: Square, label: 'End after release', body: 'Keep filming through ball release.' },
                  { Icon: Sun, label: 'Good lighting', body: 'Daylight or bright cage lighting; 1080p/60fps if available.' },
                ].map(({ Icon, label, body }) => (
                  <li key={label} className="flex items-start gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-xs">
                      <span className="font-semibold">{label}</span>
                      <span className="text-muted-foreground"> — {body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-3">Detailed Analysis</h4>
          <p className="text-muted-foreground whitespace-pre-wrap">{analysis.feedback}</p>
        </div>

        <div className="bg-green-50 dark:bg-green-950/30 border-2 border-green-500 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-2">
                What You're Doing Well
              </h4>
              <ul className="space-y-2">
                {analysis.positives!.map((positive, index) => (
                  <li key={index} className="text-sm text-green-900 dark:text-green-100 flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                    <span>{positive}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-lg font-semibold mb-2">Recommended Drills</h4>
          <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5">
            <Heart className="h-4 w-4" />
            Save drills to your Vault to build your personal library
          </p>
          <div className="space-y-4">
            {analysis.drills.map((drill, index) => (
              <Card key={index} className="p-4 bg-muted/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h5 className="font-semibold text-base mb-1">{drill.title}</h5>
                    <p className="text-sm text-muted-foreground mb-3">{drill.purpose}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500">
                    <Heart className="h-5 w-5" />
                  </Button>
                </div>
                <div className="space-y-2 mb-3">
                  <p className="text-sm font-medium">Steps</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    {drill.steps.map((step, stepIndex) => (
                      <li key={stepIndex}>{step}</li>
                    ))}
                  </ol>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded">{drill.reps_sets}</span>
                  <span className="bg-secondary/50 text-secondary-foreground px-2 py-1 rounded">{drill.equipment}</span>
                </div>
                {drill.cues && drill.cues.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs font-medium mb-1">Coaching Cues</p>
                    <div className="flex flex-wrap gap-1">
                      {drill.cues.map((cue, cueIndex) => (
                        <span key={cueIndex} className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded">
                          {cue}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground/70 leading-relaxed">
            <strong>Disclaimer:</strong> Fixture liability text for preview purposes.
          </p>
        </div>

        <div className="flex flex-col xs:flex-row gap-2 max-w-full overflow-x-hidden">
          <Button variant="outline" className="w-full xs:flex-1">Save to Library</Button>
          <Button className="w-full xs:flex-1">Return to Dashboard</Button>
        </div>
      </div>
    </Card>
  );
}

export default function AnalysisResultsPreview() {
  const [searchParams] = useSearchParams();
  const variant = searchParams.get("v") === "legacy" ? "legacy" : "new";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <div className="rounded-md border border-dashed border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Internal design preview — fixture data only. Variant: <strong>{variant}</strong>. Use
          {" "}?v=legacy / ?v=new to switch.
        </div>

        {variant === "legacy" ? (
          <LegacyResults />
        ) : (
          <AnalysisResultsPanel
            analysis={FIXTURE}
            moduleKey="pitching"
            persistedTempo={FIXTURE_TEMPO}
            savedDrillIds={new Set()}
            onSaveDrill={() => {}}
            onSaveToLibrary={() => {}}
            onReturnToDashboard={() => {}}
          />
        )}
      </div>
    </div>
  );
}
