import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ActivityFolderItem } from '@/types/activityFolder';

const CNS_BY_TYPE: Record<string, number> = {
  exercise: 30,
  skill_work: 25,
  mobility: 10,
  recovery: 5,
  activity: 20,
  custom: 15,
};

function estimateFolderCNS(items: ActivityFolderItem[]): number {
  return items.reduce((total, item) => {
    const base = CNS_BY_TYPE[item.item_type || 'custom'] || 15;
    const scale = (item.duration_minutes || 30) / 30;
    return total + base * scale;
  }, 0);
}

export interface OverloadWarning {
  type: string;
  severity: 'advisory' | 'warning';
  message: string;
  suggestion?: string;
}

export function useFolderOverloadCheck(
  folderItems: ActivityFolderItem[],
  plannedCNS: number = 0,
  targetDate?: string,
) {
  const [warnings, setWarnings] = useState<OverloadWarning[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (folderItems.length === 0 && plannedCNS === 0) {
      setWarnings([]);
      return;
    }

    const check = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const folderCNS = estimateFolderCNS(folderItems);

        const { data, error } = await supabase.functions.invoke('detect-overlaps', {
          body: {
            target_date: targetDate || new Date().toISOString().split('T')[0],
            planned_cns_load: plannedCNS,
            folder_cns_load: folderCNS,
          },
        });

        if (!error && data?.warnings) {
          setWarnings(data.warnings);
        }
      } catch (err) {
        console.error('Overload check failed:', err);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [folderItems.length, plannedCNS, targetDate]);

  return { warnings, loading };
}
