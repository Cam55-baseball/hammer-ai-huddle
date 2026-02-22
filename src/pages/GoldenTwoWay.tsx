import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Target, Dumbbell, Eye, Zap, ArrowRight, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";

const tiles = [
  {
    key: "hitting-analysis",
    icon: Target,
    label: "Hitting Analysis",
    description: "Analyze swing mechanics, bat path, and timing",
    getRoute: (sport: string) => `/analyze/hitting?sport=${sport}`,
  },
  {
    key: "pitching-analysis",
    icon: Target,
    label: "Pitching Analysis",
    description: "Break down pitching mechanics and delivery",
    getRoute: (sport: string) => `/analyze/pitching?sport=${sport}`,
  },
  {
    key: "throwing-analysis",
    icon: Target,
    label: "Throwing Analysis",
    description: "Break down throwing mechanics and arm action",
    getRoute: (sport: string) => `/analyze/throwing?sport=${sport}`,
  },
  {
    key: "the-unicorn",
    icon: Sparkles,
    label: "The Unicorn",
    description: "Elite merged workout: strength, speed, velocity, and arm care",
    getRoute: () => "/the-unicorn",
    featured: true,
  },
  {
    key: "speed-lab",
    icon: Zap,
    label: "Speed Lab",
    description: "Build elite sprint speed with CNS-tracked protocols",
    getRoute: () => "/speed-lab",
  },
  {
    key: "tex-vision",
    icon: Eye,
    label: "Tex Vision",
    description: "Train your eyes to track pitches like a pro",
    getRoute: () => "/tex-vision",
  },
] as const;

export default function GoldenTwoWay() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const selectedSport = localStorage.getItem("selectedSport") || "baseball";

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 py-4">
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            The Golden 2Way
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Complete 2-way athlete development — hitting, pitching, throwing, speed, and The Unicorn
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            const route = tile.getRoute(selectedSport);
            const isFeatured = 'featured' in tile && tile.featured;

            return (
              <Card
                key={tile.key}
                onClick={() => navigate(route)}
                className={`group cursor-pointer p-6 sm:p-8 hover:shadow-lg transition-all hover:scale-[1.02] hover:border-primary/50 flex flex-col items-center text-center gap-4 ${
                  isFeatured ? 'border-2 border-primary/50 bg-primary/5' : ''
                }`}
              >
                <div className={`p-4 rounded-full transition-colors ${
                  isFeatured 
                    ? 'bg-primary/20 group-hover:bg-primary/30' 
                    : 'bg-primary/10 group-hover:bg-primary/20'
                }`}>
                  <Icon className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                </div>

                <h2 className="text-xl sm:text-2xl font-bold">{tile.label}</h2>

                <p className="text-sm sm:text-base text-muted-foreground">
                  {tile.description}
                </p>

                <div className="mt-auto flex items-center gap-1 text-primary font-medium text-sm group-hover:gap-2 transition-all">
                  Start Training
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
