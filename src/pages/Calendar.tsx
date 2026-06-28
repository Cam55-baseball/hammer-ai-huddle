import { useState } from 'react';
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
  const { user, isAuthStable } = useAuth();

  // Auth-stable guard: waits for session settle + does a second-tick recheck
  // before any redirect, so transient channel reconnects don't evict typing users.
  useRequireAuth();

  // Gate realtime hook on a stable, present session so reconnect storms don't
  // re-fire it against a momentarily-null user.
  const ready = isAuthStable && !!user;
  useSchedulingRealtime(ready);

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {ready ? (
          <CalendarView selectedSport={selectedSport} />
        ) : (
          <div className="h-[60vh] animate-pulse rounded-lg bg-muted/30" aria-hidden />
        )}
      </div>
    </DashboardLayout>
  );
}
