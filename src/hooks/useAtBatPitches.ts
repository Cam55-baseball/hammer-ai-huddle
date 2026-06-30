/**
 * useAtBatPitches — pitches scoped to a single at-bat.
 *
 * Built on top of `gp("gp_pitches")`. Provides:
 *   - `list`           — pitches for this AB, ordered by pitch_no asc
 *   - `add(row)`       — insert a pitch already keyed to this AB + game
 *   - `del(id)`        — delete, returns the previous row so callers can offer undo
 *   - `tally`          — { balls, strikes, terminated, terminalReason }
 *
 * Read-only over the canonical ledger — interpretive only, never authors
 * organism truth. Missingness preserved (returns `null` for missing fields).
 */
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { gp } from "@/lib/games/ledger";
import { toast } from "sonner";
import type { GpPitchRow } from "@/hooks/useGamePitches";

export interface AtBatPitchTally {
  readonly balls: number;
  readonly strikes: number;
  readonly count: number;
  /** True when the AB should auto-close from pitch-level data. */
  readonly terminated: boolean;
  /** Human-readable reason — surfaced into the auto-close toast. */
  readonly terminalReason:
    | "walk"
    | "strikeout_looking"
    | "strikeout_swinging"
    | "in_play"
    | "hbp"
    | null;
  /** Best-guess AB result code matching `gp_at_bats.result` enums. */
  readonly suggestedResult: string | null;
}

function tallyOf(rows: ReadonlyArray<GpPitchRow>): AtBatPitchTally {
  let balls = 0;
  let strikes = 0;
  let terminated = false;
  let terminalReason: AtBatPitchTally["terminalReason"] = null;
  let suggestedResult: string | null = null;

  for (const p of rows) {
    if (terminated) break;
    switch (p.result) {
      case "ball":
        balls += 1;
        if (balls >= 4) {
          terminated = true;
          terminalReason = "walk";
          suggestedResult = "BB";
        }
        break;
      case "called_strike":
        strikes += 1;
        if (strikes >= 3) {
          terminated = true;
          terminalReason = "strikeout_looking";
          suggestedResult = "K_looking";
        }
        break;
      case "swinging_strike":
        strikes += 1;
        if (strikes >= 3) {
          terminated = true;
          terminalReason = "strikeout_swinging";
          suggestedResult = "K_swinging";
        }
        break;
      case "foul":
      case "bunt_foul":
        if (strikes < 2) strikes += 1;
        break;
      case "in_play":
      case "bunt_in_play":
        terminated = true;
        terminalReason = "in_play";
        // result left null — hitter chooses 1B/2B/3B/HR/FO/etc on close.
        break;
      case "hbp":
        terminated = true;
        terminalReason = "hbp";
        suggestedResult = "HBP";
        break;
      default:
        break;
    }
  }

  return {
    balls,
    strikes,
    count: balls * 10 + strikes,
    terminated,
    terminalReason,
    suggestedResult,
  };
}

export function useAtBatPitches(gameId: string, atBatId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["gp-ab-pitches", gameId, atBatId],
    enabled: !!user && !!atBatId,
    queryFn: async () => {
      const { data, error } = await gp("gp_pitches")
        .select("*")
        .eq("at_bat_id", atBatId!)
        .order("pitch_no", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GpPitchRow[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["gp-ab-pitches", gameId, atBatId] });
    qc.invalidateQueries({ queryKey: ["gp-pitches", gameId] });
  };

  const add = useMutation({
    mutationFn: async (row: Partial<GpPitchRow> & { perspective?: "pitcher" | "hitter" }) => {
      const nextNo = (list.data?.length ?? 0) + 1;
      const { data, error } = await gp("gp_pitches")
        .insert({
          perspective: "hitter",
          pitch_no: nextNo,
          ...row,
          user_id: user!.id,
          game_id: gameId,
          at_bat_id: atBatId,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data?.id as string | undefined;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Could not save pitch"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const prev = (list.data ?? []).find((p) => p.id === id) ?? null;
      const { error } = await gp("gp_pitches").delete().eq("id", id);
      if (error) throw error;
      return prev;
    },
    onSuccess: invalidate,
  });

  const tally = useMemo(() => tallyOf(list.data ?? []), [list.data]);

  return { list, add, del, tally };
}
