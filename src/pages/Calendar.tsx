import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CalendarView } from '@/components/calendar/CalendarView';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { useSchedulingRealtime } from '@/hooks/useSchedulingRealtime';

export default function Calendar() {
  const { t } = useTranslation();
  const { sport } = useSportTheme();
  const [selectedSport] = useState<'baseball' | 'softball'>(sport || 'baseball');

  // Mount unified scheduling realtime subscriptions
  useSchedulingRealtime();

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <CalendarView selectedSport={selectedSport} />
      </div>
    </DashboardLayout>
  );
}
