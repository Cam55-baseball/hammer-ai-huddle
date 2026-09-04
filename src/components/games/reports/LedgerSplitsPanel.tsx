/**
 * LedgerSplitsPanel — deterministic splits read straight from the gp_v_* views.
 *
 * No LLM touches any number here. Every row carries its sample size and
 * suppresses itself below the threshold (see SplitTable).
 */
import { useMemo } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import {
  useHittingByPitchType,
  useHittingByCount,
  useHittingByZone,
  useHittingByPitcherHand,
  useHittingByVeloBand,
  useContactQuality,
  useHittingRisp,
  useHomeToFirst,
  usePlateDiscipline,
  useDefenseByPosition,
  useBaserunningSplits,
} from "@/hooks/useGameSplits";
import {
  MIN_N,
  MIN_MEASURE_N,
  hasEnough,
  rate,
  fmtAvg,
  fmtPct,
  fmtNum,
  type HittingSplitRow,
} from "@/lib/games/reader";
import { SplitTable, NotEnoughData, SampleBadge, type SplitRowData } from "./SplitTable";

function hittingRows(rows: HittingSplitRow[] | undefined): SplitRowData[] {
  return (rows ?? []).map((r) => ({
    key: r.split_value,
    label: r.split_value,
    n: Number(r.n ?? 0),
    cells: [
      { label: "AVG", value: fmtAvg(rate(r.hits, r.at_bats)) },
      { label: "SLG", value: fmtAvg(rate(r.total_bases, r.at_bats)) },
      { label: "K%", value: fmtPct(rate(r.strikeouts, r.n)) },
      { label: "Hard%", value: fmtPct(rate(r.hard_contact, r.n)) },
    ],
  }));
}

export function LedgerSplitsPanel({ sport }: { sport?: string | null }) {
  const pitchType = useHittingByPitchType(sport);
  const count = useHittingByCount(sport);
  const zone = useHittingByZone(sport);
  const hand = useHittingByPitcherHand(sport);
  const velo = useHittingByVeloBand(sport);
  const contact = useContactQuality(sport);
  const risp = useHittingRisp(sport);
  const h1 = useHomeToFirst(sport);
  const disc = usePlateDiscipline(sport);
  const def = useDefenseByPosition(sport);
  const run = useBaserunningSplits(sport);

  const contactRows = useMemo<SplitRowData[]>(() => {
    const rows = contact.data ?? [];
    const total = rows.reduce((s, r) => s + Number(r.n ?? 0), 0);
    return rows.map((r) => ({
      key: r.split_value,
      label: r.split_value,
      n: Number(r.n ?? 0),
      cells: [{ label: "Share", value: fmtPct(rate(Number(r.n), total), 1) }],
    }));
  }, [contact.data]);

  const discRows = useMemo<SplitRowData[]>(
    () =>
      (disc.data ?? []).map((r) => ({
        key: `${r.perspective ?? "unspecified"}`,
        label: r.perspective ? `As ${r.perspective}` : "Perspective not recorded",
        n: Number(r.n ?? 0),
        cells: [
          { label: "Swing%", value: fmtPct(rate(r.swings, r.n)) },
          { label: "Whiff%", value: fmtPct(rate(r.whiffs, r.swings)) },
          { label: "Chase%", value: fmtPct(rate(r.chases, r.out_of_zone_pitches)) },
          { label: "Z-Swing%", value: fmtPct(rate(r.in_zone_swings, r.in_zone_pitches)) },
        ],
      })),
    [disc.data],
  );

  const defRows = useMemo<SplitRowData[]>(
    () =>
      (def.data ?? []).map((r) => ({
        key: r.split_value,
        label: r.split_value,
        n: Number(r.n ?? 0),
        cells: [
          { label: "Clean%", value: fmtPct(rate(Number(r.n) - Number(r.errors ?? 0), r.n)) },
          { label: "PO", value: String(r.putouts ?? 0) },
          { label: "A", value: String(r.assists ?? 0) },
          {
            label: "Pop",
            value: hasEnough(r.pop_time_n, MIN_MEASURE_N) ? fmtNum(r.avg_pop_time_sec) : null,
          },
        ],
      })),
    [def.data],
  );

  const runRows = useMemo<SplitRowData[]>(
    () =>
      (run.data ?? []).map((r) => ({
        key: r.split_value,
        label: r.split_value,
        n: Number(r.n ?? 0),
        cells: [
          { label: "Success%", value: fmtPct(rate(r.successes, r.n)) },
          {
            label: "Run time",
            value: hasEnough(r.run_time_n, MIN_MEASURE_N) ? fmtNum(r.avg_run_time_sec) : null,
          },
        ],
      })),
    [run.data],
  );

  const loading =
    pitchType.isLoading || count.isLoading || zone.isLoading || disc.isLoading;

  const h1Row = (h1.data ?? [])[0];

  return (
    <div className="space-y-3">
      <Card className="p-3 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          These splits are computed in the database from your logged reps. Nothing is
          estimated or filled in. Every line shows its sample size, and anything under{" "}
          <span className="font-mono">{MIN_N}</span> reps stays hidden until you've logged
          enough for it to mean something.
        </p>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Reading your ledger…</p>}

      <Accordion type="multiple" className="space-y-2">
        <AccordionItem value="hitting" className="border rounded-lg px-3">
          <AccordionTrigger className="text-sm font-semibold">Hitting splits</AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            <SplitTable
              title="By pitch type"
              description="How you've done against each pitch you've actually logged."
              rows={hittingRows(pitchType.data)}
              emptyLabel="No at-bat has a pitch type recorded yet."
            />
            <SplitTable
              title="By count"
              rows={hittingRows(count.data)}
              emptyLabel="No at-bat has a count recorded yet."
            />
            <SplitTable
              title="By location zone"
              rows={hittingRows(zone.data)}
              emptyLabel="No at-bat has a pitch location recorded yet."
            />
            <SplitTable
              title="By pitcher hand"
              description="Uses the throwing hand on the pitcher's saved scouting profile."
              rows={hittingRows(hand.data)}
              emptyLabel="No at-bat is linked to a pitcher profile with a throwing hand yet."
            />
            <SplitTable
              title="By velocity band"
              rows={hittingRows(velo.data)}
              emptyLabel="No at-bat has a pitch velocity recorded yet."
            />
            <SplitTable
              title="Contact quality mix"
              rows={contactRows}
              emptyLabel="No at-bat has contact quality recorded yet."
            />
            <SplitTable
              title="Runners in scoring position"
              rows={hittingRows(risp.data)}
              emptyLabel="No at-bat has base runners recorded yet."
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="discipline" className="border rounded-lg px-3">
          <AccordionTrigger className="text-sm font-semibold">
            Plate discipline — chase and whiff
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <SplitTable
              title="Per pitch logged"
              description="Chase is a swing at a pitch logged outside the zone. Whiff is a swing and miss."
              rows={discRows}
              emptyLabel="No pitches logged yet."
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="speed" className="border rounded-lg px-3">
          <AccordionTrigger className="text-sm font-semibold">Home to first</AccordionTrigger>
          <AccordionContent className="pb-3">
            <Card className="p-4 space-y-2">
              {!h1Row || !hasEnough(Number(h1Row.n), MIN_MEASURE_N) ? (
                <NotEnoughData n={Number(h1Row?.n ?? 0)} min={MIN_MEASURE_N} />
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <SampleBadge n={Number(h1Row.n)} />
                  <span className="text-xs">
                    <span className="text-muted-foreground">Average </span>
                    <span className="font-mono font-medium">{fmtNum(h1Row.avg_sec)}s</span>
                  </span>
                  <span className="text-xs">
                    <span className="text-muted-foreground">Best </span>
                    <span className="font-mono font-medium">{fmtNum(h1Row.best_sec)}s</span>
                  </span>
                </div>
              )}
            </Card>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="defense" className="border rounded-lg px-3">
          <AccordionTrigger className="text-sm font-semibold">Defense by position</AccordionTrigger>
          <AccordionContent className="pb-3">
            <SplitTable
              title="Plays by position"
              rows={defRows}
              emptyLabel="No defensive plays logged yet."
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="baserunning" className="border rounded-lg px-3">
          <AccordionTrigger className="text-sm font-semibold">Baserunning</AccordionTrigger>
          <AccordionContent className="pb-3">
            <SplitTable
              title="By event type"
              rows={runRows}
              emptyLabel="No baserunning events logged yet."
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
