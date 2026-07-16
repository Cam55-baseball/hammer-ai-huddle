import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Brain, Shield, Swords, Target, Footprints, Sparkles, PlayCircle, X, Settings } from "lucide-react";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { IqSituationCard } from "@/components/iq/IqSituationCard";
import { useIqSituations } from "@/hooks/useIqSituations";
import { useIqProgress } from "@/hooks/useIqProgress";
import { useSportTheme } from "@/contexts/SportThemeContext";
import { Skeleton } from "@/components/ui/skeleton";
import type { IqLens } from "@/lib/iq/types";
import { quizResume } from "@/lib/iq/resumeStore";

const LENS_TABS: { value: IqLens | "all"; label: string; icon: typeof Brain }[] = [
  { value: "all", label: "All", icon: Brain },
  { value: "defense", label: "Defense", icon: Shield },
  { value: "offense", label: "Offense", icon: Swords },
  { value: "pitching", label: "Pitching", icon: Target },
  { value: "baserunning", label: "Run", icon: Footprints },
];

export default function GameIq() {
  const { sport } = useSportTheme();
  const [params, setParams] = useSearchParams();
  const initialLens = (params.get("lens") as IqLens | "all" | null) ?? "all";
  const [lens, setLens] = useState<IqLens | "all">(initialLens);
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (lens === "all") next.delete("lens"); else next.set("lens", lens);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lens]);
  const navigate = useNavigate();
  const situationsQ = useIqSituations(sport, lens === "all" ? undefined : lens);
  const progressQ = useIqProgress();

  const progressByS = useMemo(() => {
    const m = new Map<string, number>();
    (progressQ.data ?? []).forEach((p) => m.set(p.situation_id, p.mastery_score));
    return m;
  }, [progressQ.data]);

  const overallIq = useMemo(() => {
    const arr = progressQ.data ?? [];
    if (!arr.length) return 0;
    return Math.round(arr.reduce((s, p) => s + p.mastery_score, 0) / arr.length);
  }, [progressQ.data]);

  const dueCount = useMemo(() => {
    const now = Date.now();
    return (progressQ.data ?? []).filter((p) => p.next_due_at && new Date(p.next_due_at).getTime() <= now).length;
  }, [progressQ.data]);

  const situations = situationsQ.data ?? [];

  const [resume, setResume] = useState(() => quizResume.load());
  const dismissResume = () => { quizResume.clear(); setResume(null); };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 py-4 px-4 sm:px-0">
        <header className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Game IQ 101</h1>
          </div>
          <p className="text-muted-foreground">
            Every pitch. Every position. <span className="font-semibold">Ball · Bag · Backup.</span>
          </p>
        </header>

        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold tabular-nums">{overallIq}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">IQ score</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold tabular-nums">{progressQ.data?.length ?? 0}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Touched</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold tabular-nums">{dueCount}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Due now</div>
          </Card>
        </div>

        {resume && resume.situationSlug && (
          <Card className="p-4 flex items-center gap-3 border-emerald-500/40 bg-emerald-500/5">
            <PlayCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            <div className="flex-1 text-sm min-w-0">
              <div className="font-semibold truncate">Pick up where you left off</div>
              <div className="text-xs text-muted-foreground truncate">
                {resume.situationTitle || resume.situationSlug}
              </div>
            </div>
            <Button size="sm" onClick={() => navigate(`/iq/${resume.situationSlug}?mode=quiz`)}>
              Resume
            </Button>
            <Button size="icon" variant="ghost" onClick={dismissResume} aria-label="Dismiss">
              <X className="h-4 w-4" />
            </Button>
          </Card>
        )}

        {dueCount > 0 && (
          <Card className="p-4 flex items-center gap-3 border-primary/30 bg-primary/5">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 text-sm">
              <span className="font-semibold">{dueCount}</span> situation{dueCount === 1 ? "" : "s"} ready for review.
            </div>
            <Button size="sm" onClick={() => navigate("/iq/review")}>Review now</Button>
          </Card>
        )}

        <Tabs value={lens} onValueChange={(v) => setLens(v as IqLens | "all")}>
          <TabsList className="grid grid-cols-5 w-full">
            {LENS_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs">
                <t.icon className="h-3.5 w-3.5 mr-1" />{t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={lens} className="mt-4 space-y-3">
            {situationsQ.isLoading ? (
              [1,2,3].map((i) => <Skeleton key={i} className="h-28 w-full" />)
            ) : situations.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No situations published yet for {sport}. Check back soon.
              </Card>
            ) : (
              situations.map((s) => (
                <IqSituationCard key={s.id} situation={s}
                                 mastery={progressByS.get(s.id)}
                                 onClick={() => navigate(`/iq/${s.slug}`)} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
