/**
 * OwnerAlertBell — header pill that shows unacknowledged critical alert count
 * for the Hammers Modality system. Subscribes to public.owner_alerts via
 * realtime so new criticals push instantly with a toast + soft chime.
 *
 * Click → jumps to the Owner Alert Center.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRing } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AlertRow {
  id: string;
  alert_key: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  acknowledged_at: string | null;
  created_at: string;
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.25);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.start();
    o.stop(ctx.currentTime + 0.5);
  } catch {
    /* noop — chime is best-effort */
  }
}

function fireBrowserNotification(title: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification('🚨 Hammers Modality alert', { body: title, tag: 'owner-alert' });
  } catch {
    /* noop */
  }
}

export function OwnerAlertBell() {
  const { isOwner, loading } = useOwnerAccess();
  const navigate = useNavigate();
  const [unackCount, setUnackCount] = useState(0);
  const seenIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (loading || !isOwner) return;

    let mounted = true;

    const refresh = async () => {
      const { data } = await (supabase as any)
        .from('owner_alerts')
        .select('id, severity, title, acknowledged_at')
        .is('acknowledged_at', null)
        .eq('severity', 'critical')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!mounted) return;
      const rows = (data ?? []) as AlertRow[];
      setUnackCount(rows.length);
      for (const r of rows) seenIds.current.add(r.id);
      initialLoadDone.current = true;
    };

    refresh();

    const channel = supabase
      .channel('owner-alerts-bell')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'owner_alerts' },
        (payload) => {
          const row = payload.new as AlertRow;
          if (row.severity !== 'critical') return;
          if (seenIds.current.has(row.id)) return;
          seenIds.current.add(row.id);
          setUnackCount((c) => c + 1);
          // Only chime/toast for genuinely new criticals (after initial snapshot).
          if (initialLoadDone.current) {
            toast.error(`Critical alert: ${row.title}`, {
              description: 'Tap the bell to review.',
              duration: 8000,
            });
            playChime();
            fireBrowserNotification(row.title);
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'owner_alerts' },
        () => {
          // Acknowledged elsewhere — re-pull authoritative count.
          refresh();
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [isOwner, loading]);

  if (loading || !isOwner) return null;

  const hasAlerts = unackCount > 0;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate('/owner/alerts')}
      className={cn('relative gap-2', hasAlerts && 'text-rose-500 hover:text-rose-600')}
      aria-label={hasAlerts ? `${unackCount} unacknowledged critical alerts` : 'No alerts'}
      title={hasAlerts ? `${unackCount} critical alert${unackCount === 1 ? '' : 's'} need review` : 'Owner alert center'}
    >
      {hasAlerts ? <BellRing className="h-4 w-4 animate-pulse" /> : <Bell className="h-4 w-4" />}
      {hasAlerts && (
        <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">
          {unackCount > 99 ? '99+' : unackCount}
        </Badge>
      )}
    </Button>
  );
}
