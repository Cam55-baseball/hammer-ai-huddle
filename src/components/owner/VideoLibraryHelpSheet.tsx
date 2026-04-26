import { HelpCircle, Trash2, Zap, Brain, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { resetLearning, getSmartDefaults } from "@/lib/ownerLearning";
import { useOwnerPrefs } from "@/hooks/useOwnerPrefs";
import { OWNER_AUTHORITY_LABEL } from "@/lib/ownerAuthority";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

export function VideoLibraryHelpSheet() {
  const { fastMode } = useOwnerPrefs();
  const [defaultsTick, setDefaultsTick] = useState(0);
  const defaults = getSmartDefaults();

  const handleReset = () => {
    resetLearning();
    setDefaultsTick(t => t + 1);
    toast({ title: "Learning reset", description: "Smart Defaults cleared." });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <HelpCircle className="h-4 w-4" />
          Help
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>How the Video Library works</SheetTitle>
          <SheetDescription>
            Read this once. It will save you hours.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 text-sm">
          {/* OWNER AUTHORITY — first, because it governs everything below */}
          <section className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <h3 className="font-semibold text-base flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Owner Authority
            </h3>
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">{OWNER_AUTHORITY_LABEL}.</span>
            </p>
            <p className="text-muted-foreground text-xs">
              Hammer can suggest tags, score quality, and explain its reasoning. It
              never auto-applies tags, never overrides your picks, and never
              removes or downgrades anything you set. Every change requires your click.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-base">The 4 things every video needs</h3>
            <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground">
              <li>A <strong className="text-foreground">title</strong>.</li>
              <li>A <strong className="text-foreground">sport + a skill</strong> (e.g. baseball + hitting).</li>
              <li>A <strong className="text-foreground">format</strong> — what kind of video is it?
                (drill, breakdown, slow motion, game at-bat, etc.)</li>
              <li>A short <strong className="text-foreground">description of what it teaches</strong>.
                This powers the smart recommendations.</li>
            </ol>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-base">The simple rule of tags</h3>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Tags</strong> are friendly keywords for search. Pick a few.
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Taxonomy</strong> is the engine&apos;s vocabulary. It has 4 layers:
            </p>
            <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground text-xs">
              <li><strong>Movement</strong> — what the body does (e.g. hands_forward_early)</li>
              <li><strong>Result</strong> — what happens (e.g. roll_over)</li>
              <li><strong>Context</strong> — when it happens (e.g. inside_fastball)</li>
              <li><strong>Correction</strong> — what fixes it (e.g. stay_inside_ball)</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Don&apos;t pick these by hand. Just write the description and click
              <strong className="text-foreground"> ✨ Auto-suggest tags</strong>. The engine proposes — you accept.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-base">The 4 rules of adding a video</h3>
            <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground">
              <li>Every video needs a title, a sport, a skill, and a format.</li>
              <li>Always write 1–2 sentences about what the video teaches.</li>
              <li>Always click <strong className="text-foreground">Auto-suggest tags</strong> and accept at least 2.</li>
              <li>If a video has a <span className="text-destructive">🔴</span> or
                <span className="text-amber-500"> ⚠️</span> badge, fix it before walking away.</li>
            </ol>
          </section>

          {/* FAST MODE */}
          <section className="space-y-2 border-t pt-4">
            <h3 className="font-semibold text-base flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-primary" />
              ⚡ Fast Mode
              {fastMode && <span className="text-[10px] uppercase text-primary">on</span>}
            </h3>
            <p className="text-muted-foreground">
              For owners who know the system. Skips guidance, opens a compact
              one-screen editor with all engine fields visible at once.
            </p>
            <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground text-xs">
              <li>Same save path, same enforcement — nothing skipped under the hood.</li>
              <li>Keyboard-first: <kbd className="px-1 rounded bg-muted text-[10px]">⌘↵</kbd> save · <kbd className="px-1 rounded bg-muted text-[10px]">Esc</kbd> cancel.</li>
              <li>New uploads: collapses Step 4 review and publishes after Step 3.</li>
              <li>Toggle anytime from the top bar — beginner flow stays available.</li>
            </ul>
          </section>

          {/* SMART DEFAULTS */}
          <section className="space-y-2 border-t pt-4">
            <h3 className="font-semibold text-base flex items-center gap-1.5">
              <Brain className="h-4 w-4 text-primary" />
              🧠 Smart Defaults
            </h3>
            <p className="text-muted-foreground">
              Hammer watches your last 50 saves and pre-suggests your most-used
              Format and Skill Domain on new videos.
            </p>
            <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground text-xs">
              <li>It only fills <strong className="text-foreground">empty</strong> fields. Never overrides what you&apos;ve already set.</li>
              <li>You can always change or clear them.</li>
              <li>Reset wipes the local learning store — no DB writes.</li>
            </ul>
            <div className="mt-2 rounded-md bg-muted/40 p-2 text-[11px] space-y-1">
              <p className="text-muted-foreground" key={defaultsTick}>
                <span className="font-semibold text-foreground">Current defaults</span> ({defaults.sampleSize} samples)
              </p>
              <p>Top format: <span className="font-mono">{defaults.topFormat ?? '—'}</span></p>
              <p>Top domains: <span className="font-mono">{defaults.topDomains.join(', ') || '—'}</span></p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="w-full gap-1.5 mt-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Reset Learning
            </Button>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-base">Common mistakes</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Empty description → no recommendations</li>
              <li>Only one tag → won&apos;t show up in matches</li>
              <li>Wrong sport → wrong audience</li>
              <li>Forgetting to publish a fixed video → still shows ⚠️</li>
            </ul>
          </section>

          <section className="space-y-2 border-t pt-4">
            <h3 className="font-semibold text-base">Badge legend</h3>
            <div className="space-y-1 text-muted-foreground">
              <p><span className="text-emerald-500">✅ Ready</span> — wired into the engine, will be recommended.</p>
              <p><span className="text-amber-500">⚠️ Incomplete</span> — missing one or two fields.</p>
              <p><span className="text-destructive">🔴 Empty</span> — no engine fields at all. Fix this first.</p>
              <p><span className="text-emerald-500">✨ 90+</span> Elite confidence · <span className="text-sky-500">70–89</span> Solid · <span className="text-amber-500">&lt;70</span> Needs work.</p>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
