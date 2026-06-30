/**
 * Dossiers — pitcher + opponent-hitter library.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  usePitcherDossiers, useOpponentHitters,
  type PitcherDossier, type OpponentHitter,
} from "@/hooks/useGameDossiers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PitcherDossierDrawer } from "@/components/games/PitcherDossierDrawer";
import { HitterDossierDrawer } from "@/components/games/HitterDossierDrawer";

export default function Dossiers() {
  const navigate = useNavigate();
  const [sport, setSport] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editPitcher, setEditPitcher] = useState<PitcherDossier | null>(null);
  const [openPitcher, setOpenPitcher] = useState(false);
  const [editHitter, setEditHitter] = useState<OpponentHitter | null>(null);
  const [openHitter, setOpenHitter] = useState(false);

  const pitchers = usePitcherDossiers(sport === "all" ? undefined : sport);
  const hitters = useOpponentHitters(sport === "all" ? undefined : sport);

  const filter = (s: string) =>
    s.toLowerCase().includes(search.trim().toLowerCase());

  const pRows = (pitchers.list.data ?? []).filter(
    (p) => !search || filter(p.name) || filter(p.team ?? ""),
  );
  const hRows = (hitters.list.data ?? []).filter(
    (h) => !search || filter(h.name) || filter(h.team ?? ""),
  );

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/games")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="h-6 w-6 text-primary" /> Dossiers
        </h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Pitchers and hitters you've faced. Plans persist across games — review pregame,
        update postgame.
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name or team…" className="pl-9"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={sport} onValueChange={setSport}>
          <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sports</SelectItem>
            <SelectItem value="baseball">Baseball</SelectItem>
            <SelectItem value="softball">Softball</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="pitchers">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="pitchers">Pitchers ({pRows.length})</TabsTrigger>
          <TabsTrigger value="hitters">Hitters ({hRows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pitchers" className="pt-3 space-y-2">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1"
              onClick={() => { setEditPitcher(null); setOpenPitcher(true); }}>
              <Plus className="h-3.5 w-3.5" /> New pitcher
            </Button>
          </div>
          {pRows.map((p) => (
            <Card key={p.id} className="p-3 hover:bg-muted/40 cursor-pointer"
              onClick={() => { setEditPitcher(p); setOpenPitcher(true); }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[p.team, p.throws ? `Throws ${p.throws}` : null, p.arm_slot].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">{p.sport}</Badge>
                  {p.last_faced && (
                    <span className="text-[10px] text-muted-foreground">
                      last {format(parseISO(p.last_faced), "MMM d")}
                    </span>
                  )}
                </div>
              </div>
              {(p.repertoire ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {p.repertoire!.slice(0, 6).map((r, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {r.pitch}{r.velo ? ` ${r.velo}` : ""}{r.usage ? ` ${r.usage}%` : ""}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          ))}
          {!pitchers.list.isLoading && pRows.length === 0 && (
            <Card className="p-6 text-sm text-muted-foreground text-center space-y-1">
              <div>No pitchers yet. Add one to start building plans.</div>
              <div className="text-xs">Tag a pitcher on a game's Overview tab to unlock the elite plan.</div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="hitters" className="pt-3 space-y-2">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1"
              onClick={() => { setEditHitter(null); setOpenHitter(true); }}>
              <Plus className="h-3.5 w-3.5" /> New hitter
            </Button>
          </div>
          {hRows.map((h) => (
            <Card key={h.id} className="p-3 hover:bg-muted/40 cursor-pointer"
              onClick={() => { setEditHitter(h); setOpenHitter(true); }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{h.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[h.team, h.bats ? `Bats ${h.bats}` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">{h.sport}</Badge>
              </div>
              {h.notes && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{h.notes}</p>}
            </Card>
          ))}
          {!hitters.list.isLoading && hRows.length === 0 && (
            <Card className="p-6 text-sm text-muted-foreground text-center">
              No hitters yet.
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <PitcherDossierDrawer
        open={openPitcher} onOpenChange={setOpenPitcher}
        sport={sport === "all" ? "baseball" : sport}
        dossier={editPitcher}
      />
      <HitterDossierDrawer
        open={openHitter} onOpenChange={setOpenHitter}
        sport={sport === "all" ? "baseball" : sport}
        dossier={editHitter}
      />
    </div>
  );
}
