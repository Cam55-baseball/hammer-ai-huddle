import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Target, Dumbbell, ArrowRight, Zap } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";

const tiles = [
  {
    key: "pitching-analysis",
    icon: Target,
    labelKey: "dashboard.modules.pitchingAnalysis",
    description: "Analyze delivery mechanics, arm action, and sequencing",
    getRoute: (sport: string) => `/analyze/pitching?sport=${sport}`,
  },
  {
    key: "heat-factory",
    icon: Dumbbell,
    labelKey: "workoutModules.productionStudio.title",
    labelFallback: "Heat Factory",
    description: "Build arm strength and durability with structured training",
    getRoute: () => "/production-studio",
  },
  {
    key: "explosive-conditioning",
    icon: Zap,
    labelKey: "explosiveConditioning.title",
    labelFallback: "Explosive Conditioning",
    description: "Build elite speed and explosive power with structured conditioning",
    getRoute: () => "/explosive-conditioning",
  },
] as const;

export default function CompletePitcher() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const selectedSport = localStorage.getItem("selectedSport") || "baseball";

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8 py-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {t("dashboard.modules.completePitcherShort")}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            {t("dashboard.modules.completePitcherDescription")}
          </p>
        </div>

        {/* Selection Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            const route = tile.getRoute(selectedSport);

            return (
              <Card
                key={tile.key}
                onClick={() => navigate(route)}
                className="group cursor-pointer p-6 sm:p-8 hover:shadow-lg transition-all hover:scale-[1.02] hover:border-primary/50 flex flex-col items-center text-center gap-4"
              >
                <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                </div>

                <h2 className="text-xl sm:text-2xl font-bold">
                  {"labelFallback" in tile
                    ? t(tile.labelKey, tile.labelFallback)
                    : t(tile.labelKey)}
                </h2>

                <p className="text-sm sm:text-base text-muted-foreground">
                  {tile.description}
                </p>

                <div className="mt-auto flex items-center gap-1 text-primary font-medium text-sm group-hover:gap-2 transition-all">
                  {t("dashboard.modules.completePlayerExplore")}
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
