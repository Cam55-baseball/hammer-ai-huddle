/**
 * Recruiting standards console (pre-release, owner/admin only).
 *
 * Org side: build named standards + criteria, see live matches.
 * Athlete side: the standards you have matched.
 *
 * Design: mirrors the analysis-results language — staggered reveal, tinted
 * surface cards, uppercase micro-labels, and rules stated as native chrome
 * rather than bolted-on paragraphs. Logic is unchanged from the prior version.
 */
import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { Textarea } from "@/components/ui/textarea";
import { RecruiterContactCard } from "@/components/recruiting/RecruiterContactCard";
import { RevealSection } from "@/components/analyze/RevealSection";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  BellRing,
  ChevronDown,
  ClipboardList,
  Copy,
  Info,
  Layers,
  Plus,
  Save,
  Shield,
  ShieldCheck,
  Target,
  Trash2,
  Star,
  Users,
  X,
} from "lucide-react";
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
  OPERATOR_LABELS,
  PROFILE_FIELDS,
  RECRUITING_ROLE_LABELS,
  describeCriterion,
  fieldByKey,
  gradeFieldsFor,
  parseCriterionValue,
  positionOptionsFor,
  standardPositionLabel,
  summarizeCriteria,
  type RecruitingRole,
} from "@/lib/recruiting/standardFields";
import type {
  PositionMatchLogic,
  StandardContext,
  StandardOperator,
} from "@/lib/recruiting/standardsMatching";

const SPORT_LABELS: Record<string, string> = { baseball: "Baseball", softball: "Softball" };

/* ------------------------------------------------------------------ */
/* Shared presentation atoms                                           */
/* ------------------------------------------------------------------ */

function MicroLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

function RulePill({ icon: Icon, children }: { icon: typeof Shield; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="text-xs leading-snug text-muted-foreground">{children}</span>
    </div>
  );
}

/**
 * Role + position targeting. Shared by the create form and the edit panel so
 * both express the same idea: who this profile is for, and where they play.
 */
function RoleAndPositions({
  sport,
  role,
  onRoleChange,
  positions,
  onPositionsChange,
  logic,
  onLogicChange,
}: {
  sport: string;
  role: RecruitingRole;
  onRoleChange: (v: RecruitingRole) => void;
  positions: string[];
  onPositionsChange: (v: string[]) => void;
  logic: PositionMatchLogic;
  onLogicChange: (v: PositionMatchLogic) => void;
}) {
  const options = positionOptionsFor(sport);
  const toggle = (pos: string) =>
    onPositionsChange(
      positions.includes(pos) ? positions.filter((p) => p !== pos) : [...positions, pos],
    );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Recruiting role</Label>
        <Select value={role} onValueChange={(v) => onRoleChange(v as RecruitingRole)}>
          <SelectTrigger className="bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(RECRUITING_ROLE_LABELS) as RecruitingRole[]).map((r) => (
              <SelectItem key={r} value={r}>
                {RECRUITING_ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Decides which scouting tools you can require. Two-way offers both sets.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Positions</Label>
          {positions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onPositionsChange([])}
            >
              Any position
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {options.map((pos) => {
            const on = positions.includes(pos);
            return (
              <button
                key={pos}
                type="button"
                onClick={() => toggle(pos)}
                aria-pressed={on}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50",
                )}
              >
                {pos}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {positions.length === 0
            ? "No positions selected — this standard considers every athlete, and defense/arm grades read from their primary position."
            : "Defense and arm criteria are graded at these positions specifically, not at the athlete's primary spot."}
        </p>
      </div>

      {positions.length > 1 && (
        <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
          <Label className="text-xs">When several positions are selected</Label>
          <Select value={logic} onValueChange={(v) => onLogicChange(v as PositionMatchLogic)}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">
                Any one of them — athlete plays at least one
              </SelectItem>
              <SelectItem value="all">
                All of them — athlete plays every one
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {logic === "any"
              ? "A defense requirement passes if it clears the bar at one selected position."
              : "A defense requirement must clear the bar at every selected position."}
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

function NewStandardForm({
  onCreate,
  pending,
  open,
  onOpenChange,
}: {
  onCreate: (v: { org_name: string; label: string; sport: string; active: boolean }) => void;
  pending: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [orgName, setOrgName] = useState("");
  const [label, setLabel] = useState("");
  const [sport, setSport] = useState("baseball");
  const [active, setActive] = useState(true);

  if (!open) return null;

  return (
    <Card className="border-2 border-primary/30 bg-primary/[0.03]">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <MicroLabel>New standard</MicroLabel>
            <h2 className="text-lg font-semibold">Who are you looking for?</h2>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="flex gap-2 text-sm text-muted-foreground">
          <Layers className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            One standard per profile you're actually recruiting — "RHP — Power Arm" and
            "RHP — Command" can live side by side. There's no limit, and an existing
            standard can be duplicated instead of rebuilt.
          </span>
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization</Label>
            <Input
              id="org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="State U Baseball"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="std-label">Label</Label>
            <Input
              id="std-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="2027 RHP targets"
            />
          </div>
          <div className="space-y-2">
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

/* ------------------------------------------------------------------ */
/* Criteria                                                            */
/* ------------------------------------------------------------------ */

function CriteriaEditor({ standardId }: { standardId: string }) {
  const { criteria, addCriterion, deleteCriterion } = useStandardCriteria(standardId);
  const [field, setField] = useState<string>(PROFILE_FIELDS[0].key);
  const [operator, setOperator] = useState<StandardOperator>("eq");
  const [raw, setRaw] = useState("");
  const [pingMessage, setPingMessage] = useState("");

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

  const list = criteria.data ?? [];
  const summary = summarizeCriteria(list);

  return (
    <div className="space-y-6">
      {/* Reads as a sentence, not a form dump. */}
      <div className="rounded-xl border-2 border-primary/25 bg-primary/[0.04] p-4">
        <MicroLabel>An athlete matches when</MicroLabel>
        <p className="mt-1.5 text-base font-medium leading-relaxed">
          {summary || "…nothing yet. Add a field below and this sentence writes itself."}
        </p>
      </div>

      {/* Criteria as readable rows */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MicroLabel>Criteria</MicroLabel>
          {list.length > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {list.length}
            </Badge>
          )}
        </div>

        {list.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-6 text-center">
            <p className="text-sm font-medium">No criteria yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              A standard with no criteria matches nobody. Add only what actually matters —
              two fields or twenty, there's no minimum.
            </p>
          </div>
        ) : (
          <ol className="space-y-2">
            {list.map((c, i) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                    {i + 1}
                  </span>
                  <span className="truncate text-sm">
                    {describeCriterion(c.field, c.operator, c.value)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => deleteCriterion.mutate(c.id)}
                  aria-label="Delete criterion"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Add row */}
      <div className="rounded-lg border bg-muted/30 p-3">
        <MicroLabel className="mb-2">Add a requirement</MicroLabel>
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
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Profile</SelectLabel>
                  {PROFILE_FIELDS.map((f) => (
                    <SelectItem key={f.key} value={f.key}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Official grades only</SelectLabel>
                  {GRADE_FIELDS.map((f) => (
                    <SelectItem key={f.key} value={f.key}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Operator</Label>
            <Select value={operator} onValueChange={(v) => setOperator(v as StandardOperator)}>
              <SelectTrigger className="min-w-[120px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedOps.map((op) => (
                  <SelectItem key={op} value={op}>
                    {OPERATOR_LABELS[op]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Value</Label>
            <Input
              className="bg-background"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={operator === "in" ? "comma, separated, values" : def?.hint ?? "value"}
            />
          </div>
          <Button onClick={handleAdd} disabled={addCriterion.isPending}>
            Add
          </Button>
        </div>
      </div>

      <Separator />

      {/* Matches */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <MicroLabel className="text-foreground">Current matches</MicroLabel>
            {matches.data && (
              <Badge variant="secondary" className="tabular-nums">
                {matches.data.length}
              </Badge>
            )}
          </div>
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
              <Save className="mr-1 h-4 w-4" /> Save matches
            </Button>
            <Button
              size="sm"
              disabled={dispatch.isPending || pendingCount === 0}
              onClick={() =>
                dispatch.mutate(pingMessage.trim() || undefined, {
                  onSuccess: (r) => {
                    toast.success(
                      `Pinged ${r.org_pings} rep${r.org_pings === 1 ? "" : "s"} and ${r.athlete_pings} athlete${r.athlete_pings === 1 ? "" : "s"} · ${r.emails_sent ?? 0} email${(r.emails_sent ?? 0) === 1 ? "" : "s"} sent`,
                    );
                    if (r.email_errors?.length) {
                      toast.error(
                        `${r.email_errors.length} email(s) failed to send — in-app pings still landed.`,
                      );
                    }
                    setPingMessage("");
                    pending.refetch();
                  },
                  onError: (e: unknown) => toast.error((e as Error).message),
                })
              }
            >
              <BellRing className="mr-1 h-4 w-4" />
              {pendingCount > 0
                ? `Send ${pendingCount} ping${pendingCount === 1 ? "" : "s"}`
                : "All pinged"}
            </Button>
          </div>
        </div>

        {!list.length ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Add at least one criterion to evaluate athletes.
          </p>
        ) : matches.isLoading ? (
          <p className="text-sm text-muted-foreground">Evaluating athletes…</p>
        ) : matches.data?.length ? (
          <div className="space-y-1.5">
            {matches.data.map((m) => (
              <div
                key={m.athlete_user_id}
                className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm"
              >
                <span className="truncate font-medium">{m.full_name ?? m.athlete_user_id}</span>
                <Badge variant="outline" className="shrink-0 tabular-nums">
                  {m.passed.length} / {m.results.length} criteria
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed px-4 py-6 text-center">
            <p className="text-sm font-medium">Nobody clears all {list.length} yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Missing data counts as a fail, and self-reported grades never count.
            </p>
          </div>
        )}

        <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
          <Label htmlFor={`ping-msg-${standardId}`} className="text-xs">
            Personal message (optional — goes out in the athlete's email)
          </Label>
          <Textarea
            id={`ping-msg-${standardId}`}
            className="bg-background"
            value={pingMessage}
            onChange={(e) => setPingMessage(e.target.value.slice(0, 1000))}
            rows={3}
            placeholder="Who you are, why you're reaching out, and what you'd like them to do next — e.g. 'I'm the recruiting coordinator at State U. We liked your camera-measured pop time. Reply here or call if you'd like to talk about our fall camp.'"
          />
          <p className="text-xs text-muted-foreground tabular-nums">
            {pingMessage.length}/1000 · A note makes follow-through far more likely than a bare
            notification. Your saved contact details are attached automatically.
          </p>
        </div>

        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs">
          <p className="flex items-center gap-1.5 font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            A ping only fires when every criterion is met — not most, not some.
          </p>
          <p className="mt-1 text-muted-foreground">
            Saving records the match. Sending pings notifies both sides once — the rep who owns
            the standard and the athlete who met it. Already-notified matches are skipped.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Standard card                                                       */
/* ------------------------------------------------------------------ */

function StandardCard({ standard }: { standard: OrgStandard }) {
  const { updateStandard, deleteStandard, duplicateStandard } = useOrgStandards();
  const { criteria } = useStandardCriteria(standard.id);
  const [label, setLabel] = useState(standard.label);
  const [orgName, setOrgName] = useState(standard.org_name);
  const [open, setOpen] = useState(false);

  const count = criteria.data?.length ?? 0;
  const summary = summarizeCriteria(criteria.data ?? []);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card
        className={cn(
          "overflow-hidden border-2 transition-colors",
          standard.active ? "border-primary/25" : "border-border opacity-80",
        )}
      >
        {/* Header — reads at a glance, closed by default */}
        <div className="flex items-start justify-between gap-4 p-5">
          <CollapsibleTrigger className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  standard.active ? "bg-primary" : "bg-muted-foreground/40",
                )}
                aria-hidden
              />
              <MicroLabel>
                {SPORT_LABELS[standard.sport] ?? standard.sport} · {standard.org_name}
              </MicroLabel>
            </div>
            <h3 className="mt-1 flex items-center gap-2 text-lg font-semibold">
              {standard.label}
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  open && "rotate-180",
                )}
              />
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {summary || "No criteria yet — this standard matches nobody."}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="tabular-nums">
                {count} criteri{count === 1 ? "on" : "a"}
              </Badge>
              {!standard.active && <Badge variant="outline">Paused</Badge>}
            </div>
          </CollapsibleTrigger>

          <div className="flex shrink-0 items-center gap-2">
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
              <Copy className="mr-1 h-4 w-4" /> Duplicate
            </Button>
            <Switch
              checked={standard.active}
              onCheckedChange={(v) => updateStandard.mutate({ id: standard.id, active: v })}
              aria-label="Active"
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete standard"
              onClick={() => deleteStandard.mutate(standard.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <CardContent className="space-y-5 border-t bg-muted/20 p-5 sm:p-6">
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div className="space-y-1">
                <Label className="text-xs">Organization</Label>
                <Input
                  className="bg-background"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input
                  className="bg-background"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
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
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/* ------------------------------------------------------------------ */
/* Lists                                                               */
/* ------------------------------------------------------------------ */

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
      <div className="space-y-4">
        {standards.map((s) => (
          <StandardCard key={s.id} standard={s} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={`${g.sport}-${g.position}`} className="space-y-3">
          <div className="flex items-center gap-2">
            <MicroLabel>
              {SPORT_LABELS[g.sport] ?? g.sport} · {g.position}
            </MicroLabel>
            <Badge variant="secondary" className="tabular-nums">
              {g.items.length}
            </Badge>
            <Separator className="flex-1" />
          </div>
          <div className="space-y-4">
            {g.items.map((s) => (
              <StandardCard key={s.id} standard={s} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function StandardsEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="border-2 border-dashed">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Target className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">No standards built yet</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          A standard is the profile you're actually recruiting — position, class year, and the
          measured tools that have to be there. Athletes only surface once they clear every
          line of it.
        </p>
        <p className="max-w-md text-xs text-muted-foreground">
          Build as many as you want. "RHP — Power Arm" and "RHP — Command" can live side by
          side, and any standard can be duplicated instead of rebuilt.
        </p>
        <Button className="mt-2" onClick={onCreate}>
          <Plus className="mr-1 h-4 w-4" /> Build your first standard
        </Button>
      </CardContent>
    </Card>
  );
}

function AthleteMatchesTab() {
  return (
    <div className="space-y-6">
      <RevealSection order={0} className="space-y-2">
        <div className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-primary" />
          <MicroLabel className="text-foreground">Notifications</MicroLabel>
        </div>
        <StandardMatchNotificationList
          kind="standard_match_athlete"
          emptyText="No recruiting notifications yet. You'll be told which org, which standard, and when."
        />
      </RevealSection>
      <RevealSection order={1} className="space-y-2">
        <MicroLabel className="text-foreground">Standards matched</MicroLabel>
        <AthleteMatchesList />
      </RevealSection>
    </div>
  );
}

function AthleteMatchesList() {
  const { data, isLoading } = useMyStandardMatches();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data?.length) {
    return (
      <Card className="border-dashed">
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
        <Card key={m.id} className="border-2 border-primary/20">
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div className="min-w-0">
              <p className="truncate font-semibold">{m.org_standards?.label ?? "Standard"}</p>
              <p className="truncate text-sm text-muted-foreground">
                {m.org_standards?.org_name} · {m.org_standards?.sport}
              </p>
            </div>
            <Badge className="shrink-0">
              Matched {new Date(m.matched_at).toLocaleDateString()}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function RecruitingStandards() {
  const { standards, createStandard } = useOrgStandards();
  const fieldCount = useMemo(() => ALL_FIELDS.length, []);
  const [creating, setCreating] = useState(false);

  const all = standards.data ?? [];
  const activeCount = all.filter((s) => s.active).length;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Hero */}
        <RevealSection order={0}>
          <Card className="overflow-hidden border-2 border-primary/25 bg-primary/[0.04]">
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <MicroLabel>Recruiting · owner &amp; admin only · pre-release</MicroLabel>
                  <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
                    <ClipboardList className="h-7 w-7 text-primary" />
                    Recruiting Standards
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Define the profile. The system finds who actually clears it.
                  </p>
                </div>
                <Button onClick={() => setCreating((v) => !v)}>
                  <Plus className="mr-1 h-4 w-4" /> New standard
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Standards", value: all.length },
                  { label: "Active", value: activeCount },
                  { label: "Matchable fields", value: fieldCount },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border bg-background/60 px-3 py-2.5">
                    <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                    <MicroLabel>{s.label}</MicroLabel>
                  </div>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <RulePill icon={ShieldCheck}>
                  <span className="font-medium text-foreground">Every criterion must pass.</span>{" "}
                  Partial matches never surface.
                </RulePill>
                <RulePill icon={Info}>
                  <span className="font-medium text-foreground">Missing data is a fail.</span>{" "}
                  Nothing is assumed in an athlete's favor.
                </RulePill>
                <RulePill icon={Shield}>
                  <span className="font-medium text-foreground">Official grades only.</span>{" "}
                  Coach-evaluated or CV-measured — never self-reported.
                </RulePill>
              </div>
            </CardContent>
          </Card>
        </RevealSection>

        <Tabs defaultValue="org" className="space-y-6">
          <TabsList>
            <TabsTrigger value="org">Org standards</TabsTrigger>
            <TabsTrigger value="athlete">My matches</TabsTrigger>
          </TabsList>

          <TabsContent value="org" className="space-y-6">
            <RevealSection order={1} className="space-y-2">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-primary" />
                <MicroLabel className="text-foreground">Your match pings</MicroLabel>
              </div>
              <StandardMatchNotificationList
                kind="standard_match_org"
                emptyText="No match pings yet. Save matches on a standard, then send pings."
              />
            </RevealSection>

            <RevealSection order={2}>
              <RecruiterContactCard nudge={!!all.length} />
            </RevealSection>

            <NewStandardForm
              open={creating}
              onOpenChange={setCreating}
              pending={createStandard.isPending}
              onCreate={(v) =>
                createStandard.mutate(v, {
                  onSuccess: () => {
                    toast.success("Standard created");
                    setCreating(false);
                  },
                  onError: (e: unknown) => toast.error((e as Error).message),
                })
              }
            />

            <RevealSection order={3}>
              {standards.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading standards…</p>
              ) : all.length ? (
                <GroupedStandardsList standards={all} />
              ) : (
                !creating && <StandardsEmptyState onCreate={() => setCreating(true)} />
              )}
            </RevealSection>
          </TabsContent>

          <TabsContent value="athlete">
            <AthleteMatchesTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
