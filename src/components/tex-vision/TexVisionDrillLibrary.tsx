import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Grid3X3
} from 'lucide-react';
import { TexVisionTier } from '@/hooks/useTexVisionProgress';

interface TexVisionDrillLibraryProps {
  currentTier: TexVisionTier;
  onDrillStart: (drillId: string, tier: string) => void;
}

interface Drill {
  id: string;
  nameKey: string;
  defaultName: string;
  descriptionKey: string;
  defaultDescription: string;
  icon: React.ReactNode;
  tier: TexVisionTier;
  duration: string;
  category: 'focus' | 'tracking' | 'reaction' | 'coordination';
}

const DRILLS: Drill[] = [
  // BEGINNER TIER
  {
    id: 'soft_focus',
    nameKey: 'texVision.drills.softFocus.title',
    defaultName: 'Soft Focus',
    descriptionKey: 'texVision.drills.softFocus.description',
    defaultDescription: 'Develop calm awareness and reduce over-fixation',
    icon: <Eye className="h-5 w-5" />,
    tier: 'beginner',
    duration: '2-3 min',
    category: 'focus',
  },
  {
    id: 'pattern_search',
    nameKey: 'texVision.drills.patternSearch.title',
    defaultName: 'Pattern Search',
    descriptionKey: 'texVision.drills.patternSearch.description',
    defaultDescription: 'Improve visual scanning efficiency',
    icon: <Search className="h-5 w-5" />,
    tier: 'beginner',
    duration: '2-4 min',
    category: 'focus',
  },
  {
    id: 'peripheral_vision',
    nameKey: 'texVision.drills.peripheralVision.title',
    defaultName: 'Peripheral Vision',
    descriptionKey: 'texVision.drills.peripheralVision.description',
    defaultDescription: 'Expand your visual field awareness',
    icon: <ScanEye className="h-5 w-5" />,
    tier: 'beginner',
    duration: '2-3 min',
    category: 'tracking',
  },
  {
    id: 'convergence',
    nameKey: 'texVision.drills.convergence.title',
    defaultName: 'Convergence',
    descriptionKey: 'texVision.drills.convergence.description',
    defaultDescription: 'Train eye alignment and depth perception',
    icon: <Focus className="h-5 w-5" />,
    tier: 'beginner',
    duration: '2-3 min',
    category: 'coordination',
  },
  {
    id: 'color_flash',
    nameKey: 'texVision.drills.colorFlash.title',
    defaultName: 'Color Flash',
    descriptionKey: 'texVision.drills.colorFlash.description',
    defaultDescription: 'React quickly to target colors',
    icon: <Palette className="h-5 w-5" />,
    tier: 'beginner',
    duration: '1-2 min',
    category: 'reaction',
  },
  {
    id: 'eye_relaxation',
    nameKey: 'texVision.drills.eyeRelaxation.title',
    defaultName: 'Eye Relaxation',
    descriptionKey: 'texVision.drills.eyeRelaxation.description',
    defaultDescription: 'Guided rest and eye recovery',
    icon: <Moon className="h-5 w-5" />,
    tier: 'beginner',
    duration: '2-3 min',
    category: 'focus',
  },
  // ADVANCED TIER
  {
    id: 'near_far',
    nameKey: 'texVision.drills.nearFar.title',
    defaultName: 'Near-Far Sight',
    descriptionKey: 'texVision.drills.nearFar.description',
    defaultDescription: 'Rapid depth switching exercises',
    icon: <Glasses className="h-5 w-5" />,
    tier: 'advanced',
    duration: '2-4 min',
    category: 'coordination',
  },
  {
    id: 'smooth_pursuit',
    nameKey: 'texVision.drills.smoothPursuit.title',
    defaultName: 'Follow the Target',
    descriptionKey: 'texVision.drills.smoothPursuit.description',
    defaultDescription: 'Track moving objects with precision',
    icon: <Target className="h-5 w-5" />,
    tier: 'advanced',
    duration: '2-3 min',
    category: 'tracking',
  },
  {
    id: 'whack_a_mole',
    nameKey: 'texVision.drills.whackAMole.title',
    defaultName: 'Whack-a-Mole',
    descriptionKey: 'texVision.drills.whackAMole.description',
    defaultDescription: 'Reaction time and decision making',
    icon: <Gamepad2 className="h-5 w-5" />,
    tier: 'advanced',
    duration: '2-4 min',
    category: 'reaction',
  },
  {
    id: 'meter_timing',
    nameKey: 'texVision.drills.meterTiming.title',
    defaultName: 'Meter Timing',
    descriptionKey: 'texVision.drills.meterTiming.description',
    defaultDescription: 'Precision timing catch game',
    icon: <Timer className="h-5 w-5" />,
    tier: 'advanced',
    duration: '2-3 min',
    category: 'reaction',
  },
  {
    id: 'stroop_challenge',
    nameKey: 'texVision.drills.stroopChallenge.title',
    defaultName: 'Stroop Challenge',
    descriptionKey: 'texVision.drills.stroopChallenge.description',
    defaultDescription: 'Color-word interference training',
    icon: <Brain className="h-5 w-5" />,
    tier: 'advanced',
    duration: '2-3 min',
    category: 'focus',
  },
  {
    id: 'multi_target_track',
    nameKey: 'texVision.drills.multiTargetTrack.title',
    defaultName: 'Multi-Target Track',
    descriptionKey: 'texVision.drills.multiTargetTrack.description',
    defaultDescription: 'Track multiple moving objects',
    icon: <Layers className="h-5 w-5" />,
    tier: 'advanced',
    duration: '2-4 min',
    category: 'tracking',
  },
  // CHAOS TIER
  {
    id: 'brock_string',
    nameKey: 'texVision.drills.brockString.title',
    defaultName: 'Brock String',
    descriptionKey: 'texVision.drills.brockString.description',
    defaultDescription: 'Guided eye alignment exercises',
    icon: <Crosshair className="h-5 w-5" />,
    tier: 'chaos',
    duration: '3-5 min',
    category: 'coordination',
  },
  {
    id: 'rapid_switch',
    nameKey: 'texVision.drills.rapidSwitch.title',
    defaultName: 'Rapid Switch',
    descriptionKey: 'texVision.drills.rapidSwitch.description',
    defaultDescription: 'Quick task switching under pressure',
    icon: <Zap className="h-5 w-5" />,
    tier: 'chaos',
    duration: '2-3 min',
    category: 'reaction',
  },
  {
    id: 'dual_task_vision',
    nameKey: 'texVision.drills.dualTaskVision.title',
    defaultName: 'Dual-Task Vision',
    descriptionKey: 'texVision.drills.dualTaskVision.description',
    defaultDescription: 'Central focus + peripheral awareness',
    icon: <Split className="h-5 w-5" />,
    tier: 'chaos',
    duration: '2-3 min',
    category: 'coordination',
  },
  {
    id: 'chaos_grid',
    nameKey: 'texVision.drills.chaosGrid.title',
    defaultName: 'Chaos Grid',
    descriptionKey: 'texVision.drills.chaosGrid.description',
    defaultDescription: 'Track targets through visual chaos',
    icon: <Grid3X3 className="h-5 w-5" />,
    tier: 'chaos',
    duration: '3-5 min',
    category: 'tracking',
  },
];

const TIER_ORDER: TexVisionTier[] = ['beginner', 'advanced', 'chaos'];

export default function TexVisionDrillLibrary({ currentTier, onDrillStart }: TexVisionDrillLibraryProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const currentTierIndex = TIER_ORDER.indexOf(currentTier);

  const isDrillUnlocked = (drillTier: TexVisionTier) => {
    const drillTierIndex = TIER_ORDER.indexOf(drillTier);
    return drillTierIndex <= currentTierIndex;
  };

  const filteredDrills = selectedCategory
    ? DRILLS.filter(d => d.category === selectedCategory)
    : DRILLS;

  const categories = [
    { id: 'focus', labelKey: 'texVision.categories.focus', defaultLabel: 'Focus' },
    { id: 'tracking', labelKey: 'texVision.categories.tracking', defaultLabel: 'Tracking' },
    { id: 'reaction', labelKey: 'texVision.categories.reaction', defaultLabel: 'Reaction' },
    { id: 'coordination', labelKey: 'texVision.categories.coordination', defaultLabel: 'Coordination' },
  ];

  const getTierBadgeStyle = (tier: TexVisionTier) => {
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

  const renderDrillCard = (drill: Drill) => {
    const unlocked = isDrillUnlocked(drill.tier);

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
              <span className="text-[10px] text-[hsl(var(--tex-vision-text-muted))]">
                {drill.duration}
              </span>
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
        <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
          <Target className="h-5 w-5 text-[hsl(var(--tex-vision-feedback))]" />
          {t('texVision.drillLibrary.title', 'Drill Library')}
          <Badge variant="secondary" className="ml-2 text-xs">
            {DRILLS.length} drills
          </Badge>
        </CardTitle>
        <CardDescription className="text-blue-900">
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
