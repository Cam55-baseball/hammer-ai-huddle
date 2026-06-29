/**
 * Wave 5 — Bulk JSON import dialog for the owner Game IQ Library.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Upload } from "lucide-react";
import {
  validateBulkEntry,
  importSituations,
  type BulkSituationInput,
  type BulkValidationResult,
} from "@/lib/iq/authoring/bulkImport";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

const EXAMPLE = `[
  {
    "sport": "both",
    "slug": "example-cutoff",
    "title": "Example: single to RF, runner on 1B",
    "summary": "Two-cut relay setup.",
    "lens_tags": ["defense"],
    "difficulty": "core",
    "sources": [{ "label": "Polk, The Baseball Handbook" }],
    "actors": [
      { "role": "RF", "assignment": "ball", "coaching_note": "field clean, crow-hop" },
      { "role": "1B", "assignment": "bag", "coaching_note": "cover the bag" },
      { "role": "2B", "assignment": "bag", "coaching_note": "cover 2B" },
      { "role": "SS", "assignment": "backup", "coaching_note": "trail 2B" },
      { "role": "3B", "assignment": "bag", "coaching_note": "cover 3B" },
      { "role": "P", "assignment": "backup", "coaching_note": "back up 3B or home" }
    ],
    "variants": [
      { "label": "0 outs", "outs": 0 },
      { "label": "2 outs", "outs": 2 }
    ]
  }
]`;

export function BulkImportDialog({ open, onClose, onImported }: Props) {
  const [json, setJson] = useState(EXAMPLE);
  const [reports, setReports] = useState<BulkValidationResult[] | null>(null);
  const [parsed, setParsed] = useState<BulkSituationInput[] | null>(null);
  const [importing, setImporting] = useState(false);

  const validate = () => {
    setReports(null);
    setParsed(null);
    let entries: unknown;
    try {
      entries = JSON.parse(json);
    } catch (e) {
      toast({
        title: "Invalid JSON",
        description: e instanceof Error ? e.message : "Parse error",
        variant: "destructive",
      });
      return;
    }
    if (!Array.isArray(entries)) {
      toast({ title: "Expected an array", variant: "destructive" });
      return;
    }
    const rs = entries.map((e, i) => validateBulkEntry(e, i));
    setReports(rs);
    setParsed(entries as BulkSituationInput[]);
  };

  const allOk = reports?.every((r) => r.ok) ?? false;

  const runImport = async () => {
    if (!parsed) return;
    setImporting(true);
    try {
      const summary = await importSituations(parsed);
      toast({
        title: `Imported ${summary.inserted} draft(s)`,
        description: summary.failed.length
          ? `Failed: ${summary.failed.map((f) => f.slug).join(", ")}`
          : "All entries inserted as drafts.",
      });
      onImported();
      onClose();
    } catch (e) {
      toast({
        title: "Import failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Bulk import situations
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Paste a JSON array. Entries are inserted as <strong>drafts</strong> only — publish individually after review.
        </p>
        <Textarea
          rows={14}
          value={json}
          onChange={(e) => setJson(e.target.value)}
          className="font-mono text-xs"
        />
        {reports && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {reports.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                {r.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <div>
                    <Badge variant={r.ok ? "default" : "destructive"} className="text-[10px]">
                      #{i + 1} {r.ok ? "ok" : "blocked"}
                    </Badge>
                  </div>
                  {r.errors.map((e, j) => (
                    <div key={j} className="text-destructive">{e}</div>
                  ))}
                  {r.warnings.map((w, j) => (
                    <div key={j} className="text-amber-600">{w}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={importing}>Cancel</Button>
          <Button variant="secondary" onClick={validate} disabled={importing}>Validate</Button>
          <Button onClick={runImport} disabled={!allOk || importing || !parsed}>
            {importing ? "Importing…" : `Import ${parsed?.length ?? 0} as drafts`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
