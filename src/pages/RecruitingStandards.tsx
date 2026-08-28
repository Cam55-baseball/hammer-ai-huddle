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
import { ClipboardList, Lock, Plus, Save, Shield, Trash2, Users } from "lucide-react";
import {
  useMyStandardMatches,
  useOrgStandards,
  useStandardCriteria,
} from "@/hooks/useOrgStandards";
import { useSaveStandardMatches, useStandardMatchPreview } from "@/hooks/useStandardMatchPreview";
import {
  ALL_FIELDS,
  GRADE_FIELDS,
  OPERATOR_LABELS,
  PROFILE_FIELDS,
  describeCriterion,
  fieldByKey,
  parseCriterionValue,
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

  return (
    <div className="space-y-4">
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
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Current matches
            {matches.data && <Badge variant="secondary">{matches.data.length}</Badge>}
          </h4>
          <Button
            size="sm"
            variant="outline"
            disabled={!matches.data || saveMatches.isPending}
            onClick={() =>
              saveMatches.mutate((matches.data ?? []).map((m) => m.athlete_user_id), {
                onSuccess: () => toast.success("Matches saved — athletes can see this signal"),
                onError: (e: unknown) => toast.error((e as Error).message),
              })
            }
          >
            <Save className="h-4 w-4 mr-1" /> Save matches
          </Button>
        </div>
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

function StandardCard({ standard }: { standard: ReturnType<typeof useOrgStandards>["standards"]["data"] extends (infer T)[] | undefined ? T : never }) {
  const { updateStandard, deleteStandard } = useOrgStandards();
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

function AthleteMatchesTab() {
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
              standards.data.map((s) => <StandardCard key={s.id} standard={s} />)
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
