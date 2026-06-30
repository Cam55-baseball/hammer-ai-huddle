/**
 * SeasonScheduleImporterDialog — paste text OR upload a photo of a season /
 * month / week schedule. Hammer AI parses it into structured events; the
 * athlete reviews, edits, and confirms before anything lands on the calendar.
 *
 * Subordinate to existing scheduling tables. No organism-truth authorship —
 * parsed events are athlete-approved data only.
 */
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ImagePlus, Wand2, Trash2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useImportScheduleEvents, undoScheduleImport, type ParsedScheduleEvent } from "@/hooks/useImportScheduleEvents";
import { noteProtectedEditing, clearProtectedEditing } from "@/lib/auth/protectedEditing";
import { logPasteImportPhase, watchAuthDuringPasteImport } from "@/lib/auth/authTelemetry";
import { readDraftSlot, writeDraftSlot, clearDraftSlot } from "@/lib/onboarding/draftStore";
import { useOptionalAuth } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_IMAGE_EDGE = 1600;
const JPEG_QUALITY = 0.85;

async function downscaleImage(file: File): Promise<{ base64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) throw new Error("Image encode failed");
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return { base64: btoa(bin), mimeType: "image/jpeg" };
}

export function SeasonScheduleImporterDialog({ open, onOpenChange }: Props) {
  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [events, setEvents] = useState<ParsedScheduleEvent[]>([]);
  const [keepRow, setKeepRow] = useState<boolean[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportScheduleEvents();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user } = useOptionalAuth();

  // Hydrate pasted text from draft on open so user resumes safely.
  useEffect(() => {
    if (!open || !user?.id) return;
    readDraftSlot<{ text?: string }>(user.id, "schedule-importer").then((d) => {
      if (d?.text && !text) setText(d.text);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  // Debounced draft autosave while typing.
  useEffect(() => {
    if (!open || !user?.id) return;
    writeDraftSlot(user.id, "schedule-importer", { text });
  }, [open, user?.id, text]);


  function startPasteHeartbeat() {
    if (heartbeatRef.current) return;
    noteProtectedEditing(60_000);
    heartbeatRef.current = setInterval(() => {
      noteProtectedEditing(60_000);
    }, 1000);
  }
  function stopPasteHeartbeat() {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }

  // Auth listener + lifecycle telemetry, only while dialog is open.
  useEffect(() => {
    if (!open) return;
    void logPasteImportPhase({ phase: "dialog-open" });
    const unsub = watchAuthDuringPasteImport();
    return () => {
      unsub();
      stopPasteHeartbeat();
      void logPasteImportPhase({ phase: "dialog-close" });
    };
  }, [open]);

  function reset() {
    setText("");
    setImageFile(null);
    setImagePreview(null);
    setEvents([]);
    setKeepRow([]);
    setParsing(false);
  }

  function handleClose(o: boolean) {
    if (!o) {
      clearProtectedEditing();
      reset();
    }
    onOpenChange(o);
  }

  async function handlePickFile(file: File | null) {
    if (!file) return;
    noteProtectedEditing();
    if (file.size > 12 * 1024 * 1024) {
      toast.error("Image too large (max 12 MB)");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleAnalyze() {
    noteProtectedEditing(60_000);
    setParsing(true);
    setEvents([]);
    const timeoutMs = 45_000;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("Hammer AI didn't respond in time — please try again.")),
        timeoutMs,
      );
    });
    try {
      void logPasteImportPhase({ phase: "analyze-start", detail: { mode } });
      const todayISO = new Date().toISOString().slice(0, 10);
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { data: sessionCheck } = await supabase.auth.getSession();
      if (!sessionCheck.session?.user) {
        void logPasteImportPhase({ phase: "analyze-no-session" });
        toast.error("No active sign-in. Stay here — try Analyze again in a moment.", { duration: 6000 });
        throw new Error("Your sign-in is reconnecting. Keep this open and try Analyze again in a moment.");
      }
      let payload: Record<string, unknown>;
      if (mode === "text") {
        if (text.trim().length < 3) {
          toast.error("Add a few lines of schedule text first.");
          noteProtectedEditing();
          return;
        }
        payload = { mode: "text", text, todayISO, timezone };
      } else {
        if (!imageFile) {
          toast.error("Choose a schedule photo first.");
          noteProtectedEditing();
          return;
        }
        const { base64, mimeType } = await downscaleImage(imageFile);
        payload = { mode: "image", imageBase64: base64, mimeType, todayISO, timezone };
      }
      const invokePromise = supabase.functions.invoke("parse-season-schedule", {
        body: payload,
        headers: { Authorization: `Bearer ${sessionCheck.session.access_token}` },
      });
      const { data, error } = (await Promise.race([invokePromise, timeoutPromise])) as Awaited<typeof invokePromise>;
      if (error) {
        console.error("[SeasonScheduleImporter] invoke error", { mode, error });
        throw new Error(error.message || "Hammer AI request failed");
      }
      if (data?.error) {
        console.error("[SeasonScheduleImporter] gateway error", data);
        throw new Error(String(data.error));
      }
      const parsed = (data?.events ?? []) as ParsedScheduleEvent[];
      if (!parsed.length) {
        toast.warning("Hammer couldn't find any events. Try cleaner text or a sharper photo.");
        return;
      }
      setEvents(parsed);
      setKeepRow(parsed.map(() => true));
      void logPasteImportPhase({ phase: "analyze-success", detail: { count: parsed.length } });
      toast.success(`Found ${parsed.length} event${parsed.length === 1 ? "" : "s"}. Review and confirm below.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Parse failed";
      console.error("[SeasonScheduleImporter] failed", { mode, msg });
      void logPasteImportPhase({ phase: "analyze-failure", detail: { msg } });
      toast.error(msg);
    } finally {
      if (timer) clearTimeout(timer);
      setParsing(false);
      noteProtectedEditing();
    }
  }

  async function handleConfirm() {
    noteProtectedEditing(60_000);
    const selected = events.filter((_, i) => keepRow[i]);
    let closedAfterSave = false;
    if (!selected.length) {
      toast.error("Pick at least one event to add.");
      return;
    }
    try {
      const summary = await importMutation.mutateAsync(selected);
      if (summary.inserted > 0) {
        const undoDeadline = Date.now() + 24 * 60 * 60 * 1000;
        toast.success(
          `Added ${summary.inserted} event${summary.inserted === 1 ? "" : "s"} to your calendar.` +
            (summary.skipped > 0 ? ` (${summary.skipped} duplicate${summary.skipped === 1 ? "" : "s"} skipped.)` : ""),
          {
            duration: 12_000,
            action: {
              label: "Undo",
              onClick: async () => {
                if (Date.now() > undoDeadline) {
                  toast.error("Undo window expired (24h).");
                  return;
                }
                const res = await undoScheduleImport({
                  gameIds: summary.insertedGameIds,
                  sessionIds: summary.insertedSessionIds,
                });
                if (res.errors.length) toast.error(`Undo: ${res.errors[0]}`);
                else toast.success(`Removed ${res.removed} imported event${res.removed === 1 ? "" : "s"}.`);
              },
            },
          },
        );
      } else if (summary.skipped > 0) {
        toast.message(`All ${summary.skipped} event${summary.skipped === 1 ? "" : "s"} already on your calendar.`);
      }
      if (summary.failed > 0) {
        toast.error(`${summary.failed} couldn't be saved. ${summary.errors[0] ?? ""}`);
      }
      if (summary.failed === 0) {
        closedAfterSave = true;
        handleClose(false);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      if (closedAfterSave) {
        clearProtectedEditing();
      } else {
        noteProtectedEditing();
      }
    }
  }

  function updateEvent(i: number, patch: Partial<ParsedScheduleEvent>) {
    setEvents((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeRow(i: number) {
    setEvents((rows) => rows.filter((_, idx) => idx !== i));
    setKeepRow((k) => k.filter((_, idx) => idx !== i));
  }

  const confidenceTone: Record<string, string> = {
    high: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    low: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  };

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (next) noteProtectedEditing();
      if (!next) clearProtectedEditing();
      handleClose(next);
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import your season schedule</DialogTitle>
          <DialogDescription>
            Type out your games or upload a photo of a team schedule. Hammer reads it,
            you review every row, then it lands on your calendar so daily plans adjust.
          </DialogDescription>
        </DialogHeader>

        {events.length === 0 ? (
          <Tabs value={mode} onValueChange={(v) => setMode(v as "text" | "image")} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="text">Paste text</TabsTrigger>
              <TabsTrigger value="image">Upload photo</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-2 mt-3" data-protected-editing="true">
              <Label htmlFor="schedule-text" className="text-xs text-muted-foreground">
                One game/practice/tournament per line works best.
              </Label>
              <div data-protected-editing="true">
                <Textarea
                  id="schedule-text"
                  data-protected-editing="true"
                  rows={10}
                  value={text}
                  onFocus={() => {
                    startPasteHeartbeat();
                    void logPasteImportPhase({ phase: "paste-focus" });
                  }}
                  onBlur={() => {
                    stopPasteHeartbeat();
                    void logPasteImportPhase({ phase: "paste-blur" });
                  }}
                  onKeyDown={() => noteProtectedEditing(60_000)}
                  onInput={() => noteProtectedEditing(60_000)}
                  onPaste={() => {
                    noteProtectedEditing(60_000);
                    void logPasteImportPhase({ phase: "paste-event" });
                  }}
                  onCompositionStart={() => noteProtectedEditing(60_000)}
                  onCompositionUpdate={() => noteProtectedEditing(60_000)}
                  onCompositionEnd={() => noteProtectedEditing(60_000)}
                  onChange={(e) => {
                    noteProtectedEditing(60_000);
                    setText(e.target.value);
                  }}
                  placeholder={`April 1–4 “Final Bash” Tournament in Dunedin, FL\nApril 7–12 Game vs Madison in Wisconsin\nApril 15 Practice 4pm at field 2`}
                />
              </div>
            </TabsContent>

            <TabsContent value="image" className="space-y-3 mt-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePickFile(e.target.files?.[0] ?? null)}
              />
              <Button variant="outline" className="w-full gap-2" onClick={() => { noteProtectedEditing(); fileRef.current?.click(); }}>
                <ImagePlus className="h-4 w-4" />
                {imageFile ? "Replace photo" : "Choose schedule photo"}
              </Button>
              {imagePreview && (
                <div className="rounded-md overflow-hidden border bg-muted/30 max-h-72 flex items-center justify-center">
                  <img src={imagePreview} alt="Schedule preview" className="max-h-72 object-contain" />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Snap a printed schedule, team-app screenshot, or whiteboard. We downscale before sending.
              </p>
            </TabsContent>
          </Tabs>
        ) : (
          <ScrollArea className="flex-1 -mx-2 px-2">
            <div className="space-y-2">
              {events.map((ev, i) => (
                  <div key={i} className="border rounded-md p-3 space-y-2 bg-card" data-protected-editing="true">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="checkbox"
                      checked={keepRow[i] ?? true}
                      onChange={(e) => {
                        noteProtectedEditing();
                        setKeepRow((k) => k.map((v, idx) => (idx === i ? e.target.checked : v)));
                      }}
                      className="h-4 w-4"
                    />
                    <select
                      value={ev.kind}
                      onFocus={() => noteProtectedEditing()}
                      onChange={(e) => {
                        noteProtectedEditing();
                        updateEvent(i, { kind: e.target.value as ParsedScheduleEvent["kind"] });
                      }}
                      className="text-xs border rounded px-2 py-1 bg-background"
                    >
                      <option value="game">Game</option>
                      <option value="tournament_day">Tournament day</option>
                      <option value="practice">Practice</option>
                      <option value="travel">Travel</option>
                      <option value="other">Other</option>
                    </select>
                    <Badge variant="outline" className={`text-[10px] ${confidenceTone[ev.confidence] ?? ""}`}>
                      {ev.confidence}
                    </Badge>
                    <Button variant="ghost" size="sm" className="ml-auto h-7 px-2" onClick={() => removeRow(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">Date</Label>
                      <Input type="date" value={ev.start_date} onFocus={() => noteProtectedEditing()} onChange={(e) => { noteProtectedEditing(); updateEvent(i, { start_date: e.target.value, end_date: e.target.value }); }} className="h-8" />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">Time (optional)</Label>
                      <Input type="time" value={ev.time_local ?? ""} onFocus={() => noteProtectedEditing()} onChange={(e) => { noteProtectedEditing(); updateEvent(i, { time_local: e.target.value || null }); }} className="h-8" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[10px] uppercase text-muted-foreground">Title</Label>
                      <Input value={ev.title} onFocus={() => noteProtectedEditing()} onChange={(e) => { noteProtectedEditing(); updateEvent(i, { title: e.target.value }); }} className="h-8" />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">Opponent</Label>
                      <Input value={ev.opponent ?? ""} onFocus={() => noteProtectedEditing()} onChange={(e) => { noteProtectedEditing(); updateEvent(i, { opponent: e.target.value || null }); }} className="h-8" />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">Location</Label>
                      <Input value={ev.location ?? ""} onFocus={() => noteProtectedEditing()} onChange={(e) => { noteProtectedEditing(); updateEvent(i, { location: e.target.value || null }); }} className="h-8" />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic line-clamp-2">“{ev.source_snippet}”</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toast.success("Saved. Resume any time.");
              handleClose(false);
            }}
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Save & exit
          </Button>
          {events.length === 0 ? (
            <Button onClick={handleAnalyze} disabled={parsing} className="gap-2">
              {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Analyze with Hammer AI
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => { setEvents([]); setKeepRow([]); }}>
                Back
              </Button>
              <Button
                onClick={async () => {
                  await handleConfirm();
                  if (user?.id) clearDraftSlot(user.id, "schedule-importer");
                }}
                disabled={importMutation.isPending}
                className="gap-2"
              >
                {importMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Add {keepRow.filter(Boolean).length} to calendar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
