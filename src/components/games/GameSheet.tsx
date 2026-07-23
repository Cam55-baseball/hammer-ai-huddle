/**
 * GameSheet — full-screen drawer for one game. Wraps every logger.
 *
 * Tabs: Overview · At-Bats · Pitches · Defense · Baserunning · Subs · Notes.
 * Each logger writes to its own `gp_*` table via a hook. Position-open
 * (multiple positions, switch sides), save-and-exit, autosave-on-blur.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Save, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { AtBatLogger } from "./AtBatLogger";
import { DefenseLogger } from "./DefenseLogger";
import { BaserunLogger } from "./BaserunLogger";
import { SubLogger } from "./SubLogger";
import { PitchLogger } from "./PitchLogger";
import { GameDocumentIngest } from "./GameDocumentIngest";
import { GameTotalsHeader } from "./GameTotalsHeader";
import { GameDayMode } from "./GameDayMode";
import { ActivePlanCard } from "./ActivePlanCard";
import { useGpRealtime } from "@/hooks/useGpRealtime";
import { usePitcherDossiers, useOpponentHitters } from "@/hooks/useGameDossiers";
import { PitcherDossierDrawer } from "./PitcherDossierDrawer";
import { HitterDossierDrawer } from "./HitterDossierDrawer";
import { NumberField } from "@/components/games/NumberField";


const POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "PH", "PR"];

export function GameSheet({
  gameId,
  open,
  onOpenChange,
}: {
  gameId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  useGpRealtime(open);


  const game = useQuery({
    queryKey: ["gp-game", gameId],
    enabled: !!user && open,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("gp_games")
        .select("*")
        .eq("id", gameId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      const { error } = await (supabase as any)
        .from("gp_games")
        .update(patch)
        .eq("id", gameId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gp-game", gameId] });
      qc.invalidateQueries({ queryKey: ["gp-games-list"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("gp_games")
        .delete()
        .eq("id", gameId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gp-games-list"] });
      toast.success("Game deleted");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });

  const g = game.data;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl overflow-y-auto p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-3 border-b sticky top-0 bg-background z-10">
          <SheetTitle className="flex items-center justify-between">
            <span>
              {g
                ? `${format(parseISO(g.game_date), "EEE, MMM d")} ${g.opponent_team ? `· vs ${g.opponent_team}` : ""}`
                : "Game"}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="gap-1"
              >
                <Save className="h-3.5 w-3.5" />
                Save & exit
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (confirm("Delete this game and all its events?")) del.mutate();
                }}
                className="h-8 w-8 text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </SheetTitle>
          <SheetDescription className="text-xs">
            Position-open. Switch-hitter / switch-thrower aware. Everything autosaves.
          </SheetDescription>
        </SheetHeader>

        {!g ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
          <GameTotalsHeader gameId={gameId} />
          <div className="px-6 py-4">
            <GameSheetTabs
              gameId={gameId}
              g={g}
              onPatch={(p) => update.mutate(p)}
            />
          </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function GameSheetTabs({
  gameId,
  g,
  onPatch,
}: {
  gameId: string;
  g: any;
  onPatch: (patch: Record<string, any>) => void;
}) {
  const isToday = g.game_date === new Date().toISOString().slice(0, 10);
  const [tab, setTab] = useState<string>(isToday ? "live" : "overview");

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="flex flex-wrap h-auto justify-start w-full">
        {isToday && <TabsTrigger value="live">Live</TabsTrigger>}
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="atbats">At-Bats</TabsTrigger>
        <TabsTrigger value="defense">Defense</TabsTrigger>
        <TabsTrigger value="baserun">Baserun</TabsTrigger>
        <TabsTrigger value="pitches">Pitching</TabsTrigger>
        <TabsTrigger value="subs">Subs</TabsTrigger>
        <TabsTrigger value="import">Import</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>

      {isToday && (
        <TabsContent value="live" className="pt-4 space-y-4">
          <ActivePlanCard gameId={gameId} game={g} />
          <GameDayMode
            gameId={gameId}
            game={g}
            onNavigate={(target) => setTab(target)}
          />
        </TabsContent>
      )}

      <TabsContent value="overview" className="space-y-4 pt-4">
        <ActivePlanCard gameId={gameId} game={g} />
        <OverviewPanel game={g} onPatch={onPatch} />
      </TabsContent>


      <TabsContent value="atbats" className="pt-4">
        <AtBatLogger gameId={gameId} sport={g.sport} />
      </TabsContent>
      <TabsContent value="pitches" className="pt-4 space-y-3">
        <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
          <strong>Hitters:</strong> log pitches inside each at-bat (under At-Bats).
          This tab is for when <strong>you were pitching</strong> — log every pitch you threw, like a rep.
        </div>
        <PitchLogger gameId={gameId} sport={g.sport} />
      </TabsContent>
      <TabsContent value="defense" className="pt-4">
        <DefenseLogger gameId={gameId} />
      </TabsContent>
      <TabsContent value="baserun" className="pt-4">
        <BaserunLogger gameId={gameId} />
      </TabsContent>
      <TabsContent value="subs" className="pt-4">
        <SubLogger gameId={gameId} />
      </TabsContent>
      <TabsContent value="import" className="pt-4">
        <GameDocumentIngest gameId={gameId} sport={g.sport} />
      </TabsContent>
      <TabsContent value="notes" className="pt-4 space-y-3">
        <Label>Philosophy — pre-game</Label>
        <Textarea
          defaultValue={g.philosophy_pre ?? ""}
          placeholder="What's your approach today?"
          onBlur={(e) => onPatch({ philosophy_pre: e.target.value })}
        />
        <Label>Philosophy — post-game</Label>
        <Textarea
          defaultValue={g.philosophy_post ?? ""}
          placeholder="What worked, what didn't?"
          onBlur={(e) => onPatch({ philosophy_post: e.target.value })}
        />
        <div className="space-y-1.5">
          <Label>Verdict</Label>
          <Select
            value={g.philosophy_verdict ?? ""}
            onValueChange={(v) => onPatch({ philosophy_verdict: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Keep / tweak / can it" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="keep">Keep — this is the way</SelectItem>
              <SelectItem value="tweak">Tweak — close but adjust</SelectItem>
              <SelectItem value="can">Can it — start over</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Label>General notes</Label>
        <Textarea
          defaultValue={g.general_notes ?? ""}
          rows={4}
          onBlur={(e) => onPatch({ general_notes: e.target.value })}
        />
      </TabsContent>
    </Tabs>
  );
}


function OverviewPanel({
  game,
  onPatch,
}: {
  game: any;
  onPatch: (p: Record<string, any>) => void;
}) {
  const [positions, setPositions] = useState<string[]>(game.my_positions ?? []);
  const pitcherDossiers = usePitcherDossiers(game.sport);
  const hitterDossiers = useOpponentHitters(game.sport);
  const [editingPitcher, setEditingPitcher] = useState<any | null>(null);
  const [newPitcherOpen, setNewPitcherOpen] = useState(false);
  const [editingHitter, setEditingHitter] = useState<any | null>(null);
  const [newHitterOpen, setNewHitterOpen] = useState(false);
  const attachedHitterIds: string[] = Array.isArray(game.opponent_hitter_dossier_ids)
    ? game.opponent_hitter_dossier_ids
    : [];
  const attachedHitters = (hitterDossiers.list.data ?? []).filter((h) => attachedHitterIds.includes(h.id));
  const availableHitters = (hitterDossiers.list.data ?? []).filter((h) => !attachedHitterIds.includes(h.id));
  const currentPitcher = (pitcherDossiers.list.data ?? []).find(
    (p) => p.id === game.probable_pitcher_dossier_id,
  );

  const toggleHitter = (id: string) => {
    const next = attachedHitterIds.includes(id)
      ? attachedHitterIds.filter((x) => x !== id)
      : [...attachedHitterIds, id];
    onPatch({ opponent_hitter_dossier_ids: next });
  };

  const togglePos = (p: string) => {
    const next = positions.includes(p)
      ? positions.filter((x) => x !== p)
      : [...positions, p];
    setPositions(next);
    onPatch({ my_positions: next });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Opponent</Label>
          <Input
            defaultValue={game.opponent_team ?? ""}
            onBlur={(e) => onPatch({ opponent_team: e.target.value || null })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Home / Away</Label>
          <Select
            value={game.home_away ?? ""}
            onValueChange={(v) => onPatch({ home_away: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pick" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="home">Home</SelectItem>
              <SelectItem value="away">Away</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Game type</Label>
          <Select
            value={game.game_type ?? ""}
            onValueChange={(v) => onPatch({ game_type: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pick" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="regular_season">Regular season</SelectItem>
              <SelectItem value="tournament">Tournament</SelectItem>
              <SelectItem value="scrimmage">Scrimmage</SelectItem>
              <SelectItem value="showcase">Showcase</SelectItem>
              <SelectItem value="playoff">Playoff</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Lineup slot</Label>
          <NumberField
            min={1}
            max={12}
            defaultValue={game.lineup_slot ?? ""}
            onBlur={(e) =>
              onPatch({ lineup_slot: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>My score</Label>
          <NumberField
            defaultValue={game.my_score ?? ""}
            onBlur={(e) =>
              onPatch({ my_score: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Opp score</Label>
          <NumberField
            defaultValue={game.opp_score ?? ""}
            onBlur={(e) =>
              onPatch({ opp_score: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
      </div>

      <div className="space-y-1.5 rounded-md border border-primary/30 bg-primary/5 p-2.5">
        <Label className="text-xs uppercase tracking-wide">Probable pitcher today</Label>
        <Select
          value={game.probable_pitcher_dossier_id ?? "__none"}
          onValueChange={(v) => {
            if (v === "__new") { setNewPitcherOpen(true); return; }
            onPatch({ probable_pitcher_dossier_id: v === "__none" ? null : v });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pick a pitcher to unlock the elite plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">— None —</SelectItem>
            {(pitcherDossiers.list.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}{p.team ? ` · ${p.team}` : ""}{p.throws ? ` · ${p.throws}HP` : ""}
              </SelectItem>
            ))}
            <SelectItem value="__new">+ New scouting profile…</SelectItem>
          </SelectContent>
        </Select>
        {currentPitcher && (
          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>Plan + per-AB defaults use <strong>{currentPitcher.name}</strong></span>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => setEditingPitcher(currentPitcher)}>
              Open profile
            </Button>
          </div>
        )}
      </div>

      <PitcherDossierDrawer
        open={!!editingPitcher || newPitcherOpen}
        onOpenChange={(o) => { if (!o) { setEditingPitcher(null); setNewPitcherOpen(false); } }}
        sport={game.sport}
        dossier={editingPitcher}
      />

      <div className="space-y-1.5">
        <Label>Positions played (tap to toggle — multiple ok)</Label>
        <div className="flex flex-wrap gap-1.5">
          {POSITIONS.map((p) => (
            <Badge
              key={p}
              variant={positions.includes(p) ? "default" : "outline"}
              onClick={() => togglePos(p)}
              className="cursor-pointer select-none"
            >
              {p}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={game.status} onValueChange={(v) => onPatch({ status: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scheduled">Upcoming — not played yet</SelectItem>
            <SelectItem value="in_progress">Live now — logging in-game</SelectItem>
            <SelectItem value="final">Played — final</SelectItem>
            <SelectItem value="canceled">Canceled / rained out</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
