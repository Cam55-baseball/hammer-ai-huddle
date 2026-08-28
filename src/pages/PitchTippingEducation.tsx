/**
 * PitchTippingEducation — hitter-facing educational submodule.
 * Pure content, no detection claims, safe for real users (not staff-gated).
 */
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Sparkles, Search, Repeat, Lightbulb } from "lucide-react";

const SECTIONS = [
  {
    icon: Eye,
    title: "What is pitch tipping?",
    body: "Sometimes a pitcher does something a little different depending on which pitch they're about to throw. Maybe their glove sits higher for a curveball, or their hands slow down for a changeup. That small difference is called a 'tell' — and when a pitcher has one, hitters say the pitcher is 'tipping' their pitches.",
  },
  {
    icon: Search,
    title: "What picking up a tell looks like",
    body: "Hitters watch the same things over and over: how the pitcher holds the glove, where their hands start, how fast their body moves, how high the leg lift is. If one of those things changes only when a certain pitch is coming, a hitter who spots it knows the pitch before it's thrown.",
  },
  {
    icon: Repeat,
    title: "Why it matters so much",
    body: "Hitting is about timing. If you already know a fastball is coming, you can start sooner and swing with more confidence. Even the best pitchers in the world have been tipped — and teams spend hours on video looking for these patterns before a big game.",
  },
  {
    icon: Lightbulb,
    title: "How to practice it",
    body: "Watch pitchers on video with the sound off. Pick one thing — like the glove — and only watch that, pitch after pitch. Ask yourself: does it look the same every time? The more pitches you watch, the easier the small differences are to see.",
  },
];

export default function PitchTippingEducation() {
  return (
    <DashboardLayout>
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <div className="space-y-1">
          <h1 className="text-xl font-black">Pitch Tipping 101</h1>
          <p className="text-sm text-muted-foreground">
            A hitter's guide to spotting what a pitcher is about to throw — before
            they throw it.
          </p>
        </div>

        {SECTIONS.map((s) => (
          <Card key={s.title}>
            <CardContent className="space-y-2 p-4">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <s.icon className="h-4 w-4 text-primary" />
                {s.title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </CardContent>
          </Card>
        ))}

        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex items-start gap-3 p-4">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-1">
              <h2 className="text-sm font-bold">Automatic tipping detection is coming soon</h2>
              <p className="text-sm text-muted-foreground">
                We're building a tool that checks a pitcher's videos for tells
                automatically — comparing how their body moves on one pitch type
                versus another, the same way you'd do it by hand. No date to share
                yet, but it's on the way.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </DashboardLayout>
  );
}
