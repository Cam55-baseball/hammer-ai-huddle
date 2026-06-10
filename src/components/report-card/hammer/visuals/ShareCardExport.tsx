import { useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Share2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  /** Element to capture — usually the HammerReportCard wrapper. */
  targetRef: React.RefObject<HTMLElement>;
  athleteName?: string | null;
  fileLabel?: string;
}

/**
 * Export the rendered report card as a 9:16 PNG. Uses html-to-image so we
 * capture the exact visual the athlete sees (foil sweep + meters baked into
 * the snapshot). If `navigator.share` is available, the file is offered to
 * the native share sheet; otherwise it downloads.
 *
 * Replay-safe: this is a presentational export only — it never mutates
 * `ai_analysis.metrics` or any organism state.
 */
export function ShareCardExport({ targetRef, athleteName, fileLabel = "hammer-report-card" }: Props) {
  const [busy, setBusy] = useState(false);

  const capture = async (): Promise<{ file: File; dataUrl: string } | null> => {
    if (!targetRef.current) {
      toast.error("Nothing to capture yet");
      return null;
    }
    const node = targetRef.current;
    // Match a 9:16 export ratio by padding via a wrapper class the caller controls;
    // here we just capture the node at its rendered width with a comfortable scale.
    const dataUrl = await toPng(node, {
      pixelRatio: 2.5,
      cacheBust: true,
      backgroundColor: getComputedStyle(document.documentElement)
        .getPropertyValue("--background")
        ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue("--background")})`
        : "#0b0b12",
      style: { borderRadius: "24px" },
      filter: (n) => {
        // Strip the share button itself out of the snapshot.
        if (n instanceof HTMLElement && n.dataset.shareExportExclude === "true") return false;
        return true;
      },
    });
    const blob = await (await fetch(dataUrl)).blob();
    const stamp = new Date().toISOString().slice(0, 10);
    const file = new File([blob], `${fileLabel}-${stamp}.png`, { type: "image/png" });
    return { file, dataUrl };
  };

  const handleShare = async () => {
    setBusy(true);
    try {
      const result = await capture();
      if (!result) return;
      const { file, dataUrl } = result;

      // Try native share first (mobile, modern browsers).
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean; share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void> };
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({
          files: [file],
          title: "My Hammer Report Card",
          text: athleteName ? `${athleteName} — Hammer Report Card` : "Hammer Report Card",
        });
        return;
      }

      // Fallback: download.
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Report card saved to downloads");
    } catch (e: unknown) {
      // AbortError = user cancelled the native share sheet; don't toast.
      if ((e as { name?: string })?.name === "AbortError") return;
      console.error("[ShareCardExport]", e);
      toast.error("Could not export report card");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={handleShare}
      data-share-export-exclude="true"
      className="w-full justify-center text-xs"
    >
      {busy ? (
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
      ) : typeof navigator !== "undefined" && (navigator as Navigator & { canShare?: unknown }).canShare ? (
        <Share2 className="mr-2 h-3.5 w-3.5" />
      ) : (
        <Download className="mr-2 h-3.5 w-3.5" />
      )}
      {busy ? "Exporting…" : "Share / Download as image"}
    </Button>
  );
}
