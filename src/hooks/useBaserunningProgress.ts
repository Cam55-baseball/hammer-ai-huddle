import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useBaserunningProgress(sport: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const lessonsQuery = useQuery({
    queryKey: ["baserunning-lessons", sport],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("baserunning_lessons")
        .select("*")
        .or(`sport.eq.${sport},sport.eq.both`)
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const progressQuery = useQuery({
    queryKey: ["baserunning-progress", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("baserunning_progress")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  const completionPct = (() => {
    const lessons = lessonsQuery.data;
    const progress = progressQuery.data;
    if (!lessons?.length) return 0;
    const completed = progress?.filter((p) => p.completed).length ?? 0;
    return Math.round((completed / lessons.length) * 100);
  })();

  const markComplete = useMutation({
    mutationFn: async ({ lessonId, score }: { lessonId: string; score: number }) => {
      const { error } = await supabase
        .from("baserunning_progress")
        .upsert(
          {
            user_id: user!.id,
            lesson_id: lessonId,
            completed: true,
            score,
            last_attempt_at: new Date().toISOString(),
          },
          { onConflict: "user_id,lesson_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["baserunning-progress"] });
    },
  });

  return { lessons: lessonsQuery.data ?? [], progress: progressQuery.data ?? [], completionPct, markComplete, isLoading: lessonsQuery.isLoading };
}
