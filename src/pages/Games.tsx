/**
 * Games — V1 of the elite Game Performance hub.
 *
 * Replaces the old Game Hub. Reads from the new `gp_*` ledger (gp_games,
 * gp_at_bats, gp_defense_plays, gp_baserun_events, gp_pitcher_dossiers,
 * gp_documents). Phases 2–7 layer richer drawers, AI ingest, dossiers,
 * report builder, and Hammer/Roadmap integration on top of this shell.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Plus,
  Search,
  Calendar as CalendarIcon,
  Trophy,
  ArrowRight,
  Sparkles,
  BarChart3,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { GameSheet } from "@/components/games/GameSheet";

interface GameRow {
  id: string;
  game_date: string;
  sport: string;
  opponent_team: string | null;
  status: string;
  game_type: string | null;
  my_positions: string[] | null;
  my_score: number | null;
  opp_score: number | null;
  philosophy_verdict: string | null;
}

export default function Games() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [openSheet, setOpenSheet] = useState<string | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const games = useQuery({
    queryKey: ["gp-games-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("gp_games")
        .select(
          "id, game_date, sport, opponent_team, status, game_type, my_positions, my_score, opp_score, philosophy_verdict",
        )
        .eq("user_id", user!.id)
        .order("game_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as GameRow[];
    },
  });

  const createGame = useMutation({
    mutationFn: async (input: { date: string; sport: string; opponent: string }) => {
      const { data, error } = await (supabase as any)
        .from("gp_games")
        .insert({
          user_id: user!.id,
          game_date: input.date,
          sport: input.sport,
          opponent_team: input.opponent || null,
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["gp-games-list"] });
      setNewDialogOpen(false);
      setOpenSheet(id);
      toast.success("Game created — fill it in as you go.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not create game"),
  });

  const filtered = useMemo(() => {
    const rows = games.data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((g) => {
      if (filterStatus !== "all" && g.status !== filterStatus) return false;
      if (!q) return true;
      const hay = [
        g.opponent_team,
        g.game_date,
        g.sport,
        g.game_type,
        (g.my_positions ?? []).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [games.data, search, filterStatus]);

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="h-7 w-7 text-primary" />
            Games
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Your performance ledger. Every at-bat, pitch, defensive play and steal lives here —
            and it drives Hammer's daily plan, your roadmap, and your dashboards.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setNewDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New game
          </Button>
        </div>
      </motion.div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search opponent, date, position, pitch type…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="final">Final</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Helper tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <HelperTile
          icon={<Sparkles className="h-5 w-5" />}
          title="AI document import"
          desc="Drop a Trackman / GameChanger / Rapsodo file or a scorebook photo — events get drafted, you confirm by inning."
          onClick={() => toast.info("Open a game, then use the Import tab.")}
        />
        <HelperTile
          icon={<Users className="h-5 w-5" />}
          title="Dossiers"
          desc="Persistent notes on every pitcher and hitter you've faced. Pre-game strike-zone plan + post-game review."
          onClick={() => navigate("/games/dossiers")}
        />
        <HelperTile
          icon={<BarChart3 className="h-5 w-5" />}
          title="Reports"
          desc="Heat maps, plate discipline, pitcher usage, defense and baserun — switch-side aware."
          onClick={() => navigate("/games/reports")}
        />
      </div>

      {/* Game list */}
      <div className="space-y-2">
        {games.isLoading && (
          <p className="text-sm text-muted-foreground">Loading games…</p>
        )}
        {!games.isLoading && filtered.length === 0 && (
          <Card className="p-8 text-center space-y-3">
            <Trophy className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No games logged yet. Start one above — or wait for "Did you play today?" to
              appear on a scheduled game day.
            </p>
          </Card>
        )}
        {filtered.map((g) => (
          <Card
            key={g.id}
            onClick={() => setOpenSheet(g.id)}
            className="p-4 hover:bg-muted/40 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">
                    {format(parseISO(g.game_date), "EEE, MMM d, yyyy")}
                  </span>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {g.sport}
                  </Badge>
                  <Badge
                    variant={g.status === "final" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {g.status}
                  </Badge>
                  {g.game_type && (
                    <Badge variant="outline" className="text-[10px]">
                      {g.game_type}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {g.opponent_team ? `vs ${g.opponent_team}` : "Opponent not set"}
                  {g.my_positions && g.my_positions.length > 0
                    ? ` · ${g.my_positions.join(", ")}`
                    : ""}
                  {g.my_score != null && g.opp_score != null
                    ? ` · ${g.my_score}-${g.opp_score}`
                    : ""}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </Card>
        ))}
      </div>

      {/* New game dialog */}
      <NewGameDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        onSubmit={(v) => createGame.mutate(v)}
        pending={createGame.isPending}
      />

      {/* Game sheet */}
      {openSheet && (
        <GameSheet
          gameId={openSheet}
          open={!!openSheet}
          onOpenChange={(o) => !o && setOpenSheet(null)}
        />
      )}
    </div>
  );
}

function HelperTile({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className="p-4 hover:bg-muted/40 cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-2 text-primary">{icon}<span className="font-medium text-foreground">{title}</span></div>
      <p className="text-xs text-muted-foreground mt-1.5">{desc}</p>
    </Card>
  );
}

function NewGameDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (v: { date: string; sport: string; opponent: string }) => void;
  pending: boolean;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sport, setSport] = useState("baseball");
  const [opponent, setOpponent] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New game</DialogTitle>
          <DialogDescription>
            Vague is fine — you can fill the rest in as you go. Save & Exit at any point.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sport</Label>
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baseball">Baseball</SelectItem>
                <SelectItem value="softball">Softball</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="opp">Opponent (optional)</Label>
            <Input
              id="opp"
              placeholder="e.g. Hawks"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending || !date}
            onClick={() => onSubmit({ date, sport, opponent })}
          >
            {pending ? "Creating…" : "Open game sheet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
