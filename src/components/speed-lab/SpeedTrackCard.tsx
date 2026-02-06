import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Zap, Trophy } from 'lucide-react';
import { SpeedTrackTier, DistanceConfig } from '@/data/speedLabProgram';

interface SpeedTrackCardProps {
  currentTrack: SpeedTrackTier;
  personalBests: Record<string, number>;
  distances: DistanceConfig[];
  getTrend: (key: string) => 'improving' | 'maintaining' | 'needs_attention';
  isPlateaued: boolean;
}

const TRACK_COLORS: Record<string, string> = {
  building_speed: 'from-blue-500/10 to-blue-600/10 border-blue-500/30',
  competitive_speed: 'from-green-500/10 to-emerald-500/10 border-green-500/30',
  elite_speed: 'from-purple-500/10 to-violet-500/10 border-purple-500/30',
  world_class: 'from-amber-500/10 to-yellow-500/10 border-amber-500/30',
};

const TRACK_BADGE_COLORS: Record<string, string> = {
  building_speed: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  competitive_speed: 'bg-green-500/20 text-green-700 dark:text-green-400',
  elite_speed: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
  world_class: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
};

const TrendIcon = ({ trend }: { trend: 'improving' | 'maintaining' | 'needs_attention' }) => {
  if (trend === 'improving') return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
  if (trend === 'needs_attention') return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
};

export function SpeedTrackCard({ currentTrack, personalBests, distances, getTrend, isPlateaued }: SpeedTrackCardProps) {
  const { t } = useTranslation();

  return (
    <Card className={`bg-gradient-to-br ${TRACK_COLORS[currentTrack.key] || TRACK_COLORS.building_speed}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="text-base">{t('speedLab.track.yourTrack', 'Your Speed Track')}</span>
          </div>
          <Badge className={`${TRACK_BADGE_COLORS[currentTrack.key] || ''} font-semibold`}>
            {t(`speedLab.tracks.${currentTrack.key}`, currentTrack.label)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Goal */}
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary/60" />
          <span className="text-sm text-muted-foreground">
            {t('speedLab.track.goal', 'Goal')}: {t(`speedLab.tracks.${currentTrack.key}_goal`, currentTrack.goalText)}
          </span>
        </div>

        {/* Personal Bests */}
        <div className="grid grid-cols-3 gap-2">
          {distances.map((dist) => {
            const pb = personalBests[dist.key];
            const trend = getTrend(dist.key);
            return (
              <div key={dist.key} className="bg-background/50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{dist.label}</p>
                <p className="text-lg font-bold font-mono tabular-nums">
                  {pb ? pb.toFixed(2) : '—'}
                </p>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <TrendIcon trend={trend} />
                  <span className="text-[10px] text-muted-foreground">
                    {t(`speedLab.trend.${trend}`, trend === 'improving' ? '↑' : trend === 'needs_attention' ? '↓' : '—')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Plateau Warning */}
        {isPlateaued && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              {t('speedLab.track.plateau', "Your body is adapting. We're shifting focus to help speed stick.")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
