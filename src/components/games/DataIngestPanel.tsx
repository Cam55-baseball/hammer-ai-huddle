/**
 * DataIngestPanel — Trackman / Rapsodo / HitTrax / GameChanger import.
 *
 * Flow: choose file (or paste) → deterministic local parse → review table
 * → Commit writes into the gp_* ledger, or Discard throws the buffer away.
 * Every attempt is recorded in gp_ingest_jobs so an import is auditable.
 */
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, ClipboardPaste, CheckCircle2, XCircle, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { gp } from "@/lib/games/ledger";
import {
  parseIngestText,
  SOURCE_LABELS,
  type IngestSource,
  type ParseResult,
  type ParsedPitch,
  type ParsedAtBat,
} from "@/lib/games/ingestParsers";

const SOURCES: IngestSource[] = ["trackman", "rapsodo", "hittrax", "gamechanger"];

export function DataIngestPanel({ gameId, sport }: { gameId: string; sport?: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [forced, setForced] = useState<IngestSource | "auto">("auto");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPaste, setShowPaste] = useState(false);

  const runParse = async (text: string, name: string | null) => {
    if (!user) return;
    setBusy(true);
    try {
      const parsed = parseIngestText(text, forced === "auto" ? undefined : forced);
      setResult(parsed);
      setFileName(name);
      const { data, error } = await gp("gp_ingest_jobs")
        .insert({
          user_id: user.id,
          game_id: gameId,
          source: name ? parsed.source : "manual_paste",
          sport: sport ?? null,
          file_name: name,
          raw_sample: text.slice(0, 4000),
          parsed: { rows: parsed.rows.slice(0, 500), headers: parsed.headers },
          parse_status: parsed.rows.length ? "parsed" : "failed",
          rows_detected: parsed.rows.length,
          error_message: parsed.warnings[0] ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      setJobId((data as any).id);
      if (!parsed.rows.length) toast.error(parsed.warnings[0] ?? "Nothing could be read from that file.");
      else toast.success(`${parsed.rows.length} rows read from ${SOURCE_LABELS[parsed.source]}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (f: File) => {
    if (f.size > 8_000_000) {
      toast.error("That file is over 8 MB — split it and import in parts.");
      return;
    }
    const text = await f.text();
    await runParse(text, f.name);
  };

  const commit = async () => {
    if (!result || !user) return;
    setBusy(true);
    try {
      const pitches = result.rows.filter((r): r is ParsedPitch => r.kind === "pitch");
      const atBats = result.rows.filter((r): r is ParsedAtBat => r.kind === "at_bat");
      let committed = 0;

      if (pitches.length) {
        const rows = pitches.map((p) => ({
          user_id: user.id,
          game_id: gameId,
          perspective: "hitter",
          inning: p.inning,
          pitch_no: p.pitch_no,
          pitch_type: p.pitch_type,
          pitch_velo: p.pitch_velo,
          pitch_movement: p.pitch_movement,
          location: p.location,
          result: p.result,
          pitcher_throws: p.pitcher_throws,
          batter_handedness: p.batter_handedness,
          count_balls: p.count_balls,
          count_strikes: p.count_strikes,
          opponent_hitter_name: p.opponent_hitter_name,
          notes: `Imported from ${SOURCE_LABELS[result.source]}`,
        }));
        for (let i = 0; i < rows.length; i += 200) {
          const { error } = await gp("gp_pitches").insert(rows.slice(i, i + 200));
          if (error) throw error;
          committed += Math.min(200, rows.length - i);
        }
      }

      if (atBats.length) {
        const rows = atBats.map((a) => ({
          user_id: user.id,
          game_id: gameId,
          inning: a.inning,
          result: a.result,
          exit_velo: a.exit_velo,
          launch_angle: a.launch_angle,
          exit_direction: a.exit_direction,
          contact_quality: a.contact_quality,
          pitch_type: a.pitch_type,
          pitch_velo: a.pitch_velo,
          notes: [a.notes, `Imported from ${SOURCE_LABELS[result.source]}`]
            .filter(Boolean)
            .join(" · "),
        }));
        for (let i = 0; i < rows.length; i += 200) {
          const { error } = await gp("gp_at_bats").insert(rows.slice(i, i + 200));
          if (error) throw error;
          committed += Math.min(200, rows.length - i);
        }
      }

      if (jobId) {
        await gp("gp_ingest_jobs")
          .update({ review_status: "committed", rows_committed: committed })
          .eq("id", jobId);
      }
      qc.invalidateQueries({ queryKey: ["gp-pitches"] });
      qc.invalidateQueries({ queryKey: ["gp-at-bats"] });
      qc.invalidateQueries({ queryKey: ["gp-report-individual"] });
      toast.success(`${committed} rows added to this game`);
      setResult(null);
      setJobId(null);
      setRawText("");
      setFileName(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save the imported rows");
    } finally {
      setBusy(false);
    }
  };

  const discard = async () => {
    if (jobId) await gp("gp_ingest_jobs").update({ review_status: "discarded" }).eq("id", jobId);
    setResult(null);
    setJobId(null);
    setRawText("");
    setFileName(null);
  };

  const preview = result?.rows.slice(0, 12) ?? [];

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Import tracked data</span>
        <div className="flex-1" />
        <Select value={forced} onValueChange={(v) => setForced(v as any)}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto-detect</SelectItem>
            {SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {SOURCE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        Drop in a Trackman, Rapsodo, HitTrax or GameChanger export (.csv). Nothing is saved until
        you review the rows and press Commit.
      </p>

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        <Button size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Upload className="mr-1 h-4 w-4" /> Choose file
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowPaste((v) => !v)}>
          <ClipboardPaste className="mr-1 h-4 w-4" /> Paste data
        </Button>
        {busy && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
      </div>

      {showPaste && (
        <div className="space-y-2">
          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={5}
            placeholder="Paste rows here — first line must be the column headers"
            className="font-mono text-xs"
          />
          <Button
            size="sm"
            disabled={!rawText.trim() || busy}
            onClick={() => runParse(rawText, null)}
          >
            Read pasted data
          </Button>
        </div>
      )}

      {result && (
        <div className="space-y-3 rounded-md border p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">{SOURCE_LABELS[result.source]}</Badge>
            {fileName && <span className="text-xs text-muted-foreground">{fileName}</span>}
            <Badge variant="outline">{result.rows.length} rows ready</Badge>
            {result.skipped > 0 && (
              <Badge variant="outline" className="text-amber-600">
                {result.skipped} skipped
              </Badge>
            )}
          </div>

          {result.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-600">
              {w}
            </p>
          ))}

          {preview.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3">Type</th>
                    <th className="py-1 pr-3">Inn</th>
                    <th className="py-1 pr-3">Pitch</th>
                    <th className="py-1 pr-3">Velo</th>
                    <th className="py-1 pr-3">Zone</th>
                    <th className="py-1 pr-3">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-1 pr-3">{r.kind === "pitch" ? "Pitch" : "At-bat"}</td>
                      <td className="py-1 pr-3">{r.inning ?? "—"}</td>
                      <td className="py-1 pr-3">{r.pitch_type ?? "—"}</td>
                      <td className="py-1 pr-3">
                        {r.kind === "pitch"
                          ? (r.pitch_velo ?? "—")
                          : (r.exit_velo != null ? `${r.exit_velo} EV` : "—")}
                      </td>
                      <td className="py-1 pr-3">
                        {r.kind === "pitch"
                          ? (r.location?.zone ?? r.location?.outZone ?? "—")
                          : (r.launch_angle != null ? `${r.launch_angle}°` : "—")}
                      </td>
                      <td className="py-1 pr-3">{r.result ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.rows.length > preview.length && (
                <p className="pt-1 text-xs text-muted-foreground">
                  + {result.rows.length - preview.length} more rows
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" disabled={!result.rows.length || busy} onClick={commit}>
              <CheckCircle2 className="mr-1 h-4 w-4" /> Commit to game
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={discard}>
              <XCircle className="mr-1 h-4 w-4" /> Discard
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
