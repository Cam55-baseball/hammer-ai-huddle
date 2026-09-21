/**
 * MovementGuideSheet — bottom-sheet with the full zero-prior-knowledge
 * explanation for a single movement. Opened by a "How do I do this?" button
 * on every drill row across Hammers Today.
 */
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { composeGuide } from "@/lib/hammer/prescription/composeGuide";
import { guideFor, type MovementGuide } from "@/lib/hammer/prescription/movementGuide";

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  name: string;
  slug?: string | null;
  guideOverride?: MovementGuide | null;
  fallbackCue?: string | null;
  fallbackSetup?: string | null;
  fallbackStopIf?: string | null;
  dosage?: string | null;
  bucket?: string | null;
}

export function MovementGuideSheet({
  open, onOpenChange, name, slug, guideOverride, fallbackCue, fallbackSetup, fallbackStopIf,
  dosage = null, bucket = null,
}: Props) {
  const guide = guideOverride ?? guideFor(slug) ?? guideFor(name);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">{name}</SheetTitle>
          <SheetDescription>How to do this movement — zero prior knowledge required.</SheetDescription>
        </SheetHeader>

        {guide ? (
          <div className="mt-4 space-y-4 text-sm">
            <Section title="What it is">{guide.what}</Section>
            <Section title="Setup">{guide.setup}</Section>

            <div>
              <SectionTitle icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}>Good rep</SectionTitle>
              <ul className="mt-1 space-y-1 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2">
                {guide.goodRep.map((r, i) => (
                  <li key={i} className="flex gap-2 text-[13px]">
                    <span className="text-emerald-600">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <SectionTitle icon={<XCircle className="h-3.5 w-3.5 text-rose-600" />}>Common mistakes</SectionTitle>
              <ul className="mt-1 space-y-1 rounded-md border border-rose-500/20 bg-rose-500/5 p-2">
                {guide.badRep.map((r, i) => (
                  <li key={i} className="flex gap-2 text-[13px]">
                    <span className="text-rose-600">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Section title="What it should feel like">{guide.feel}</Section>
            <Section title="Why today">{guide.whyToday}</Section>
            <Section title="Next up">{guide.nextLink}</Section>

            {guide.stopIf && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 flex items-start gap-2 text-[13px]">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-amber-800 dark:text-amber-200">Stop if</div>
                  <div className="text-amber-900/90 dark:text-amber-100/90">{guide.stopIf}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          (() => {
            // Step 24 item 3 — a real, structured guide built from this
            // movement's own stored setup, cue, dose and stop rule.
            const c = composeGuide({
              name,
              slug,
              setup: fallbackSetup,
              cue: fallbackCue,
              stopIf: fallbackStopIf,
              dosage,
              bucket,
            });
            return (
              <div className="mt-4 space-y-4 text-sm">
                <Section title="Setup">{c.setup}</Section>
                <div>
                  <SectionTitle>Steps</SectionTitle>
                  <ol className="mt-1 list-decimal space-y-1 pl-5 text-[13px]">
                    {c.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <SectionTitle icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}>Key cues</SectionTitle>
                  <ul className="mt-1 space-y-1 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2">
                    {c.keyCues.map((s, i) => (
                      <li key={i} className="flex gap-2 text-[13px]">
                        <span className="text-emerald-600">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <SectionTitle icon={<XCircle className="h-3.5 w-3.5 text-rose-600" />}>Common mistakes</SectionTitle>
                  <ul className="mt-1 space-y-1 rounded-md border border-rose-500/20 bg-rose-500/5 p-2">
                    {c.mistakes.map((s, i) => (
                      <li key={i} className="flex gap-2 text-[13px]">
                        <span className="text-rose-600">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Section title="Easier version">{c.easier}</Section>
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 flex items-start gap-2 text-[13px]">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-amber-800 dark:text-amber-200">Stop if</div>
                    <div className="text-amber-900/90 dark:text-amber-100/90">{c.stopIf}</div>
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      <p className="mt-1 text-[13px] leading-relaxed text-foreground/90">{children}</p>
    </div>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {icon}
      <span>{children}</span>
    </div>
  );
}
