/**
 * Workout Library Viewer — Owner tool to audit the full wk_movement_catalog
 * sliced by season Quarter and engine category.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Info, Dumbbell } from "lucide-react";
import {
  useWorkoutCatalog,
  QUARTER_TABS,
  isMovementInQuarter,
  type CatalogMovement,
  type QuarterKey,
} from "@/hooks/useWorkoutCatalog";

const CATEGORY_LABELS: Record<string, string> = {
  compound: "Strength — Compound",
  kot: "Knees Over Toes",
  functional_patterning: "Functional Patterning",
  unilateral_lower: "Unilateral Lower",
  unilateral_push: "Unilateral Push",
  unilateral_pull: "Unilateral Pull",
  bat_speed: "Bat Speed",
  speed_lab: "Speed Lab",
  conditioning: "Conditioning",
  cross_sport: "Cross-Sport",
  arm_care: "Arm Care",
  trunk: "Trunk / Anti-Rotation",
  supplemental: "Supplemental",
  carry_antirotation: "Carries / Anti-Rotation",
};

const CATEGORY_ORDER = [
  "kot",
  "compound",
  "unilateral_lower",
  "unilateral_push",
  "unilateral_pull",
  "functional_patterning",
  "trunk",
  "carry_antirotation",
  "supplemental",
  "bat_speed",
  "speed_lab",
  "conditioning",
  "cross_sport",
  "arm_care",
];

function categoryOf(m: CatalogMovement): string {
  return (m.movement_category || m.category || "other").toLowerCase();
}

function trainingAgesOf(m: CatalogMovement): string[] {
  const ta = m.training_age_legality;
  if (!ta || typeof ta !== "object") return [];
  return Object.entries(ta)
    .filter(([, v]) => v === true)
    .map(([k]) => k);
}

function MovementRow({ m }: { m: CatalogMovement }) {
  const ages = trainingAgesOf(m);
  return (
    <div className="flex items-start justify-between gap-3 border-t border-border/40 py-3 first:border-t-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{m.name}</span>
          {m.source_philosophy && (
            <Badge variant="secondary" className="text-xs">
              {m.source_philosophy}
            </Badge>
          )}
          {m.game_day_legal && (
            <Badge variant="outline" className="border-emerald-500/50 text-xs text-emerald-600">
              Game-day OK
            </Badge>
          )}
          {m.is_eccentric_dominant && (
            <Badge variant="outline" className="text-xs">
              Eccentric
            </Badge>
          )}
          {m.pap_classification && (
            <Badge variant="outline" className="text-xs">
              PAP · {m.pap_classification}
            </Badge>
          )}
        </div>
        {m.cue && <p className="mt-1 text-sm text-muted-foreground">{m.cue}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          {m.primary_adaptation && <span>Adaptation: {m.primary_adaptation.replace(/_/g, " ")}</span>}
          {m.equipment && m.equipment.length > 0 && (
            <span>· Equip: {m.equipment.join(", ")}</span>
          )}
          {ages.length > 0 && <span>· Ages: {ages.join(" / ")}</span>}
          {typeof m.min_age_years === "number" && m.min_age_years > 0 && (
            <span>· Min age: {m.min_age_years}</span>
          )}
        </div>
      </div>
      {m.why_prescribed && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Why this movement">
              <Info className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="left" className="w-80 text-sm">
            <div className="font-medium mb-1">Why prescribed</div>
            <p className="text-muted-foreground">{m.why_prescribed}</p>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function QuarterView({
  quarter,
  movements,
  search,
}: {
  quarter: QuarterKey;
  movements: CatalogMovement[];
  search: string;
}) {
  const inQ = useMemo(() => {
    const filtered = movements.filter((m) => isMovementInQuarter(m, quarter));
    const s = search.trim().toLowerCase();
    if (!s) return filtered;
    return filtered.filter(
      (m) =>
        m.name.toLowerCase().includes(s) ||
        (m.source_philosophy ?? "").toLowerCase().includes(s) ||
        (m.cue ?? "").toLowerCase().includes(s) ||
        (m.primary_adaptation ?? "").toLowerCase().includes(s),
    );
  }, [movements, quarter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogMovement[]>();
    for (const m of inQ) {
      const c = categoryOf(m);
      const arr = map.get(c) ?? [];
      arr.push(m);
      map.set(c, arr);
    }
    const ordered: [string, CatalogMovement[]][] = [];
    for (const c of CATEGORY_ORDER) {
      if (map.has(c)) ordered.push([c, map.get(c)!]);
    }
    // append any unknown categories
    for (const [c, arr] of map.entries()) {
      if (!CATEGORY_ORDER.includes(c)) ordered.push([c, arr]);
    }
    return ordered;
  }, [inQ]);

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {inQ.length} movements available in this window
      </div>
      {grouped.map(([cat, list]) => (
        <Card key={cat} className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">
              {CATEGORY_LABELS[cat] ?? cat} <span className="text-muted-foreground">· {list.length}</span>
            </h3>
          </div>
          <div>
            {list.map((m) => (
              <MovementRow key={m.id} m={m} />
            ))}
          </div>
        </Card>
      ))}
      {grouped.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground">No movements match this filter.</Card>
      )}
    </div>
  );
}

export default function WorkoutLibraryViewer() {
  const navigate = useNavigate();
  const q = useWorkoutCatalog();
  const [tab, setTab] = useState<QuarterKey>("os_q1");
  const [search, setSearch] = useState("");

  const movements = q.data ?? [];

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of QUARTER_TABS) {
      c[t.key] = movements.filter((m) => isMovementInQuarter(m, t.key)).length;
    }
    return c;
  }, [movements]);

  const philosophies = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of movements) {
      const p = m.source_philosophy || "Unattributed";
      map.set(p, (map.get(p) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [movements]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="mt-2 text-2xl font-bold">Workout Library</h1>
            <p className="text-sm text-muted-foreground">
              Every movement the daily engine can prescribe, sliced by season quarter.
              Total in catalog: <span className="font-medium">{movements.length}</span>.
            </p>
          </div>
        </div>

        {/* Philosophies pill row */}
        <Card className="p-3">
          <div className="flex flex-wrap gap-2">
            {philosophies.map(([p, n]) => (
              <Badge key={p} variant="secondary" className="text-xs">
                {p} · {n}
              </Badge>
            ))}
          </div>
        </Card>

        <Input
          placeholder="Search name, philosophy, adaptation, cue…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Tabs value={tab} onValueChange={(v) => setTab(v as QuarterKey)}>
          <TabsList className="flex w-full flex-wrap gap-1">
            {QUARTER_TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="text-xs">
                {t.label} · {counts[t.key] ?? 0}
              </TabsTrigger>
            ))}
          </TabsList>

          {QUARTER_TABS.map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-4">
              {q.isLoading ? (
                <Card className="p-6 text-sm text-muted-foreground">Loading catalog…</Card>
              ) : q.isError ? (
                <Card className="p-6 text-sm text-destructive">
                  Couldn't load the catalog. Try again in a moment.
                </Card>
              ) : (
                <QuarterView quarter={t.key} movements={movements} search={search} />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
