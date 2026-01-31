import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';
import { 
  ALL_BODY_AREAS_WITH_LEGACY, 
  getBodyAreaLabel,
  FRONT_BODY_AREAS,
  BACK_BODY_AREAS,
  LEFT_SIDE_BODY_AREAS,
  RIGHT_SIDE_BODY_AREAS,
  type BodyView 
} from './quiz/body-maps/bodyAreaDefinitions';

type TimePeriod = '7d' | '30d' | '6wk' | 'all';

interface AreaFrequency {
  areaId: string;
  label: string;
  count: number;
}

const TIME_PERIODS: { value: TimePeriod; label: string; days: number | null }[] = [
  { value: '7d', label: '7d', days: 7 },
  { value: '30d', label: '30d', days: 30 },
  { value: '6wk', label: '6wk', days: 42 },
  { value: 'all', label: 'All', days: null },
];

const VIEW_LABELS: Record<BodyView, string> = {
  front: 'Front',
  back: 'Back',
  left: 'L Side',
  right: 'R Side',
};

const getZoneColor = (count: number): string => {
  if (count === 0) return 'hsl(var(--muted))';
  if (count <= 2) return '#fbbf24';
  if (count <= 5) return '#f97316';
  if (count <= 9) return '#ef4444';
  return '#b91c1c';
};

const getZoneOpacity = (count: number): number => {
  if (count === 0) return 0.3;
  if (count <= 2) return 0.5;
  if (count <= 5) return 0.65;
  if (count <= 9) return 0.8;
  return 0.95;
};

const getIntensityLabel = (count: number): string => {
  if (count === 0) return 'None';
  if (count <= 2) return 'Occasional';
  if (count <= 5) return 'Moderate';
  if (count <= 9) return 'Frequent';
  return 'Chronic';
};

export function VaultPainHeatMapCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const [activeView, setActiveView] = useState<BodyView>('front');

  const daysBack = TIME_PERIODS.find(p => p.value === period)?.days ?? null;

  const { data: painData, isLoading } = useQuery({
    queryKey: ['pain-history', user?.id, period],
    queryFn: async () => {
      if (!user?.id) return { entries: [], totalDays: 0 };

      let query = supabase
        .from('vault_focus_quizzes')
        .select('entry_date, pain_location, pain_scale, pain_scales')
        .eq('user_id', user.id)
        .eq('quiz_type', 'pre_lift')
        .not('pain_location', 'is', null);

      if (daysBack) {
        const startDate = format(subDays(new Date(), daysBack), 'yyyy-MM-dd');
        query = query.gte('entry_date', startDate);
      }

      const { data, error } = await query.order('entry_date', { ascending: false });
      if (error) throw error;

      // Count total unique days with check-ins
      const uniqueDates = new Set((data || []).map(d => d.entry_date));

      return {
        entries: data || [],
        totalDays: uniqueDates.size,
      };
    },
    enabled: !!user?.id,
  });

  const { frequencies, topAreas, totalEntriesWithPain } = useMemo(() => {
    const freqMap: Record<string, number> = {};
    const intensityMap: Record<string, { total: number; count: number }> = {};

    // Initialize all areas with 0
    ALL_BODY_AREAS_WITH_LEGACY.forEach(area => {
      freqMap[area.id] = 0;
      intensityMap[area.id] = { total: 0, count: 0 };
    });

    // Count frequencies and accumulate intensities
    (painData?.entries || []).forEach(entry => {
      const locations = entry.pain_location as string[] | null;
      const painScales = (entry as any).pain_scales as Record<string, number> | null;
      const globalPainScale = (entry as any).pain_scale as number | null;
      
      if (locations && Array.isArray(locations)) {
        locations.forEach(loc => {
          // Count frequency
          if (freqMap[loc] !== undefined) {
            freqMap[loc]++;
          } else {
            freqMap[loc] = 1;
          }
          
          // Track intensity for weighted display
          const level = painScales?.[loc] || globalPainScale || 5;
          if (!intensityMap[loc]) {
            intensityMap[loc] = { total: 0, count: 0 };
          }
          intensityMap[loc].total += level;
          intensityMap[loc].count++;
        });
      }
    });

    // Convert to array and sort for top areas
    const freqArray: AreaFrequency[] = ALL_BODY_AREAS_WITH_LEGACY.map(area => ({
      areaId: area.id,
      label: area.label,
      count: freqMap[area.id] || 0,
    }));

    // Top 3 problem areas (excluding zeros)
    const top = freqArray
      .filter(a => a.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Calculate entries with pain
    const daysWithPain = (painData?.entries || []).length;

    return {
      frequencies: freqMap,
      topAreas: top,
      totalEntriesWithPain: daysWithPain,
    };
  }, [painData]);

  const renderZone = (areaId: string, children: React.ReactNode) => {
    const count = frequencies[areaId] || 0;
    const color = getZoneColor(count);
    const opacity = getZoneOpacity(count);
    const label = getBodyAreaLabel(areaId);
    const intensity = getIntensityLabel(count);

    return (
      <TooltipTrigger asChild>
        <g
          className="cursor-pointer transition-all duration-150"
          style={{
            fill: color,
            fillOpacity: opacity,
            stroke: count > 0 ? color : 'hsl(var(--muted-foreground))',
            strokeWidth: count > 0 ? 2 : 1,
            strokeOpacity: count > 0 ? 0.8 : 0.3,
          }}
          aria-label={`${label}: ${count} occurrences (${intensity})`}
        >
          {children}
        </g>
      </TooltipTrigger>
    );
  };

  const renderTooltipContent = (areaId: string) => {
    const count = frequencies[areaId] || 0;
    return (
      <TooltipContent className="text-xs">
        <p className="font-medium">{getBodyAreaLabel(areaId)}</p>
        <p>{count} occurrences</p>
      </TooltipContent>
    );
  };

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            {t('vault.painHeatMap.title', 'Pain History')}
          </CardTitle>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
            <TabsList className="h-7">
              {TIME_PERIODS.map(p => (
                <TabsTrigger key={p.value} value={p.value} className="text-xs px-2 h-6">
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* View Selector Tabs */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg bg-muted/50 p-1">
            {(['front', 'back', 'left', 'right'] as BodyView[]).map(view => (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  activeView === view
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {VIEW_LABELS[view]}
              </button>
            ))}
          </div>
        </div>

        {/* Body Heat Map SVG */}
        <TooltipProvider delayDuration={100}>
          <div className="flex justify-center">
            {activeView === 'front' && (
              <svg viewBox="0 0 200 380" className="w-full max-w-[180px] h-auto" role="img" aria-label="Pain frequency heat map - Front view">
                {/* Head (Front) */}
                <Tooltip>
                  {renderZone('head_front', <ellipse cx="100" cy="25" rx="20" ry="23" />)}
                  {renderTooltipContent('head_front')}
                </Tooltip>
                {/* Neck (Front) */}
                <Tooltip>
                  {renderZone('neck_front', <rect x="92" y="48" width="16" height="14" rx="2" />)}
                  {renderTooltipContent('neck_front')}
                </Tooltip>
                {/* Left Shoulder (Front) */}
                <Tooltip>
                  {renderZone('left_shoulder_front', <ellipse cx="140" cy="72" rx="16" ry="10" />)}
                  {renderTooltipContent('left_shoulder_front')}
                </Tooltip>
                {/* Right Shoulder (Front) */}
                <Tooltip>
                  {renderZone('right_shoulder_front', <ellipse cx="60" cy="72" rx="16" ry="10" />)}
                  {renderTooltipContent('right_shoulder_front')}
                </Tooltip>
                {/* Left Chest */}
                <Tooltip>
                  {renderZone('left_chest', <path d="M102 64 L124 62 L128 88 L102 92 Z" />)}
                  {renderTooltipContent('left_chest')}
                </Tooltip>
                {/* Right Chest */}
                <Tooltip>
                  {renderZone('right_chest', <path d="M98 64 L76 62 L72 88 L98 92 Z" />)}
                  {renderTooltipContent('right_chest')}
                </Tooltip>
                {/* Sternum */}
                <Tooltip>
                  {renderZone('sternum', <rect x="96" y="64" width="8" height="28" rx="2" />)}
                  {renderTooltipContent('sternum')}
                </Tooltip>
                {/* Upper Abs */}
                <Tooltip>
                  {renderZone('upper_abs', <rect x="80" y="92" width="40" height="24" rx="3" />)}
                  {renderTooltipContent('upper_abs')}
                </Tooltip>
                {/* Lower Abs */}
                <Tooltip>
                  {renderZone('lower_abs', <rect x="82" y="118" width="36" height="24" rx="3" />)}
                  {renderTooltipContent('lower_abs')}
                </Tooltip>
                {/* Left Bicep */}
                <Tooltip>
                  {renderZone('left_bicep', <rect x="148" y="82" width="12" height="32" rx="5" />)}
                  {renderTooltipContent('left_bicep')}
                </Tooltip>
                {/* Right Bicep */}
                <Tooltip>
                  {renderZone('right_bicep', <rect x="40" y="82" width="12" height="32" rx="5" />)}
                  {renderTooltipContent('right_bicep')}
                </Tooltip>
                {/* Left Elbow Inner */}
                <Tooltip>
                  {renderZone('left_elbow_inner', <ellipse cx="154" cy="120" rx="8" ry="6" />)}
                  {renderTooltipContent('left_elbow_inner')}
                </Tooltip>
                {/* Right Elbow Inner */}
                <Tooltip>
                  {renderZone('right_elbow_inner', <ellipse cx="46" cy="120" rx="8" ry="6" />)}
                  {renderTooltipContent('right_elbow_inner')}
                </Tooltip>
                {/* Left Forearm Front */}
                <Tooltip>
                  {renderZone('left_forearm_front', <rect x="150" y="126" width="10" height="30" rx="4" />)}
                  {renderTooltipContent('left_forearm_front')}
                </Tooltip>
                {/* Right Forearm Front */}
                <Tooltip>
                  {renderZone('right_forearm_front', <rect x="40" y="126" width="10" height="30" rx="4" />)}
                  {renderTooltipContent('right_forearm_front')}
                </Tooltip>
                {/* Left Wrist Front */}
                <Tooltip>
                  {renderZone('left_wrist_front', <rect x="151" y="156" width="8" height="10" rx="3" />)}
                  {renderTooltipContent('left_wrist_front')}
                </Tooltip>
                {/* Right Wrist Front */}
                <Tooltip>
                  {renderZone('right_wrist_front', <rect x="41" y="156" width="8" height="10" rx="3" />)}
                  {renderTooltipContent('right_wrist_front')}
                </Tooltip>
                {/* Left Palm */}
                <Tooltip>
                  {renderZone('left_palm', <ellipse cx="155" cy="176" rx="9" ry="12" />)}
                  {renderTooltipContent('left_palm')}
                </Tooltip>
                {/* Right Palm */}
                <Tooltip>
                  {renderZone('right_palm', <ellipse cx="45" cy="176" rx="9" ry="12" />)}
                  {renderTooltipContent('right_palm')}
                </Tooltip>
                {/* Left Hip Flexor */}
                <Tooltip>
                  {renderZone('left_hip_flexor', <path d="M102 142 L118 142 L120 158 L104 158 Z" />)}
                  {renderTooltipContent('left_hip_flexor')}
                </Tooltip>
                {/* Right Hip Flexor */}
                <Tooltip>
                  {renderZone('right_hip_flexor', <path d="M98 142 L82 142 L80 158 L96 158 Z" />)}
                  {renderTooltipContent('right_hip_flexor')}
                </Tooltip>
                {/* Left Groin */}
                <Tooltip>
                  {renderZone('left_groin', <path d="M100 158 L112 158 L110 172 L100 172 Z" />)}
                  {renderTooltipContent('left_groin')}
                </Tooltip>
                {/* Right Groin */}
                <Tooltip>
                  {renderZone('right_groin', <path d="M100 158 L88 158 L90 172 L100 172 Z" />)}
                  {renderTooltipContent('right_groin')}
                </Tooltip>
                {/* Left Quad Inner */}
                <Tooltip>
                  {renderZone('left_quad_inner', <rect x="104" y="172" width="12" height="48" rx="4" />)}
                  {renderTooltipContent('left_quad_inner')}
                </Tooltip>
                {/* Left Quad Outer */}
                <Tooltip>
                  {renderZone('left_quad_outer', <rect x="118" y="172" width="12" height="48" rx="4" />)}
                  {renderTooltipContent('left_quad_outer')}
                </Tooltip>
                {/* Right Quad Inner */}
                <Tooltip>
                  {renderZone('right_quad_inner', <rect x="84" y="172" width="12" height="48" rx="4" />)}
                  {renderTooltipContent('right_quad_inner')}
                </Tooltip>
                {/* Right Quad Outer */}
                <Tooltip>
                  {renderZone('right_quad_outer', <rect x="70" y="172" width="12" height="48" rx="4" />)}
                  {renderTooltipContent('right_quad_outer')}
                </Tooltip>
                {/* Left Knee Front */}
                <Tooltip>
                  {renderZone('left_knee_front', <ellipse cx="117" cy="230" rx="12" ry="10" />)}
                  {renderTooltipContent('left_knee_front')}
                </Tooltip>
                {/* Right Knee Front */}
                <Tooltip>
                  {renderZone('right_knee_front', <ellipse cx="83" cy="230" rx="12" ry="10" />)}
                  {renderTooltipContent('right_knee_front')}
                </Tooltip>
                {/* Left Shin */}
                <Tooltip>
                  {renderZone('left_shin', <rect x="111" y="242" width="12" height="42" rx="5" />)}
                  {renderTooltipContent('left_shin')}
                </Tooltip>
                {/* Right Shin */}
                <Tooltip>
                  {renderZone('right_shin', <rect x="77" y="242" width="12" height="42" rx="5" />)}
                  {renderTooltipContent('right_shin')}
                </Tooltip>
                {/* Left Ankle Inside */}
                <Tooltip>
                  {renderZone('left_ankle_inside', <ellipse cx="110" cy="292" rx="6" ry="7" />)}
                  {renderTooltipContent('left_ankle_inside')}
                </Tooltip>
                {/* Left Ankle Outside */}
                <Tooltip>
                  {renderZone('left_ankle_outside', <ellipse cx="124" cy="292" rx="6" ry="7" />)}
                  {renderTooltipContent('left_ankle_outside')}
                </Tooltip>
                {/* Right Ankle Inside */}
                <Tooltip>
                  {renderZone('right_ankle_inside', <ellipse cx="90" cy="292" rx="6" ry="7" />)}
                  {renderTooltipContent('right_ankle_inside')}
                </Tooltip>
                {/* Right Ankle Outside */}
                <Tooltip>
                  {renderZone('right_ankle_outside', <ellipse cx="76" cy="292" rx="6" ry="7" />)}
                  {renderTooltipContent('right_ankle_outside')}
                </Tooltip>
                {/* Left Foot Top */}
                <Tooltip>
                  {renderZone('left_foot_top', <ellipse cx="117" cy="318" rx="13" ry="18" />)}
                  {renderTooltipContent('left_foot_top')}
                </Tooltip>
                {/* Right Foot Top */}
                <Tooltip>
                  {renderZone('right_foot_top', <ellipse cx="83" cy="318" rx="13" ry="18" />)}
                  {renderTooltipContent('right_foot_top')}
                </Tooltip>
              </svg>
            )}

            {activeView === 'back' && (
              <svg viewBox="0 0 200 380" className="w-full max-w-[180px] h-auto" role="img" aria-label="Pain frequency heat map - Back view">
                {/* Head (Back) */}
                <Tooltip>
                  {renderZone('head_back', <ellipse cx="100" cy="25" rx="20" ry="23" />)}
                  {renderTooltipContent('head_back')}
                </Tooltip>
                {/* Neck (Back) */}
                <Tooltip>
                  {renderZone('neck_back', <rect x="92" y="48" width="16" height="14" rx="2" />)}
                  {renderTooltipContent('neck_back')}
                </Tooltip>
                {/* Left Shoulder (Back) */}
                <Tooltip>
                  {renderZone('left_shoulder_back', <ellipse cx="60" cy="72" rx="16" ry="10" />)}
                  {renderTooltipContent('left_shoulder_back')}
                </Tooltip>
                {/* Right Shoulder (Back) */}
                <Tooltip>
                  {renderZone('right_shoulder_back', <ellipse cx="140" cy="72" rx="16" ry="10" />)}
                  {renderTooltipContent('right_shoulder_back')}
                </Tooltip>
                {/* Left Upper Back */}
                <Tooltip>
                  {renderZone('left_upper_back', <rect x="72" y="64" width="26" height="28" rx="3" />)}
                  {renderTooltipContent('left_upper_back')}
                </Tooltip>
                {/* Right Upper Back */}
                <Tooltip>
                  {renderZone('right_upper_back', <rect x="102" y="64" width="26" height="28" rx="3" />)}
                  {renderTooltipContent('right_upper_back')}
                </Tooltip>
                {/* Left Lat */}
                <Tooltip>
                  {renderZone('left_lat', <path d="M72 92 L72 120 L82 115 L82 92 Z" />)}
                  {renderTooltipContent('left_lat')}
                </Tooltip>
                {/* Right Lat */}
                <Tooltip>
                  {renderZone('right_lat', <path d="M128 92 L128 120 L118 115 L118 92 Z" />)}
                  {renderTooltipContent('right_lat')}
                </Tooltip>
                {/* Left Tricep */}
                <Tooltip>
                  {renderZone('left_tricep', <rect x="40" y="82" width="12" height="32" rx="5" />)}
                  {renderTooltipContent('left_tricep')}
                </Tooltip>
                {/* Right Tricep */}
                <Tooltip>
                  {renderZone('right_tricep', <rect x="148" y="82" width="12" height="32" rx="5" />)}
                  {renderTooltipContent('right_tricep')}
                </Tooltip>
                {/* Left Elbow Outer */}
                <Tooltip>
                  {renderZone('left_elbow_outer', <ellipse cx="46" cy="120" rx="8" ry="6" />)}
                  {renderTooltipContent('left_elbow_outer')}
                </Tooltip>
                {/* Right Elbow Outer */}
                <Tooltip>
                  {renderZone('right_elbow_outer', <ellipse cx="154" cy="120" rx="8" ry="6" />)}
                  {renderTooltipContent('right_elbow_outer')}
                </Tooltip>
                {/* Left Forearm Back */}
                <Tooltip>
                  {renderZone('left_forearm_back', <rect x="40" y="126" width="10" height="30" rx="4" />)}
                  {renderTooltipContent('left_forearm_back')}
                </Tooltip>
                {/* Right Forearm Back */}
                <Tooltip>
                  {renderZone('right_forearm_back', <rect x="150" y="126" width="10" height="30" rx="4" />)}
                  {renderTooltipContent('right_forearm_back')}
                </Tooltip>
                {/* Left Wrist Back */}
                <Tooltip>
                  {renderZone('left_wrist_back', <rect x="41" y="156" width="8" height="10" rx="3" />)}
                  {renderTooltipContent('left_wrist_back')}
                </Tooltip>
                {/* Right Wrist Back */}
                <Tooltip>
                  {renderZone('right_wrist_back', <rect x="151" y="156" width="8" height="10" rx="3" />)}
                  {renderTooltipContent('right_wrist_back')}
                </Tooltip>
                {/* Left Hand Back */}
                <Tooltip>
                  {renderZone('left_hand_back', <ellipse cx="45" cy="176" rx="9" ry="12" />)}
                  {renderTooltipContent('left_hand_back')}
                </Tooltip>
                {/* Right Hand Back */}
                <Tooltip>
                  {renderZone('right_hand_back', <ellipse cx="155" cy="176" rx="9" ry="12" />)}
                  {renderTooltipContent('right_hand_back')}
                </Tooltip>
                {/* Lower Back Center */}
                <Tooltip>
                  {renderZone('lower_back_center', <rect x="92" y="92" width="16" height="54" rx="3" />)}
                  {renderTooltipContent('lower_back_center')}
                </Tooltip>
                {/* Lower Back Left */}
                <Tooltip>
                  {renderZone('lower_back_left', <rect x="82" y="118" width="16" height="28" rx="3" />)}
                  {renderTooltipContent('lower_back_left')}
                </Tooltip>
                {/* Lower Back Right */}
                <Tooltip>
                  {renderZone('lower_back_right', <rect x="102" y="118" width="16" height="28" rx="3" />)}
                  {renderTooltipContent('lower_back_right')}
                </Tooltip>
                {/* Left Glute */}
                <Tooltip>
                  {renderZone('left_glute', <ellipse cx="82" cy="160" rx="16" ry="14" />)}
                  {renderTooltipContent('left_glute')}
                </Tooltip>
                {/* Right Glute */}
                <Tooltip>
                  {renderZone('right_glute', <ellipse cx="118" cy="160" rx="16" ry="14" />)}
                  {renderTooltipContent('right_glute')}
                </Tooltip>
                {/* Left Hamstring Inner */}
                <Tooltip>
                  {renderZone('left_hamstring_inner', <rect x="84" y="176" width="12" height="45" rx="4" />)}
                  {renderTooltipContent('left_hamstring_inner')}
                </Tooltip>
                {/* Left Hamstring Outer */}
                <Tooltip>
                  {renderZone('left_hamstring_outer', <rect x="70" y="176" width="12" height="45" rx="4" />)}
                  {renderTooltipContent('left_hamstring_outer')}
                </Tooltip>
                {/* Right Hamstring Inner */}
                <Tooltip>
                  {renderZone('right_hamstring_inner', <rect x="104" y="176" width="12" height="45" rx="4" />)}
                  {renderTooltipContent('right_hamstring_inner')}
                </Tooltip>
                {/* Right Hamstring Outer */}
                <Tooltip>
                  {renderZone('right_hamstring_outer', <rect x="118" y="176" width="12" height="45" rx="4" />)}
                  {renderTooltipContent('right_hamstring_outer')}
                </Tooltip>
                {/* Left Knee Back */}
                <Tooltip>
                  {renderZone('left_knee_back', <ellipse cx="83" cy="230" rx="12" ry="10" />)}
                  {renderTooltipContent('left_knee_back')}
                </Tooltip>
                {/* Right Knee Back */}
                <Tooltip>
                  {renderZone('right_knee_back', <ellipse cx="117" cy="230" rx="12" ry="10" />)}
                  {renderTooltipContent('right_knee_back')}
                </Tooltip>
                {/* Left Calf Inner */}
                <Tooltip>
                  {renderZone('left_calf_inner', <rect x="83" y="242" width="10" height="38" rx="4" />)}
                  {renderTooltipContent('left_calf_inner')}
                </Tooltip>
                {/* Left Calf Outer */}
                <Tooltip>
                  {renderZone('left_calf_outer', <rect x="71" y="242" width="10" height="38" rx="4" />)}
                  {renderTooltipContent('left_calf_outer')}
                </Tooltip>
                {/* Right Calf Inner */}
                <Tooltip>
                  {renderZone('right_calf_inner', <rect x="107" y="242" width="10" height="38" rx="4" />)}
                  {renderTooltipContent('right_calf_inner')}
                </Tooltip>
                {/* Right Calf Outer */}
                <Tooltip>
                  {renderZone('right_calf_outer', <rect x="119" y="242" width="10" height="38" rx="4" />)}
                  {renderTooltipContent('right_calf_outer')}
                </Tooltip>
                {/* Left Achilles */}
                <Tooltip>
                  {renderZone('left_achilles', <rect x="80" y="282" width="6" height="16" rx="2" />)}
                  {renderTooltipContent('left_achilles')}
                </Tooltip>
                {/* Right Achilles */}
                <Tooltip>
                  {renderZone('right_achilles', <rect x="114" y="282" width="6" height="16" rx="2" />)}
                  {renderTooltipContent('right_achilles')}
                </Tooltip>
                {/* Left Heel */}
                <Tooltip>
                  {renderZone('left_heel', <ellipse cx="83" cy="310" rx="11" ry="14" />)}
                  {renderTooltipContent('left_heel')}
                </Tooltip>
                {/* Right Heel */}
                <Tooltip>
                  {renderZone('right_heel', <ellipse cx="117" cy="310" rx="11" ry="14" />)}
                  {renderTooltipContent('right_heel')}
                </Tooltip>
              </svg>
            )}

            {activeView === 'left' && (
              <svg viewBox="0 0 140 380" className="w-full max-w-[120px] h-auto" role="img" aria-label="Pain frequency heat map - Left side view">
                {/* Body outline */}
                <ellipse cx="70" cy="28" rx="22" ry="26" className="fill-none stroke-muted-foreground/20 stroke-[1]" />
                <path d="M58 68 L58 150 Q58 160 62 168 L78 168 Q82 160 82 150 L82 68" className="fill-none stroke-muted-foreground/20 stroke-[1]" />
                {/* Left Temple */}
                <Tooltip>
                  {renderZone('left_temple', <ellipse cx="52" cy="22" rx="10" ry="12" />)}
                  {renderTooltipContent('left_temple')}
                </Tooltip>
                {/* Left Jaw */}
                <Tooltip>
                  {renderZone('left_jaw', <path d="M48 38 L56 48 L68 52 L68 42 L58 36 Z" />)}
                  {renderTooltipContent('left_jaw')}
                </Tooltip>
                {/* Left Neck Side */}
                <Tooltip>
                  {renderZone('left_neck_side', <rect x="58" y="52" width="14" height="16" rx="3" />)}
                  {renderTooltipContent('left_neck_side')}
                </Tooltip>
                {/* Left Deltoid */}
                <Tooltip>
                  {renderZone('left_deltoid', <ellipse cx="46" cy="78" rx="14" ry="12" />)}
                  {renderTooltipContent('left_deltoid')}
                </Tooltip>
                {/* Left Ribs */}
                <Tooltip>
                  {renderZone('left_ribs', <rect x="48" y="85" width="14" height="32" rx="4" />)}
                  {renderTooltipContent('left_ribs')}
                </Tooltip>
                {/* Left Oblique */}
                <Tooltip>
                  {renderZone('left_oblique', <rect x="50" y="120" width="12" height="28" rx="4" />)}
                  {renderTooltipContent('left_oblique')}
                </Tooltip>
                {/* Left IT Band */}
                <Tooltip>
                  {renderZone('left_it_band', <rect x="50" y="178" width="10" height="52" rx="4" />)}
                  {renderTooltipContent('left_it_band')}
                </Tooltip>
                {/* Left Knee Side */}
                <Tooltip>
                  {renderZone('left_knee_side', <ellipse cx="58" cy="238" rx="12" ry="10" />)}
                  {renderTooltipContent('left_knee_side')}
                </Tooltip>
                {/* Left Foot Arch */}
                <Tooltip>
                  {renderZone('left_foot_arch', <path d="M48 300 Q45 315 50 328 L62 328 Q66 315 62 300 Z" />)}
                  {renderTooltipContent('left_foot_arch')}
                </Tooltip>
              </svg>
            )}

            {activeView === 'right' && (
              <svg viewBox="0 0 140 380" className="w-full max-w-[120px] h-auto" role="img" aria-label="Pain frequency heat map - Right side view">
                {/* Body outline */}
                <ellipse cx="70" cy="28" rx="22" ry="26" className="fill-none stroke-muted-foreground/20 stroke-[1]" />
                <path d="M58 68 L58 150 Q58 160 62 168 L78 168 Q82 160 82 150 L82 68" className="fill-none stroke-muted-foreground/20 stroke-[1]" />
                {/* Right Temple */}
                <Tooltip>
                  {renderZone('right_temple', <ellipse cx="88" cy="22" rx="10" ry="12" />)}
                  {renderTooltipContent('right_temple')}
                </Tooltip>
                {/* Right Jaw */}
                <Tooltip>
                  {renderZone('right_jaw', <path d="M92 38 L84 48 L72 52 L72 42 L82 36 Z" />)}
                  {renderTooltipContent('right_jaw')}
                </Tooltip>
                {/* Right Neck Side */}
                <Tooltip>
                  {renderZone('right_neck_side', <rect x="68" y="52" width="14" height="16" rx="3" />)}
                  {renderTooltipContent('right_neck_side')}
                </Tooltip>
                {/* Right Deltoid */}
                <Tooltip>
                  {renderZone('right_deltoid', <ellipse cx="94" cy="78" rx="14" ry="12" />)}
                  {renderTooltipContent('right_deltoid')}
                </Tooltip>
                {/* Right Ribs */}
                <Tooltip>
                  {renderZone('right_ribs', <rect x="78" y="85" width="14" height="32" rx="4" />)}
                  {renderTooltipContent('right_ribs')}
                </Tooltip>
                {/* Right Oblique */}
                <Tooltip>
                  {renderZone('right_oblique', <rect x="78" y="120" width="12" height="28" rx="4" />)}
                  {renderTooltipContent('right_oblique')}
                </Tooltip>
                {/* Right IT Band */}
                <Tooltip>
                  {renderZone('right_it_band', <rect x="80" y="178" width="10" height="52" rx="4" />)}
                  {renderTooltipContent('right_it_band')}
                </Tooltip>
                {/* Right Knee Side */}
                <Tooltip>
                  {renderZone('right_knee_side', <ellipse cx="82" cy="238" rx="12" ry="10" />)}
                  {renderTooltipContent('right_knee_side')}
                </Tooltip>
                {/* Right Foot Arch */}
                <Tooltip>
                  {renderZone('right_foot_arch', <path d="M92 300 Q95 315 90 328 L78 328 Q74 315 78 300 Z" />)}
                  {renderTooltipContent('right_foot_arch')}
                </Tooltip>
              </svg>
            )}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-muted opacity-30" />
            <span className="text-muted-foreground">None</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#fbbf24' }} />
            <span className="text-muted-foreground">1-2</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f97316' }} />
            <span className="text-muted-foreground">3-5</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
            <span className="text-muted-foreground">6-9</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#b91c1c' }} />
            <span className="text-muted-foreground">10+</span>
          </div>
        </div>

        {/* Summary Stats */}
        {topAreas.length > 0 ? (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground">
              {t('vault.painHeatMap.topAreas', 'Top Problem Areas')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {topAreas.map((area, i) => (
                <span
                  key={area.areaId}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    i === 0 && "bg-destructive/20 text-destructive border border-destructive/50",
                    i === 1 && "bg-orange-500/20 text-orange-400 border border-orange-500/50",
                    i === 2 && "bg-yellow-500/20 text-yellow-600 border border-yellow-500/50"
                  )}
                >
                  {area.label} ({area.count})
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
            {t('vault.painHeatMap.noPain', 'No pain logged in this period 🎉')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
