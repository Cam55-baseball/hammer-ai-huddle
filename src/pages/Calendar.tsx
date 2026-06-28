import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CalendarView } from '@/components/calendar/CalendarView';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { useSchedulingRealtime } from '@/hooks/useSchedulingRealtime';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function Calendar() {
  const { t } = useTranslation();
  const { sport } = useSportTheme();
  const [selectedSport] = useState<'baseball' | 'softball'>(sport || 'baseball');
  const { user, loading: authLoading, isAuthStable } = useAuth();
  const [hasMountedWithUser, setHasMountedWithUser] = useState(false);

  useEffect(() => {
    if (user?.id) setHasMountedWithUser(true);
  }, [user?.id]);

  // Auth-stable guard: waits for session settle + does a second-tick recheck
  // before any redirect, so transient channel reconnects don't evict typing users.
  useRequireAuth();

  // Gate realtime hook on a stable, present session so reconnect storms don't
  // re-fire it against a momentarily-null user.
  const realtimeReady = isAuthStable && !!user;
  const viewReady = !!user || hasMountedWithUser;
  useSchedulingRealtime(realtimeReady);

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {viewReady ? (
          <CalendarView selectedSport={selectedSport} />
        ) : (
          <div className="h-[60vh] animate-pulse rounded-lg bg-muted/30" aria-hidden />
        )}
      </div>
    </DashboardLayout>
  );
}
