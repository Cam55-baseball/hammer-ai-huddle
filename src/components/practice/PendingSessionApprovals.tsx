import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Clock, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface PendingSession {
  id: string;
  title: string;
  session_module: string;
  session_type: string;
  scheduled_date: string;
  start_time?: string;
  end_time?: string;
  description?: string;
  sport: string;
  coach_id?: string;
  coach_name?: string;
}

interface PendingSessionApprovalsProps {
  onCountChange?: (count: number) => void;
}

export function PendingSessionApprovals({ onCountChange }: PendingSessionApprovalsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<PendingSession[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPending = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('scheduled_practice_sessions' as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending_approval');

    if (error) {
      console.error('Error fetching pending sessions:', error);
      return;
    }

    const rows = (data || []) as any[];

    // Fetch coach names
    const coachIds = [...new Set(rows.filter(r => r.coach_id).map(r => r.coach_id))];
    let coachMap: Record<string, string> = {};
    if (coachIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('id, full_name')
        .in('id', coachIds);
      if (profiles) {
        coachMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name ?? 'Coach']));
      }
    }

    const mapped: PendingSession[] = rows.map(r => ({
      id: r.id,
      title: r.title,
      session_module: r.session_module,
      session_type: r.session_type,
      scheduled_date: r.scheduled_date,
      start_time: r.start_time,
      end_time: r.end_time,
      description: r.description,
      sport: r.sport,
      coach_id: r.coach_id,
      coach_name: r.coach_id ? coachMap[r.coach_id] : undefined,
    }));

    setSessions(mapped);
    onCountChange?.(mapped.length);
  }, [user, onCountChange]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleAction = async (id: string, action: 'accepted' | 'rejected') => {
    setLoading(true);
    const newStatus = action === 'accepted' ? 'scheduled' : 'rejected';
    const { error } = await supabase
      .from('scheduled_practice_sessions' as any)
      .update({ status: newStatus } as any)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: action === 'accepted' ? 'Session accepted' : 'Session declined' });
      fetchPending();
    }
    setLoading(false);
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  if (sessions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-foreground">Pending Session Approvals</h3>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{sessions.length}</Badge>
      </div>

      {sessions.map(s => (
        <Card key={s.id} className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.title}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                  <CalendarDays className="h-3 w-3" />
                  {format(new Date(s.scheduled_date + 'T12:00:00'), 'MMM d, yyyy')}
                  {s.start_time && <span>• {formatTime(s.start_time)}{s.end_time ? ` – ${formatTime(s.end_time)}` : ''}</span>}
                </div>
                {s.coach_name && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    From: <span className="font-medium text-foreground">{s.coach_name}</span>
                  </p>
                )}
                {s.description && (
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                )}
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{s.sport}</Badge>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                className="flex-1 h-8 text-xs gap-1"
                disabled={loading}
                onClick={() => handleAction(s.id, 'accepted')}
              >
                <Check className="h-3 w-3" /> Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs gap-1"
                disabled={loading}
                onClick={() => handleAction(s.id, 'rejected')}
              >
                <X className="h-3 w-3" /> Decline
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
