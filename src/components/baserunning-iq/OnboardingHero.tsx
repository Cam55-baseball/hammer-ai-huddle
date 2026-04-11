import { Brain, ChevronRight, Eye, Zap, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface OnboardingHeroProps {
  onStart: () => void;
}

const BULLETS = [
  { icon: Eye, text: "Read the game before it happens" },
  { icon: Zap, text: "React faster under pressure" },
  { icon: Target, text: "Make elite decisions on the bases" },
];

export function OnboardingHero({ onStart }: OnboardingHeroProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-md p-8 space-y-6 text-center">
        <div className="flex justify-center">
          <div className="p-3 rounded-2xl bg-primary/10">
            <Brain className="h-10 w-10 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Build Your Baserunning IQ</h1>
          <p className="text-muted-foreground text-sm">
            Master decisions that separate average from elite
          </p>
        </div>

        <div className="space-y-3 text-left">
          {BULLETS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">{text}</span>
            </div>
          ))}
        </div>

        <Button onClick={onStart} size="lg" className="w-full gap-2">
          Start Training <ChevronRight className="h-4 w-4" />
        </Button>
      </Card>
    </div>
  );
}
