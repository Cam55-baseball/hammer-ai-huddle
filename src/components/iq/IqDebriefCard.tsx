/**
 * IqDebriefCard — post-play recap surfaced after a correct answer or after
 * "Watch the play" completes. Extracted from IqScenarioRunner per Phase 4
 * plan §4.3. Adds the "Next rung" prompt that links to the next-difficulty
 * situation in the same primary concept, and a synthesized fallback summary
 * when `debrief` text is null.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpen, ArrowUpRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { IqActor, IqSport } from "@/lib/iq/types";

interface Props {
  situationId: string;
  sport: IqSport;
  currentRung: number;
  debrief?: string | null;
  conceptLabels?: string[];
  actors: IqActor[];
}

interface NextRungRow {
  id: string;
  slug: string;
  title: string;
  difficulty_rung: number | null;
  sport: IqSport;
}

function useNextRungSituation(situationId: string, currentRung: number) {
  return useQuery({
    queryKey: ["iq-next-rung", situationId, currentRung],
    queryFn: async (): Promise<NextRungRow | null> => {
      // Concepts tied to the current situation
      const links = await supabase
        .from("iq_situation_concepts")
        .select("concept_id")
        .eq("situation_id", situationId);
      const conceptIds = (links.data ?? []).map((r: { concept_id: string }) => r.concept_id);
      if (conceptIds.length === 0) return null;

      // Sibling situations sharing at least one concept
      const siblingLinks = await supabase
        .from("iq_situation_concepts")
        .select("situation_id")
        .in("concept_id", conceptIds);
      const sitIds = Array.from(
        new Set((siblingLinks.data ?? []).map((r: { situation_id: string }) => r.situation_id)),
      ).filter((id) => id !== situationId);
      if (sitIds.length === 0) return null;

      const sits = await supabase
        .from("iq_situations")
        .select("id, slug, title, difficulty_rung, sport")
        .in("id", sitIds)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("difficulty_rung", { ascending: true, nullsFirst: false })
        .order("canonical_order", { ascending: true });

      const rows = (sits.data ?? []) as unknown as NextRungRow[];
      // First situation whose rung is strictly greater than current.
      return rows.find((r) => (r.difficulty_rung ?? 1) > currentRung) ?? null;
    },
    enabled: !!situationId,
    staleTime: 60_000,
  });
}

export function IqDebriefCard({
  situationId, sport, currentRung, debrief, conceptLabels, actors,
}: Props) {
  const { data: next } = useNextRungSituation(situationId, currentRung);

  // Fallback: synthesize from concept labels + top elite cues when debrief is null.
  const fallback = (() => {
    if (debrief) return null;
    const cues = actors
      .map((a) => a.elite_cue?.trim())
      .filter((s): s is string => !!s)
      .slice(0, 3);
    const conceptStr = conceptLabels?.length ? conceptLabels.join(" · ") : null;
    if (!conceptStr && cues.length === 0) return null;
    return { conceptStr, cues };
  })();

  if (!debrief && !fallback && !next && !(conceptLabels && conceptLabels.length)) return null;

  void sport;

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <BookOpen className="h-4 w-4 text-primary" /> Debrief
      </div>

      {debrief && <p className="text-sm leading-relaxed">{debrief}</p>}

      {!debrief && fallback && (
        <div className="space-y-2">
          {fallback.conceptStr && (
            <p className="text-sm leading-relaxed">
              This rep pressure-tested <span className="font-medium">{fallback.conceptStr}</span>.
            </p>
          )}
          {fallback.cues.length > 0 && (
            <ul className="space-y-1">
              {fallback.cues.map((c, i) => (
                <li key={i} className="flex gap-2 items-start text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="italic leading-snug">{c}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {conceptLabels && conceptLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Concepts</span>
          {conceptLabels.map((c) => (
            <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
              {c}
            </span>
          ))}
        </div>
      )}

      {next ? (
        <Link
          to={`/iq/${next.slug}`}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold rounded-md border border-primary/40 bg-background px-2.5 py-1.5 hover:bg-primary/10 transition-colors"
        >
          Next rung · {next.title}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      ) : (
        <p className="text-[11px] text-muted-foreground pt-1">
          Master this concept to unlock the next rung.
        </p>
      )}
    </div>
  );
}
