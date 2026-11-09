import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMemo } from "react";

interface AnswerOption {
  id: string;
  text: string;
}

interface DailyScenario {
  id: string;
  scenario_text: string;
  correct_answer: string;
  explanation: string;
  options: string[];
  difficulty: string;
  lesson_id: string;
  wrong_explanations: Record<string, string> | null;
  game_consequence: string | null;
  answer_options: AnswerOption[] | null;
  correct_answer_id: string | null;
  mistake_type: string | null;
}

interface DailyAttempt {
  id: string;
  scenario_id: string;
  correct: boolean;
  response_time_ms: number;
  created_at: string;
}

export function useBaserunningDaily(sport: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().slice(0, 10);

  // Fetch all attempts for streak + stats
  const attemptsQuery = useQuery({
    queryKey: ["daily-attempts", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("baserunning_daily_attempts")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DailyAttempt[];
    },
  });

  const attempts = attemptsQuery.data ?? [];

  // Today's attempts
  const todayAttempts = useMemo(
    () => attempts.filter((a) => a.created_at.slice(0, 10) === todayStr),
    [attempts, todayStr]
  );
  const completedToday = todayAttempts.length > 0;

  // Recent scenario IDs (last 7 days) for no-repeat
  const recentScenarioIds = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return attempts
      .filter((a) => new Date(a.created_at) >= sevenDaysAgo)
      .map((a) => a.scenario_id);
  }, [attempts]);

  // Fetch today's scenarios (random, excluding recent)
  const scenariosQuery = useQuery({
    queryKey: ["daily-scenarios", sport, recentScenarioIds.join(",")],
    enabled: !!user?.id && !completedToday,
    queryFn: async () => {
      let query = supabase
        .from("baserunning_scenarios")
        .select("*")
        .or(`sport.eq.${sport},sport.eq.both`);

      if (recentScenarioIds.length > 0) {
        query = query.not("id", "in", `(${recentScenarioIds.join(",")})`);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;

      // Client-side shuffle and pick 3
      const shuffled = (data ?? []).sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 3) as unknown as DailyScenario[];
    },
  });

  // Streak calculation
  const streak = useMemo(() => {
    const dateSet = new Set(attempts.map((a) => a.created_at.slice(0, 10)));
    let count = 0;
    const d = new Date();
    // Check today first
    if (!dateSet.has(d.toISOString().slice(0, 10))) {
      // If no attempts today, check if yesterday exists (streak not yet broken today)
      d.setDate(d.getDate() - 1);
      if (!dateSet.has(d.toISOString().slice(0, 10))) return 0;
    }
    // Count consecutive days
    const check = new Date();
    if (!dateSet.has(check.toISOString().slice(0, 10))) {
      check.setDate(check.getDate() - 1);
    }
    while (dateSet.has(check.toISOString().slice(0, 10))) {
      count++;
      check.setDate(check.getDate() - 1);
    }
    return count;
  }, [attempts]);

  // 7-day stats
  const stats = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = attempts.filter((a) => new Date(a.created_at) >= sevenDaysAgo);
    if (recent.length === 0) return { accuracy: 0, avgTime: 0, total: 0 };
    const correct = recent.filter((a) => a.correct).length;
    const avgTime = Math.round(recent.reduce((s, a) => s + a.response_time_ms, 0) / recent.length);
    return {
      accuracy: Math.round((correct / recent.length) * 100),
      avgTime,
      total: recent.length,
    };
  }, [attempts]);

  // Submit attempt
  const submitAttempt = useMutation({
    mutationFn: async (params: { scenarioId: string; correct: boolean; responseTimeMs: number }) => {
      const { error } = await supabase.from("baserunning_daily_attempts").insert({
        user_id: user!.id,
        scenario_id: params.scenarioId,
        correct: params.correct,
        response_time_ms: params.responseTimeMs,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-attempts"] });
    },
  });

  const streakLost = streak === 0 && attempts.length > 0 && !completedToday;
  const isPerfectDay = completedToday && todayAttempts.length > 0 && todayAttempts.every((a) => a.correct);

  return {
    scenarios: scenariosQuery.data ?? [],
    todayAttempts,
    completedToday,
    streak,
    streakLost,
    isPerfectDay,
    stats,
    submitAttempt,
    isLoading: attemptsQuery.isLoading || scenariosQuery.isLoading,
  };
}
