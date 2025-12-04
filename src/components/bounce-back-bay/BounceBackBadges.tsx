import { useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  Award, Shield, Brain, Heart, Target, Zap, 
  Medal, Trophy, Star, Crown, Sparkles, Lock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BadgeData {
  key: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  category: "injury" | "tiered" | "special";
  requirement: number;
}

const allBadges: BadgeData[] = [
  // Injury Study Badges
  { key: "shoulder_scholar", icon: Target, color: "text-blue-500", bgColor: "bg-blue-500/20", category: "injury", requirement: 1 },
  { key: "elbow_expert", icon: Zap, color: "text-orange-500", bgColor: "bg-orange-500/20", category: "injury", requirement: 1 },
  { key: "hamstring_headliner", icon: Heart, color: "text-red-500", bgColor: "bg-red-500/20", category: "injury", requirement: 1 },
  { key: "ankle_analyst", icon: Shield, color: "text-green-500", bgColor: "bg-green-500/20", category: "injury", requirement: 1 },
  { key: "wrist_wizard", icon: Sparkles, color: "text-purple-500", bgColor: "bg-purple-500/20", category: "injury", requirement: 1 },
  { key: "back_boss", icon: Brain, color: "text-teal-500", bgColor: "bg-teal-500/20", category: "injury", requirement: 1 },
  // Tiered Badges
  { key: "bronze_anatomy", icon: Medal, color: "text-amber-600", bgColor: "bg-amber-500/20", category: "tiered", requirement: 3 },
  { key: "silver_anatomy", icon: Medal, color: "text-slate-400", bgColor: "bg-slate-400/20", category: "tiered", requirement: 7 },
  { key: "gold_anatomy", icon: Medal, color: "text-yellow-500", bgColor: "bg-yellow-500/20", category: "tiered", requirement: 12 },
  { key: "elite_recovery", icon: Trophy, color: "text-cyan-500", bgColor: "bg-cyan-500/20", category: "tiered", requirement: 20 },
  // Special Achievement Badges (Quiz-based)
  { key: "diagnostic_detective", icon: Brain, color: "text-emerald-500", bgColor: "bg-emerald-500/20", category: "special", requirement: 1 },
  { key: "red_flag_ready", icon: Shield, color: "text-red-500", bgColor: "bg-red-500/20", category: "special", requirement: 1 },
  { key: "pain_scale_pro", icon: Target, color: "text-orange-500", bgColor: "bg-orange-500/20", category: "special", requirement: 1 },
  { key: "recovery_intelligence", icon: Brain, color: "text-indigo-500", bgColor: "bg-indigo-500/20", category: "special", requirement: 1 },
  { key: "human_body_mastery", icon: Crown, color: "text-yellow-500", bgColor: "bg-yellow-500/20", category: "special", requirement: 100 },
];

interface BounceBackBadgesProps {
  earnedBadges: string[];
  sectionsCompleted: string[];
}

export function BounceBackBadges({ earnedBadges, sectionsCompleted }: BounceBackBadgesProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<"all" | "injury" | "tiered" | "special">("all");

  const filteredBadges = selectedCategory === "all" 
    ? allBadges 
    : allBadges.filter(b => b.category === selectedCategory);

  const isBadgeEarned = (badgeKey: string) => earnedBadges.includes(badgeKey);

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {(["all", "injury", "tiered", "special"] as const).map((cat) => (
          <Badge
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(cat)}
          >
            {t(`bounceBackBay.badges.categories.${cat}`)}
          </Badge>
        ))}
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredBadges.map((badge) => {
          const Icon = badge.icon;
          const earned = isBadgeEarned(badge.key);
          
          return (
            <Card 
              key={badge.key}
              className={cn(
                "relative overflow-hidden transition-all duration-300",
                earned 
                  ? "border-primary/50 shadow-lg" 
                  : "opacity-60 grayscale"
              )}
            >
              {earned && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 animate-pulse" />
              )}
              <CardContent className="p-3 relative">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={cn(
                    "p-3 rounded-full transition-all",
                    earned ? badge.bgColor : "bg-muted",
                    earned && "ring-2 ring-primary/30 animate-[pulse_3s_ease-in-out_infinite]"
                  )}>
                    {earned ? (
                      <Icon className={cn("h-6 w-6", badge.color)} />
                    ) : (
                      <Lock className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold line-clamp-2">
                      {t(`bounceBackBay.badges.items.${badge.key}.name`)}
                    </p>
                    {earned && (
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        <Star className="h-2 w-2 mr-1" />
                        {t('bounceBackBay.badges.earned')}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
              
              {/* Safety Disclaimer on hover */}
              {earned && (
                <div className="absolute bottom-0 left-0 right-0 bg-background/95 p-2 text-[8px] text-muted-foreground text-center border-t opacity-0 hover:opacity-100 transition-opacity">
                  {t('bounceBackBay.badges.safetyDisclaimer')}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Badge Legend */}
      <Card className="bg-muted/30">
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground text-center">
            {t('bounceBackBay.badges.legendText')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
