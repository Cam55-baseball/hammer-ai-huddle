import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePersonalBests } from '@/hooks/usePersonalBests';
import { 
  Eye, 
  Search, 
  Focus, 
  Crosshair, 
  ScanEye, 
  Target, 
  Gamepad2, 
  Timer, 
  Glasses,
  Lock,
  Play,
  Palette,
  Moon,
  Brain,
  Layers,
  Zap,
  Split,
  Grid3X3,
  Trophy
} from 'lucide-react';
import { ALL_DRILLS, DrillTier, isTierUnlocked } from '@/constants/texVisionDrills';

interface TexVisionDrillLibraryProps {
  currentTier: DrillTier;
  onDrillStart: (drillId: string, tier: string) => void;
}

// Icon mapping for centralized drill definitions
const DRILL_ICONS: Record<string, React.ReactNode> = {
  soft_focus: <Eye className="h-5 w-5" />,
  pattern_search: <Search className="h-5 w-5" />,
  peripheral_vision: <ScanEye className="h-5 w-5" />,
  convergence: <Focus className="h-5 w-5" />,
  color_flash: <Palette className="h-5 w-5" />,
  eye_relaxation: <Moon className="h-5 w-5" />,
  near_far: <Glasses className="h-5 w-5" />,
  smooth_pursuit: <Target className="h-5 w-5" />,
  whack_a_mole: <Gamepad2 className="h-5 w-5" />,
  meter_timing: <Timer className="h-5 w-5" />,
  stroop_challenge: <Brain className="h-5 w-5" />,
  multi_target_track: <Layers className="h-5 w-5" />,
  brock_string: <Crosshair className="h-5 w-5" />,
  rapid_switch: <Zap className="h-5 w-5" />,
  dual_task_vision: <Split className="h-5 w-5" />,
  chaos_grid: <Grid3X3 className="h-5 w-5" />,
};

// Transform centralized drills with React icons for display
const DRILLS = ALL_DRILLS.map(drill => ({
  ...drill,
  icon: DRILL_ICONS[drill.id] || <Eye className="h-5 w-5" />,
}));

type DrillWithIcon = typeof DRILLS[number];

export default function TexVisionDrillLibrary({ currentTier, onDrillStart }: TexVisionDrillLibraryProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { getPersonalBest } = usePersonalBests();

  // Use centralized tier check function
  const isDrillUnlocked = (drillTier: DrillTier) => isTierUnlocked(drillTier, currentTier);

  const filteredDrills = selectedCategory
    ? DRILLS.filter(d => d.category === selectedCategory)
    : DRILLS;

  const categories = [
    { id: 'focus', labelKey: 'texVision.categories.focus', defaultLabel: 'Focus' },
    { id: 'tracking', labelKey: 'texVision.categories.tracking', defaultLabel: 'Tracking' },
    { id: 'reaction', labelKey: 'texVision.categories.reaction', defaultLabel: 'Reaction' },
    { id: 'coordination', labelKey: 'texVision.categories.coordination', defaultLabel: 'Coordination' },
  ];

  const getTierBadgeStyle = (tier: DrillTier) => {
    switch (tier) {
      case 'beginner':
        return 'bg-[hsl(var(--tex-vision-success))]/20 text-[hsl(var(--tex-vision-success))] border-[hsl(var(--tex-vision-success))]/30';
      case 'advanced':
        return 'bg-[hsl(var(--tex-vision-feedback))]/20 text-[hsl(var(--tex-vision-feedback))] border-[hsl(var(--tex-vision-feedback))]/30';
      case 'chaos':
        return 'bg-[hsl(var(--tex-vision-timing))]/20 text-[hsl(var(--tex-vision-timing))] border-[hsl(var(--tex-vision-timing))]/30';
    }
  };

  // Group drills by tier for display
  const beginnerDrills = filteredDrills.filter(d => d.tier === 'beginner');
  const advancedDrills = filteredDrills.filter(d => d.tier === 'advanced');
  const chaosDrills = filteredDrills.filter(d => d.tier === 'chaos');

  const renderDrillCard = (drill: DrillWithIcon) => {
    const unlocked = isDrillUnlocked(drill.tier);
    const pb = getPersonalBest(drill.id, drill.tier);
    const hasPB = pb && (pb.best_accuracy_percent !== null || pb.best_reaction_time_ms !== null);

    return (
      <div
        key={drill.id}
        className={`relative p-4 rounded-lg border transition-all duration-150 ${
          unlocked
            ? 'bg-[hsl(var(--tex-vision-primary-dark))]/50 border-[hsl(var(--tex-vision-primary-light))]/20 hover:border-[hsl(var(--tex-vision-feedback))]/50 cursor-pointer'
            : 'bg-[hsl(var(--tex-vision-primary-dark))]/30 border-[hsl(var(--tex-vision-primary-light))]/10 opacity-60'
        }`}
        onClick={() => unlocked && onDrillStart(drill.id, drill.tier)}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${
            unlocked 
              ? 'bg-[hsl(var(--tex-vision-feedback))]/10 text-[hsl(var(--tex-vision-feedback))]' 
              : 'bg-[hsl(var(--tex-vision-primary-light))]/10 text-[hsl(var(--tex-vision-text-muted))]'
          }`}>
            {unlocked ? drill.icon : <Lock className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`font-medium text-sm ${
                unlocked ? 'text-[hsl(var(--tex-vision-text))]' : 'text-[hsl(var(--tex-vision-text-muted))]'
              }`}>
                {t(drill.nameKey, drill.defaultName)}
              </h4>
              <Badge 
                variant="outline" 
                className={`text-[10px] ${getTierBadgeStyle(drill.tier)}`}
              >
                {drill.tier}
              </Badge>
            </div>
            <p className="text-xs text-[hsl(var(--tex-vision-text-muted))] line-clamp-2">
              {t(drill.descriptionKey, drill.defaultDescription)}
            </p>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[hsl(var(--tex-vision-text-muted))]">
                  {drill.duration}
                </span>
                {/* Personal best indicator */}
                {hasPB && unlocked && (
                  <div className="flex items-center gap-1">
                    <Trophy className="h-3 w-3 text-[hsl(var(--tex-vision-warning))]" />
                    <span className="text-[10px] text-[hsl(var(--tex-vision-warning))] font-medium">
                      {pb.best_accuracy_percent}%
                    </span>
                  </div>
                )}
              </div>
              {unlocked && (
                <div className="flex items-center gap-1 text-[10px] text-[hsl(var(--tex-vision-feedback))]">
                  <Play className="h-3 w-3" />
                  <span>{t('texVision.drillLibrary.start', 'Start')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-[hsl(var(--tex-vision-primary))]/50 border-[hsl(var(--tex-vision-primary-light))]/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-[hsl(var(--tex-vision-text))] flex items-center gap-2">
          <Target className="h-5 w-5 text-[hsl(var(--tex-vision-feedback))]" />
          {t('texVision.drillLibrary.title', 'Drill Library')}
          <Badge variant="secondary" className="ml-2 text-xs">
            {DRILLS.length} drills
          </Badge>
        </CardTitle>
        <CardDescription className="text-[hsl(var(--tex-vision-text))]">
          {t('texVision.drillLibrary.description', 'Select a drill to begin your neuro-visual training')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className={`text-xs transition-all duration-150 ${
              selectedCategory === null
                ? 'bg-[hsl(var(--tex-vision-feedback))]/20 text-[hsl(var(--tex-vision-feedback))] border-[hsl(var(--tex-vision-feedback))]/50'
                : 'bg-transparent text-[hsl(var(--tex-vision-text-muted))] border-[hsl(var(--tex-vision-primary-light))]/30 hover:border-[hsl(var(--tex-vision-feedback))]/50'
            }`}
          >
            {t('texVision.categories.all', 'All')}
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant="outline"
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-xs transition-all duration-150 ${
                selectedCategory === cat.id
                  ? 'bg-[hsl(var(--tex-vision-feedback))]/20 text-[hsl(var(--tex-vision-feedback))] border-[hsl(var(--tex-vision-feedback))]/50'
                  : 'bg-transparent text-[hsl(var(--tex-vision-text-muted))] border-[hsl(var(--tex-vision-primary-light))]/30 hover:border-[hsl(var(--tex-vision-feedback))]/50'
              }`}
            >
              {t(cat.labelKey, cat.defaultLabel)}
            </Button>
          ))}
        </div>

        {/* Drills by Tier */}
        <div className="space-y-6">
          {/* Beginner Section */}
          {beginnerDrills.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[hsl(var(--tex-vision-success))] mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[hsl(var(--tex-vision-success))]" />
                Beginner ({beginnerDrills.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {beginnerDrills.map(renderDrillCard)}
              </div>
            </div>
          )}

          {/* Advanced Section */}
          {advancedDrills.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[hsl(var(--tex-vision-feedback))] mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[hsl(var(--tex-vision-feedback))]" />
                Advanced ({advancedDrills.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {advancedDrills.map(renderDrillCard)}
              </div>
            </div>
          )}

          {/* Chaos Section */}
          {chaosDrills.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[hsl(var(--tex-vision-timing))] mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[hsl(var(--tex-vision-timing))]" />
                Chaos ({chaosDrills.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {chaosDrills.map(renderDrillCard)}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
