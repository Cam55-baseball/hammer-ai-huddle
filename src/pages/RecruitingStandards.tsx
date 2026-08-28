/**
 * Recruiting standards console (pre-release, owner/admin only).
 *
 * Org side: build named standards + criteria, see live matches.
 * Athlete side: the standards you have matched.
 */
import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { BellRing, ClipboardList, Copy, Info, Lock, Plus, Save, Shield, Trash2, Users } from "lucide-react";
import {
  useMyStandardMatches,
  useOrgStandards,
  useStandardCriteria,
  useStandardsCriteriaMap,
} from "@/hooks/useOrgStandards";
import type { OrgStandard } from "@/hooks/useOrgStandards";
import { useSaveStandardMatches, useStandardMatchPreview } from "@/hooks/useStandardMatchPreview";
import {
  useDispatchStandardMatchPings,
  usePendingStandardPings,
} from "@/hooks/useStandardMatchPings";
import { StandardMatchNotificationList } from "@/components/recruiting/StandardMatchNotificationList";

import {
  ALL_FIELDS,
  GRADE_FIELDS,
  OPERATOR_LABELS,
  PROFILE_FIELDS,
  describeCriterion,
  fieldByKey,
  parseCriterionValue,
  standardPositionLabel,
  summarizeCriteria,
} from "@/lib/recruiting/standardFields";
import type { StandardOperator } from "@/lib/recruiting/standardsMatching";

function NewStandardForm({ onCreate, pending }: { onCreate: (v: { org_name: string; label: string; sport: string; active: boolean }) => void; pending: boolean }) {
  const [orgName, setOrgName] = useState("");
  const [label, setLabel] = useState("");
  const [sport, setSport] = useState("baseball");
  const [active, setActive] = useState(true);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Plus className="h-4 w-4" /> New standard
        </CardTitle>
        <CardDescription>Name the org and what you're looking for.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization</Label>
            <Input id="org-name" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="State U Baseball" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="std-label">Label</Label>
            <Input id="std-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="2027 RHP targets" />
          </div>
          <div className="space-y-2">
            <Label>Sport</Label>
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baseball">Baseball</SelectItem>
                <SelectItem value="softball">Softball</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch id="std-active" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="std-active">Active</Label>
          </div>
        </div>
        <Button
          disabled={pending || !orgName.trim() || !label.trim()}
          onClick={() => {
            onCreate({ org_name: orgName.trim(), label: label.trim(), sport, active });
            setOrgName("");
            setLabel("");
          }}
        >
          Create standard
        </Button>
      </CardContent>
    </Card>
  );
}

function CriteriaEditor({ standardId }: { standardId: string }) {
  const { criteria, addCriterion, deleteCriterion } = useStandardCriteria(standardId);
  const [field, setField] = useState<string>(PROFILE_FIELDS[0].key);
  const [operator, setOperator] = useState<StandardOperator>("eq");
  const [raw, setRaw] = useState("");

  const def = fieldByKey(field);
  const allowedOps = def?.operators ?? (["eq"] as const);

  const matches = useStandardMatchPreview(standardId, criteria.data);
  const saveMatches = useSaveStandardMatches(standardId);
  const pending = usePendingStandardPings(standardId);
  const dispatch = useDispatchStandardMatchPings();
  const pendingCount = pending.data?.length ?? 0;


  const handleAdd = () => {
    if (!def) return;
    const value = parseCriterionValue(raw, def.kind, operator);
    if (value === null) {
      toast.error("Enter a valid value for this field.");
      return;
    }
    addCriterion.mutate(
      { field, operator, value },
      {
        onSuccess: () => {
          setRaw("");
          toast.success("Criterion added");
        },
        onError: (e: unknown) => toast.error((e as Error).message),
      },
    );
  };

  const summary = summarizeCriteria(criteria.data ?? []);

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/40 px-3 py-2 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          This standard requires
        </p>
        <p className="text-sm font-medium">
          {summary || "Nothing yet — add a field below and the sheet builds here."}
        </p>
      </div>

      <p className="text-xs text-muted-foreground flex gap-2">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          There's no required minimum or maximum number of criteria — two fields or twenty,
          whatever this profile needs. Every one you add must pass for an athlete to match.
        </span>
      </p>

      <div className="space-y-2">
        {(criteria.data ?? []).map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span>{describeCriterion(c.field, c.operator, c.value)}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteCriterion.mutate(c.id)}
              aria-label="Delete criterion"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {criteria.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No criteria yet. A standard with no criteria matches nobody.
          </p>
        )}
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto] md:items-end">
        <div className="space-y-1">
          <Label className="text-xs">Field</Label>
          <Select
            value={field}
            onValueChange={(v) => {
              setField(v);
              const ops = fieldByKey(v)?.operators ?? [];
              if (!ops.includes(operator)) setOperator(ops[0] ?? "eq");
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Profile</SelectLabel>
                {PROFILE_FIELDS.map((f) => (
                  <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Official grades only</SelectLabel>
                {GRADE_FIELDS.map((f) => (
                  <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Operator</Label>
          <Select value={operator} onValueChange={(v) => setOperator(v as StandardOperator)}>
            <SelectTrigger className="min-w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {allowedOps.map((op) => (
                <SelectItem key={op} value={op}>{OPERATOR_LABELS[op]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Value</Label>
          <Input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={operator === "in" ? "comma, separated, values" : def?.hint ?? "value"}
          />
        </div>
        <Button onClick={handleAdd} disabled={addCriterion.isPending}>Add</Button>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Current matches
            {matches.data && <Badge variant="secondary">{matches.data.length}</Badge>}
          </h4>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!matches.data || saveMatches.isPending}
              onClick={() =>
                saveMatches.mutate((matches.data ?? []).map((m) => m.athlete_user_id), {
                  onSuccess: () => {
                    toast.success("Matches saved — athletes can see this signal");
                    pending.refetch();
                  },
                  onError: (e: unknown) => toast.error((e as Error).message),
                })
              }
            >
              <Save className="h-4 w-4 mr-1" /> Save matches
            </Button>
            <Button
              size="sm"
              disabled={dispatch.isPending || pendingCount === 0}
              onClick={() =>
                dispatch.mutate(undefined, {
                  onSuccess: (r) => {
                    toast.success(`Pinged ${r.org_pings} rep${r.org_pings === 1 ? "" : "s"} and ${r.athlete_pings} athlete${r.athlete_pings === 1 ? "" : "s"}`);
                    pending.refetch();
                  },
                  onError: (e: unknown) => toast.error((e as Error).message),
                })
              }
            >
              <BellRing className="h-4 w-4 mr-1" />
              {pendingCount > 0 ? `Send ${pendingCount} ping${pendingCount === 1 ? "" : "s"}` : "All pinged"}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Saving records the match. Sending pings notifies both sides once — the rep who owns
          the standard and the athlete who met it. Already-notified matches are skipped.
        </p>
        {!criteria.data?.length ? (
          <p className="text-sm text-muted-foreground">Add at least one criterion to evaluate athletes.</p>
        ) : matches.isLoading ? (
          <p className="text-sm text-muted-foreground">Evaluating athletes…</p>
        ) : matches.data?.length ? (
          <div className="space-y-1">
            {matches.data.map((m) => (
              <div key={m.athlete_user_id} className="rounded-md border px-3 py-2 text-sm flex items-center justify-between">
                <span>{m.full_name ?? m.athlete_user_id}</span>
                <Badge variant="outline">{m.passed.length} / {m.results.length} criteria</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No athletes match every criterion. Missing data counts as a fail, and self-reported grades never count.
          </p>
        )}
      </div>

    </div>
  );
}

function StandardCard({ standard }: { standard: OrgStandard }) {
  const { updateStandard, deleteStandard, duplicateStandard } = useOrgStandards();
  const [label, setLabel] = useState(standard.label);
  const [orgName, setOrgName] = useState(standard.org_name);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg">{standard.label}</CardTitle>
            <CardDescription>
              {standard.org_name} · {standard.sport}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={duplicateStandard.isPending}
              aria-label="Duplicate standard"
              onClick={() =>
                duplicateStandard.mutate(standard, {
                  onSuccess: (copy) =>
                    toast.success(`Copied to "${copy.label}" — rename it and tweak the criteria`),
                  onError: (e: unknown) => toast.error((e as Error).message),
                })
              }
            >
              <Copy className="h-4 w-4 mr-1" /> Duplicate
            </Button>
            <Switch
              checked={standard.active}
              onCheckedChange={(v) => updateStandard.mutate({ id: standard.id, active: v })}
              aria-label="Active"
            />
            <Button variant="ghost" size="icon" aria-label="Delete standard" onClick={() => deleteStandard.mutate(standard.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-1">
            <Label className="text-xs">Organization</Label>
            <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <Button
            variant="outline"
            disabled={label === standard.label && orgName === standard.org_name}
            onClick={() =>
              updateStandard.mutate(
                { id: standard.id, label: label.trim(), org_name: orgName.trim() },
                { onSuccess: () => toast.success("Standard updated") },
              )
            }
          >
            Save
          </Button>
        </div>
        <Separator />
        <CriteriaEditor standardId={standard.id} />
      </CardContent>
    </Card>
  );
}

const SPORT_LABELS: Record<string, string> = { baseball: "Baseball", softball: "Softball" };

/** Standards grouped by sport, then by the position each profile targets. */
function GroupedStandardsList({ standards }: { standards: OrgStandard[] }) {
  const ids = useMemo(() => standards.map((s) => s.id), [standards]);
  const criteriaMap = useStandardsCriteriaMap(ids);

  const groups = useMemo(() => {
    const map = criteriaMap.data ?? {};
    const buckets = new Map<string, { sport: string; position: string; items: OrgStandard[] }>();
    for (const s of standards) {
      const position = standardPositionLabel(map[s.id] ?? []);
      const key = `${s.sport}::${position}`;
      const bucket = buckets.get(key) ?? { sport: s.sport, position, items: [] };
      bucket.items.push(s);
      buckets.set(key, bucket);
    }
    return [...buckets.values()].sort(
      (a, b) => a.sport.localeCompare(b.sport) || a.position.localeCompare(b.position),
    );
  }, [standards, criteriaMap.data]);

  // One flat list reads better than a single decorated group.
  if (groups.length < 2) {
    return (
      <div className="space-y-6">
        {standards.map((s) => (
          <StandardCard key={s.id} standard={s} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={`${g.sport}-${g.position}`} className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {SPORT_LABELS[g.sport] ?? g.sport} · {g.position}
            </h3>
            <Badge variant="secondary">{g.items.length}</Badge>
            <Separator className="flex-1" />
          </div>
          <div className="space-y-6">
            {g.items.map((s) => (
              <StandardCard key={s.id} standard={s} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function AthleteMatchesTab() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <BellRing className="h-4 w-4" /> Notifications
        </h4>
        <StandardMatchNotificationList
          kind="standard_match_athlete"
          emptyText="No recruiting notifications yet. You'll be told which org, which standard, and when."
        />
      </div>
      <Separator />
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Standards matched</h4>
        <AthleteMatchesList />
      </div>
    </div>
  );
}

function AthleteMatchesList() {
  const { data, isLoading } = useMyStandardMatches();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data?.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No standards matched yet. When an organization's criteria are fully met by your
          official data, it shows up here.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {data.map((m) => (
        <Card key={m.id}>
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">{m.org_standards?.label ?? "Standard"}</p>
              <p className="text-sm text-muted-foreground">
                {m.org_standards?.org_name} · {m.org_standards?.sport}
              </p>
            </div>
            <Badge>Matched {new Date(m.matched_at).toLocaleDateString()}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function RecruitingStandards() {
  const { standards, createStandard } = useOrgStandards();
  const fieldCount = useMemo(() => ALL_FIELDS.length, []);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            Recruiting Standards
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Owner/admin only — pre-release. {fieldCount} matchable fields.
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="py-4 text-sm text-muted-foreground flex gap-2">
            <Lock className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Matching rules are fixed: every criterion must pass, missing data is a fail,
              and only coach-evaluated or CV-measured grades count. Self-reported data can
              never make an athlete match.
            </span>
          </CardContent>
        </Card>

        <Tabs defaultValue="org" className="space-y-6">
          <TabsList>
            <TabsTrigger value="org">Org standards</TabsTrigger>
            <TabsTrigger value="athlete">My matches</TabsTrigger>
          </TabsList>

          <TabsContent value="org" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BellRing className="h-4 w-4" /> Your match pings
                </CardTitle>
                <CardDescription>Athletes who met one of your standards.</CardDescription>
              </CardHeader>
              <CardContent>
                <StandardMatchNotificationList
                  kind="standard_match_org"
                  emptyText="No match pings yet. Save matches on a standard, then send pings."
                />
              </CardContent>
            </Card>
            <NewStandardForm

              pending={createStandard.isPending}
              onCreate={(v) =>
                createStandard.mutate(v, {
                  onSuccess: () => toast.success("Standard created"),
                  onError: (e: unknown) => toast.error((e as Error).message),
                })
              }
            />
            {standards.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading standards…</p>
            ) : standards.data?.length ? (
              <GroupedStandardsList standards={standards.data} />
            ) : (
              <p className="text-sm text-muted-foreground">No standards yet.</p>
            )}
          </TabsContent>

          <TabsContent value="athlete">
            <AthleteMatchesTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
