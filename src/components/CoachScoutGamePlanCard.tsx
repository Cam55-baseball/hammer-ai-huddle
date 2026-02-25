import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users, Eye, Video, Trophy, StickyNote, FolderCheck,
  ArrowRight, Zap, UserCheck, PenLine
} from 'lucide-react';
import { useScoutGamePlan } from '@/hooks/useScoutGamePlan';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CoachScoutGamePlanCardProps {
  isCoach: boolean;
  isScout: boolean;
}

export function CoachScoutGamePlanCard({ isCoach, isScout }: CoachScoutGamePlanCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { players, totalUnreviewed, loading: reviewsLoading } = useScoutGamePlan();

  const [todayNotesCount, setTodayNotesCount] = useState(0);
  const [pendingAssignments, setPendingAssignments] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).toUpperCase();

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setDataLoading(true);
      try {
        const todayStr = new Date().toISOString().split('T')[0];

        const [notesRes, followRes, ...rest] = await Promise.all([
          supabase
            .from('player_notes')
            .select('id', { count: 'exact', head: true })
            .eq('author_id', user.id)
            .gte('created_at', `${todayStr}T00:00:00`)
            .lt('created_at', `${todayStr}T23:59:59.999`),
          supabase
            .from('scout_follows')
            .select('id', { count: 'exact', head: true })
            .eq('scout_id', user.id)
            .eq('status', 'accepted'),
          ...(isCoach
            ? [
                supabase
                  .from('folder_assignments')
                  .select('id', { count: 'exact', head: true })
                  .eq('sender_id', user.id)
                  .eq('status', 'pending'),
              ]
            : []),
        ]);

        setTodayNotesCount(notesRes.count ?? 0);
        setFollowingCount(followRes.count ?? 0);
        if (isCoach && rest[0]) {
          setPendingAssignments(rest[0].count ?? 0);
        }
      } catch (e) {
        console.error('[CoachScoutGamePlanCard] fetch error:', e);
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [user, isCoach]);

  const hubPath = isCoach ? '/coach-dashboard' : '/scout-dashboard';
  const hubLabel = isCoach ? 'Coach Hub' : 'Scout Hub';

  // Calculate completed tasks
  const tasksTotal = totalUnreviewed + (isCoach ? pendingAssignments : 0);
  const allClear = tasksTotal === 0 && todayNotesCount > 0;

  const loading = reviewsLoading || dataLoading;

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
              <div className="h-14 bg-muted rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const TaskRow = ({
    icon: Icon,
    label,
    count,
    subtitle,
    onClick,
    accent = false,
  }: {
    icon: React.ElementType;
    label: string;
    count: number;
    subtitle: string;
    onClick: () => void;
    accent?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all duration-200',
        'border-2 hover:cursor-pointer',
        accent
          ? 'bg-cyan-500/10 border-cyan-500/60 hover:bg-cyan-500/20 hover:border-cyan-500/80'
          : 'bg-muted/30 border-border hover:bg-muted/50 hover:border-primary/40'
      )}
    >
      <div className={cn(
        'p-2 rounded-lg',
        accent ? 'bg-cyan-500/20' : 'bg-muted'
      )}>
        <Icon className={cn('h-5 w-5', accent ? 'text-cyan-400' : 'text-muted-foreground')} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <h3 className="text-sm sm:text-base font-bold text-primary-foreground truncate">
          {label}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {count > 0 && (
          <Badge
            variant="secondary"
            className={cn(
              'font-bold',
              accent
                ? 'bg-cyan-500/30 text-cyan-300 border-cyan-500/50'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {count}
          </Badge>
        )}
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );

  return (
    <Card className="relative overflow-hidden border-3 border-cyan-500 bg-secondary shadow-2xl">
      {/* Diagonal accent */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/20 transform rotate-45 translate-x-20 -translate-y-20" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/10 transform -rotate-45 -translate-x-16 translate-y-16" />

      <CardContent className="relative p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-500">
              <Users className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-primary-foreground tracking-tight uppercase">
                {isCoach ? 'Coach Game Plan' : 'Scout Game Plan'}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-cyan-500 tracking-wide">{today}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                  Daily Overview
                </span>
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-3 bg-background/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-cyan-500/30">
            {allClear ? (
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-green-500">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-black text-green-400 uppercase tracking-wide">
                  All Clear
                </span>
              </div>
            ) : (
              <>
                <div className="relative h-12 w-12">
                  <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" className="stroke-muted/30" strokeWidth="4" />
                    <circle
                      cx="18" cy="18" r="14" fill="none"
                      className="stroke-cyan-500" strokeWidth="4"
                      strokeDasharray="88 88" strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-primary-foreground">
                    {tasksTotal}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Action Items
                  </span>
                  <span className="text-sm font-black text-primary-foreground">
                    {tasksTotal} pending
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Task Sections */}
        <div className="space-y-2">
          <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
            <span className="h-px flex-1 bg-cyan-500/30" />
            Today's Tasks
            <span className="h-px flex-1 bg-cyan-500/30" />
          </h3>

          {/* Video Reviews */}
          <TaskRow
            icon={Video}
            label="Video Reviews"
            count={totalUnreviewed}
            subtitle={
              totalUnreviewed > 0
                ? `${players.length} player${players.length !== 1 ? 's' : ''} with new uploads`
                : 'All videos reviewed'
            }
            onClick={() => navigate(hubPath)}
            accent={totalUnreviewed > 0}
          />

          {/* Player Notes */}
          <TaskRow
            icon={StickyNote}
            label="Player Notes"
            count={todayNotesCount}
            subtitle={
              todayNotesCount > 0
                ? `${todayNotesCount} note${todayNotesCount !== 1 ? 's' : ''} written today`
                : 'No notes yet today'
            }
            onClick={() => navigate(hubPath)}
          />

          {/* Pending Folder Assignments (Coach only) */}
          {isCoach && (
            <TaskRow
              icon={FolderCheck}
              label="Pending Assignments"
              count={pendingAssignments}
              subtitle={
                pendingAssignments > 0
                  ? `${pendingAssignments} awaiting player acceptance`
                  : 'No pending assignments'
              }
              onClick={() => navigate('/coach-dashboard')}
              accent={pendingAssignments > 0}
            />
          )}

          {/* Following Summary */}
          <TaskRow
            icon={UserCheck}
            label="Players Following"
            count={followingCount}
            subtitle={`${followingCount} active player${followingCount !== 1 ? 's' : ''}`}
            onClick={() => navigate(hubPath)}
          />
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            size="sm"
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold"
            onClick={() => navigate(hubPath)}
          >
            <Zap className="h-4 w-4 mr-1" />
            Go to {hubLabel}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 font-bold"
            onClick={() => navigate(hubPath)}
          >
            <PenLine className="h-4 w-4 mr-1" />
            Write Notes
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 font-bold"
            onClick={() => navigate(hubPath)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View Profiles
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
