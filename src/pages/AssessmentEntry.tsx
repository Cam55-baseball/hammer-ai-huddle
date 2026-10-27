import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { InitialAssessmentCard } from "@/components/assessment/InitialAssessmentCard";
import { assessmentEntryAllowed, assessmentEntrySport } from "@/lib/assessment/entryRules";

export default function AssessmentEntry() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [admitted, setAdmitted] = useState(false);
  const q = useQuery({ queryKey: ["assessment-entry", user?.id], enabled: !!user, queryFn: async () => {
    if (!user) return null;
    const [assessment, profile, sub, context] = await Promise.all([
      supabase.from("initial_assessments").select("completed_at,mode_opened_at").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("hammers_today_started_at").eq("id", user.id).maybeSingle(),
      supabase.from("subscriptions").select("status,subscribed_modules").eq("user_id", user.id).eq("status", "active"),
      supabase.from("athlete_context").select("sport_primary").eq("user_id", user.id).maybeSingle(),
    ]);
    if (assessment.error || profile.error || sub.error || context.error) throw assessment.error ?? profile.error ?? sub.error ?? context.error;
    return { assessment: assessment.data, sport: context.data?.sport_primary, started: profile.data?.hammers_today_started_at, paid: (sub.data ?? []).some(subscription => (subscription.subscribed_modules?.length ?? 0) > 0) };
  }});
  const sport = assessmentEntrySport(q.data?.sport, params.get("sport"));
  useEffect(() => {
    if (!q.data || admitted) return;
    if (!assessmentEntryAllowed({ paid: q.data.paid, started: !!q.data.started, completed: !!q.data.assessment?.completed_at, opened: !!q.data.assessment?.mode_opened_at, explicitResume: true })) navigate("/dashboard", { replace: true });
    else setAdmitted(true);
  }, [q.data, admitted, navigate]);
  if (q.error) return <p role="alert" className="p-6 text-destructive">Couldn't load your assessment. Please try again.</p>;
  if (q.data && !sport) return <p role="alert" className="p-6 text-destructive">Open the assessment for your saved sport. If no sport is saved, finish your profile first.</p>;
  if (!admitted) return null;
  if (!sport) return null;
  return <InitialAssessmentCard sport={sport} autoOpen onClose={() => navigate("/dashboard", { replace: true })} />;
}