import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function VideoLibraryHelpSheet() {
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
              <strong className="text-foreground"> ✨ Auto-suggest tags</strong>. The engine picks for you.
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
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
