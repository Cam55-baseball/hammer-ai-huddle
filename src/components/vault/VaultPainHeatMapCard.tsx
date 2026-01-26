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

type TimePeriod = '7d' | '30d' | '6wk' | 'all';

interface AreaFrequency {
  areaId: string;
  label: string;
  count: number;
}

const BODY_AREAS = [
  { id: 'head_neck', label: 'Head/Neck' },
  { id: 'left_shoulder', label: 'L Shoulder' },
  { id: 'right_shoulder', label: 'R Shoulder' },
  { id: 'upper_back', label: 'Upper Back' },
  { id: 'lower_back', label: 'Lower Back' },
  { id: 'left_elbow', label: 'L Elbow' },
  { id: 'right_elbow', label: 'R Elbow' },
  { id: 'left_wrist_hand', label: 'L Wrist/Hand' },
  { id: 'right_wrist_hand', label: 'R Wrist/Hand' },
  { id: 'left_hip', label: 'L Hip' },
  { id: 'right_hip', label: 'R Hip' },
  { id: 'left_knee', label: 'L Knee' },
  { id: 'right_knee', label: 'R Knee' },
  { id: 'left_ankle', label: 'L Ankle' },
  { id: 'right_ankle', label: 'R Ankle' },
  { id: 'left_foot', label: 'L Foot' },
  { id: 'right_foot', label: 'R Foot' },
  // Legacy IDs for backward compatibility
  { id: 'shoulder', label: 'Shoulder' },
  { id: 'elbow', label: 'Elbow' },
  { id: 'wrist_hand', label: 'Wrist/Hand' },
  { id: 'hip', label: 'Hip' },
  { id: 'knee', label: 'Knee' },
  { id: 'ankle', label: 'Ankle' },
  { id: 'foot', label: 'Foot' },
];

const TIME_PERIODS: { value: TimePeriod; label: string; days: number | null }[] = [
  { value: '7d', label: '7d', days: 7 },
  { value: '30d', label: '30d', days: 30 },
  { value: '6wk', label: '6wk', days: 42 },
  { value: 'all', label: 'All', days: null },
];

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

  const daysBack = TIME_PERIODS.find(p => p.value === period)?.days ?? null;

  const { data: painData, isLoading } = useQuery({
    queryKey: ['pain-history', user?.id, period],
    queryFn: async () => {
      if (!user?.id) return { entries: [], totalDays: 0 };

      let query = supabase
        .from('vault_focus_quizzes')
        .select('entry_date, pain_location')
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

  const { frequencies, topAreas, painFreeDays, totalEntriesWithPain } = useMemo(() => {
    const freqMap: Record<string, number> = {};

    // Initialize all areas with 0
    BODY_AREAS.forEach(area => {
      freqMap[area.id] = 0;
    });

    // Count frequencies
    (painData?.entries || []).forEach(entry => {
      const locations = entry.pain_location as string[] | null;
      if (locations && Array.isArray(locations)) {
        locations.forEach(loc => {
          if (freqMap[loc] !== undefined) {
            freqMap[loc]++;
          } else {
            freqMap[loc] = 1;
          }
        });
      }
    });

    // Convert to array and sort
    const freqArray: AreaFrequency[] = BODY_AREAS.map(area => ({
      areaId: area.id,
      label: area.label,
      count: freqMap[area.id] || 0,
    }));

    // Top 3 problem areas (excluding zeros)
    const top = freqArray
      .filter(a => a.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Calculate pain-free days
    const daysWithPain = (painData?.entries || []).length;
    const totalDays = painData?.totalDays || 0;
    const painFreePercent = totalDays > 0 
      ? Math.round(((totalDays - daysWithPain) / totalDays) * 100)
      : 100;

    return {
      frequencies: freqMap,
      topAreas: top,
      painFreeDays: painFreePercent,
      totalEntriesWithPain: daysWithPain,
    };
  }, [painData]);

  const getAreaLabel = (areaId: string): string => {
    return BODY_AREAS.find(a => a.id === areaId)?.label || areaId;
  };

  const renderZone = (areaId: string, children: React.ReactNode) => {
    const count = frequencies[areaId] || 0;
    const color = getZoneColor(count);
    const opacity = getZoneOpacity(count);
    const label = getAreaLabel(areaId);
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
        {/* Body Heat Map SVG */}
        <TooltipProvider delayDuration={100}>
          <div className="flex justify-center">
            <svg
              viewBox="0 0 200 340"
              className="w-full max-w-[180px] h-auto"
              role="img"
              aria-label={t('vault.painHeatMap.bodyMapLabel', 'Pain frequency heat map')}
            >
              {/* Head & Neck */}
              <Tooltip>
                {renderZone('head_neck', (
                  <>
                    <ellipse cx="100" cy="28" rx="22" ry="26" />
                    <rect x="92" y="52" width="16" height="16" rx="2" />
                  </>
                ))}
                <TooltipContent side="right" className="text-xs">
                  <p className="font-medium">{getAreaLabel('head_neck')}</p>
                  <p>{frequencies['head_neck'] || 0} occurrences</p>
                </TooltipContent>
              </Tooltip>

              {/* Left Shoulder (viewer's right) */}
              <Tooltip>
                {renderZone('left_shoulder', (
                  <ellipse cx="138" cy="78" rx="18" ry="12" />
                ))}
                <TooltipContent side="right" className="text-xs">
                  <p className="font-medium">{getAreaLabel('left_shoulder')}</p>
                  <p>{frequencies['left_shoulder'] || 0} occurrences</p>
                </TooltipContent>
              </Tooltip>

              {/* Right Shoulder (viewer's left) */}
              <Tooltip>
                {renderZone('right_shoulder', (
                  <ellipse cx="62" cy="78" rx="18" ry="12" />
                ))}
                <TooltipContent side="left" className="text-xs">
                  <p className="font-medium">{getAreaLabel('right_shoulder')}</p>
                  <p>{frequencies['right_shoulder'] || 0} occurrences</p>
                </TooltipContent>
              </Tooltip>

              {/* Upper Back */}
              <Tooltip>
                {renderZone('upper_back', (
                  <rect x="72" y="68" width="56" height="40" rx="4" />
                ))}
                <TooltipContent className="text-xs">
                  <p className="font-medium">{getAreaLabel('upper_back')}</p>
                  <p>{frequencies['upper_back'] || 0} occurrences</p>
                </TooltipContent>
              </Tooltip>

              {/* Lower Back */}
              <Tooltip>
                {renderZone('lower_back', (
                  <rect x="76" y="110" width="48" height="36" rx="4" />
                ))}
                <TooltipContent className="text-xs">
                  <p className="font-medium">{getAreaLabel('lower_back')}</p>
                  <p>{frequencies['lower_back'] || 0} occurrences</p>
                </TooltipContent>
              </Tooltip>

              {/* Left Elbow (viewer's right) */}
              <Tooltip>
                {renderZone('left_elbow', (
                  <>
                    <rect x="144" y="88" width="14" height="36" rx="6" />
                    <ellipse cx="151" cy="130" rx="10" ry="8" />
                  </>
                ))}
                <TooltipContent side="right" className="text-xs">
                  <p className="font-medium">{getAreaLabel('left_elbow')}</p>
                  <p>{frequencies['left_elbow'] || 0} occurrences</p>
                </TooltipContent>
              </Tooltip>

              {/* Right Elbow (viewer's left) */}
              <Tooltip>
                {renderZone('right_elbow', (
                  <>
                    <rect x="42" y="88" width="14" height="36" rx="6" />
                    <ellipse cx="49" cy="130" rx="10" ry="8" />
                  </>
                ))}
                <TooltipContent side="left" className="text-xs">
                  <p className="font-medium">{getAreaLabel('right_elbow')}</p>
                  <p>{frequencies['right_elbow'] || 0} occurrences</p>
                </TooltipContent>
              </Tooltip>

              {/* Left Wrist/Hand (viewer's right) */}
              <Tooltip>
                {renderZone('left_wrist_hand', (
                  <>
                    <rect x="150" y="136" width="12" height="32" rx="5" />
                    <ellipse cx="156" cy="172" rx="8" ry="6" />
                    <ellipse cx="156" cy="186" rx="10" ry="12" />
                  </>
                ))}
                <TooltipContent side="right" className="text-xs">
                  <p className="font-medium">{getAreaLabel('left_wrist_hand')}</p>
                  <p>{frequencies['left_wrist_hand'] || 0} occurrences</p>
                </TooltipContent>
              </Tooltip>

              {/* Right Wrist/Hand (viewer's left) */}
              <Tooltip>
                {renderZone('right_wrist_hand', (
                  <>
                    <rect x="38" y="136" width="12" height="32" rx="5" />
                    <ellipse cx="44" cy="172" rx="8" ry="6" />
                    <ellipse cx="44" cy="186" rx="10" ry="12" />
                  </>
                ))}
                <TooltipContent side="left" className="text-xs">
                  <p className="font-medium">{getAreaLabel('right_wrist_hand')}</p>
                  <p>{frequencies['right_wrist_hand'] || 0} occurrences</p>
                </TooltipContent>
              </Tooltip>

              {/* Left Hip (viewer's right) */}
              <Tooltip>
                {renderZone('left_hip', (
                  <path d="M100 146 Q116 151 132 146 L130 168 Q115 173 100 168 Z" />
                ))}
                <TooltipContent side="right" className="text-xs">
                  <p className="font-medium">{getAreaLabel('left_hip')}</p>
                  <p>{frequencies['left_hip'] || 0} occurrences</p>
                </TooltipContent>
              </Tooltip>

              {/* Right Hip (viewer's left) */}
              <Tooltip>
                {renderZone('right_hip', (
                  <path d="M68 146 Q84 151 100 146 L100 168 Q85 173 70 168 Z" />
                ))}
                <TooltipContent side="left" className="text-xs">
                  <p className="font-medium">{getAreaLabel('right_hip')}</p>
                  <p>{frequencies['right_hip'] || 0} occurrences</p>
                </TooltipContent>
              </Tooltip>

              {/* Left Knee (viewer's right) */}
              <Tooltip>
                {renderZone('left_knee', (
                  <>
                    <rect x="110" y="170" width="18" height="48" rx="8" />
                    <ellipse cx="119" cy="226" rx="12" ry="10" />
                  </>
                ))}
                <TooltipContent side="right" className="text-xs">
                  <p className="font-medium">{getAreaLabel('left_knee')}</p>
                  <p>{frequencies['left_knee'] || 0} occurrences</p>
                </TooltipContent>
              </Tooltip>

              {/* Right Knee (viewer's left) */}
              <Tooltip>
                {renderZone('right_knee', (
                  <>
                    <rect x="72" y="170" width="18" height="48" rx="8" />
                    <ellipse cx="81" cy="226" rx="12" ry="10" />
                  </>
                ))}
                <TooltipContent side="left" className="text-xs">
                  <p className="font-medium">{getAreaLabel('right_knee')}</p>
                  <p>{frequencies['right_knee'] || 0} occurrences</p>
                </TooltipContent>
              </Tooltip>

              {/* Left Ankle (viewer's right) */}
              <Tooltip>
                {renderZone('left_ankle', (
                  <>
                    <rect x="112" y="238" width="14" height="44" rx="6" />
                    <ellipse cx="119" cy="288" rx="10" ry="8" />
                  </>
                ))}
                <TooltipContent side="right" className="text-xs">
                  <p className="font-medium">{getAreaLabel('left_ankle')}</p>
                  <p>{frequencies['left_ankle'] || 0} occurrences</p>
                </TooltipContent>
              </Tooltip>

              {/* Right Ankle (viewer's left) */}
              <Tooltip>
                {renderZone('right_ankle', (
                  <>
                    <rect x="74" y="238" width="14" height="44" rx="6" />
                    <ellipse cx="81" cy="288" rx="10" ry="8" />
                  </>
                ))}
                <TooltipContent side="left" className="text-xs">
                  <p className="font-medium">{getAreaLabel('right_ankle')}</p>
                  <p>{frequencies['right_ankle'] || 0} occurrences</p>
                </TooltipContent>
              </Tooltip>

              {/* Left Foot (viewer's right) */}
              <Tooltip>
                {renderZone('left_foot', (
                  <ellipse cx="119" cy="308" rx="14" ry="18" />
                ))}
                <TooltipContent side="right" className="text-xs">
                  <p className="font-medium">{getAreaLabel('left_foot')}</p>
                  <p>{frequencies['left_foot'] || 0} occurrences</p>
                </TooltipContent>
              </Tooltip>

              {/* Right Foot (viewer's left) */}
              <Tooltip>
                {renderZone('right_foot', (
                  <ellipse cx="81" cy="308" rx="14" ry="18" />
                ))}
                <TooltipContent side="left" className="text-xs">
                  <p className="font-medium">{getAreaLabel('right_foot')}</p>
                  <p>{frequencies['right_foot'] || 0} occurrences</p>
                </TooltipContent>
              </Tooltip>
            </svg>
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--muted))', opacity: 0.3 }} />
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
                    i === 0 && "bg-red-500/20 text-red-400 border border-red-500/50",
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
