import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Target, Users, Eye, Video, Zap, Trophy } from 'lucide-react';
import { useScoutGamePlan, PlayerReviewTask } from '@/hooks/useScoutGamePlan';
import { cn } from '@/lib/utils';

export function ScoutGamePlanCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { players, totalUnreviewed, loading, refetch } = useScoutGamePlan();

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  }).toUpperCase();

  const allComplete = totalUnreviewed === 0;

  const handlePlayerClick = (playerId: string) => {
    // Navigate to scout dashboard with player library view
    navigate(`/scout-dashboard?viewPlayer=${playerId}`);
  };

  const renderPlayerTask = (player: PlayerReviewTask) => {
    const initials = player.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <button
        key={player.id}
        onClick={() => handlePlayerClick(player.id)}
        className={cn(
          "w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all duration-200",
          "border-2 bg-cyan-500/10 border-cyan-500/60 scout-pulse",
          "hover:bg-cyan-500/20 hover:border-cyan-500/80 cursor-pointer"
        )}
      >
        {/* Avatar */}
        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-cyan-500/50">
          <AvatarImage src={player.avatarUrl || undefined} alt={player.name} />
          <AvatarFallback className="bg-cyan-500/20 text-cyan-400 font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        {/* Content */}
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-black text-primary-foreground truncate">
              {player.name}
            </h3>
            <Badge 
              variant="secondary" 
              className="bg-cyan-500/30 text-cyan-300 border-cyan-500/50 font-bold"
            >
              <Video className="h-3 w-3 mr-1" />
              {player.unreviewedCount} {player.unreviewedCount === 1 ? t('scoutGamePlan.video') : t('scoutGamePlan.videos')}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {t('scoutGamePlan.reviewVideos')}
          </p>
        </div>
        
        {/* Action indicator */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <div className="border-3 border-dashed border-cyan-500/70 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 animate-pulse text-cyan-500" />
          </div>
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full border bg-cyan-500/20 border-cyan-500/40">
            <Eye className="h-3 w-3 text-cyan-400" />
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
              {t('scoutGamePlan.review')}
            </span>
          </div>
        </div>
      </button>
    );
  };

  if (loading) {
    return (
      <Card className="relative overflow-hidden border-3 border-primary/50 bg-secondary">
        <CardContent className="p-4 sm:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-56 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="space-y-3">
              <div className="h-14 bg-muted rounded-lg" />
              <div className="h-14 bg-muted rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-3 border-cyan-500 bg-secondary shadow-2xl">
      {/* Athletic diagonal stripe accent */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/20 transform rotate-45 translate-x-20 -translate-y-20" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/10 transform -rotate-45 -translate-x-16 translate-y-16" />
      
      <CardContent className="relative p-4 sm:p-6 space-y-4">
        {/* Bold Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-500">
              <Users className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-primary-foreground tracking-tight uppercase">
                {t('scoutGamePlan.title')}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-cyan-500 tracking-wide">{today}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                  {t('scoutGamePlan.subtitle')}
                </span>
              </div>
            </div>
          </div>
          
          {/* Progress Ring / Status */}
          <div className="flex items-center gap-3 bg-background/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-cyan-500/30">
            {allComplete ? (
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-green-500">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-black text-green-400 uppercase tracking-wide">
                  {t('scoutGamePlan.allReviewed')}
                </span>
              </div>
            ) : (
              <>
                <div className="relative h-12 w-12">
                  <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      className="stroke-muted/30"
                      strokeWidth="4"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      className="stroke-cyan-500"
                      strokeWidth="4"
                      strokeDasharray="88 88"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-primary-foreground">
                    {totalUnreviewed}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {t('scoutGamePlan.pendingLabel')}
                  </span>
                  <span className="text-sm font-black text-primary-foreground">
                    {t('scoutGamePlan.videosToReview', { count: totalUnreviewed })}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Player Tasks */}
        <div className="space-y-4">
          {players.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                <span className="h-px flex-1 bg-cyan-500/30" />
                {t('scoutGamePlan.playerUploads')}
                <span className="h-px flex-1 bg-cyan-500/30" />
              </h3>
              <div className="space-y-2">
                {players.map(renderPlayerTask)}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="p-4 rounded-full bg-muted/20 inline-block mb-3">
                <Eye className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">
                {t('scoutGamePlan.noVideosToReview')}
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {t('scoutGamePlan.checkBackLater')}
              </p>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Pulsing animation for tasks */}
      <style>{`
        @keyframes scout-pulse {
          0%, 100% { 
            box-shadow: 0 0 0 0 hsl(187 70% 50% / 0.4);
          }
          50% { 
            box-shadow: 0 0 0 4px hsl(187 70% 50% / 0.1);
          }
        }
        .scout-pulse {
          animation: scout-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </Card>
  );
}
