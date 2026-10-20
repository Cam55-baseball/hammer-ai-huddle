import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { useFeatureSwitches } from '@/hooks/useFeatureSwitches';
import { localIso } from '@/hooks/usePitcherSchedule';
import { supabase } from '@/integrations/supabase/client';
import { requiredAnalyses, type AnalysisModule } from '@/lib/assessment/initialAssessment';
import { analysesDueToday } from '@/lib/hammer/analysisPromptRules';
import { Button } from '@/components/ui/button';

/** Read-only adapter; caller supplies existing prescribed modules, never a new plan. */
export function AnalysisRecordingPrompts({ prescribed }: { prescribed: readonly AnalysisModule[] }) {
  const { user } = useAuth();
  const { modules } = useSubscription();
  const { sport } = useSportTheme();
  const switches = useFeatureSwitches();
  const navigate = useNavigate();
  const enabled = !switches.loading && switches.isEnabled('plan_prompts_v2');
  const query = useQuery({
    queryKey: ['analysis-recording-prompts', user?.id, sport], enabled: enabled && Boolean(user),
    queryFn: async () => {
      if (!user) throw new Error('Sign in first');
      const latest: Partial<Record<AnalysisModule, string>> = {};
      const included = requiredAnalyses(modules.filter(module => module.startsWith(`${sport}_`)));
      await Promise.all(included.map(async module => {
        const result = await supabase.from('videos').select('created_at').eq('user_id', user.id)
          .eq('sport', sport).eq('module', module).not('analysis_public', 'is', null)
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (result.error) throw result.error;
        if (result.data) latest[module] = result.data.created_at;
      }));
      return latest;
    },
  });
  if (!enabled) return null;
  if (query.error) return <p role="alert" className="text-sm text-destructive">Couldn't check your saved analyses.</p>;
  if (!query.data || query.isLoading) return null;
  const due = analysesDueToday({ enabled, today: localIso(), included: requiredAnalyses(modules.filter(module => module.startsWith(`${sport}_`))), prescribed, latest: query.data });
  return <>{due.map(module => <div key={module} className="flex flex-wrap items-center gap-3 border-b border-border py-3">
    <Camera className="h-5 w-5 shrink-0 text-primary" />
    <p className="min-w-0 flex-1 text-sm font-semibold">Record your {module} analysis</p>
    <Button size="sm" onClick={() => navigate(`/analyze?module=${module}&sport=${sport}`)}>Record analysis</Button>
  </div>)}</>;
}