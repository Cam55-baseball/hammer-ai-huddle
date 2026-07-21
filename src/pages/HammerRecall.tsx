import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCirclePlus, Send, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type Source = {
  source: string;
  id: string;
  date: string;
  text: string;
};

type UIMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
};

type Thread = {
  id: string;
  title: string;
  updated_at: string;
};

const QUICK_STARTS = [
  "What did I write when I was hitting well?",
  "Between 6/10/26 and 6/18/26 — how was I feeling?",
  "What have my sleep and CNS looked like the last 14 days?",
  "I feel off today. Help me reset.",
];

export default function HammerRecall() {
  const { user } = useAuthContext();
  const nav = useNavigate();
  const { threadId } = useParams();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const focusComposer = useCallback(() => {
    setTimeout(() => textareaRef.current?.focus(), 30);
  }, []);

  // Load threads
  const loadThreads = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("recall_threads")
      .select("id,title,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("[recall] threads", error);
      return;
    }
    setThreads(data || []);
  }, [user]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Load thread messages when threadId changes
  useEffect(() => {
    setMessages([]);
    if (!threadId || !user) return;
    let cancelled = false;
    (async () => {
      setLoadingMsgs(true);
      const { data, error } = await supabase
        .from("recall_messages")
        .select("id,role,parts,created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      setLoadingMsgs(false);
      if (cancelled) return;
      if (error) {
        console.error("[recall] messages", error);
        return;
      }
      const ui: UIMessage[] = (data || []).map((r: any) => {
        const first = Array.isArray(r.parts) ? r.parts[0] : null;
        return {
          id: r.id,
          role: r.role === "assistant" ? "assistant" : "user",
          text: first?.text ?? "",
          sources: first?.sources,
        };
      });
      setMessages(ui);
      focusComposer();
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId, user, focusComposer]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    focusComposer();
  }, [focusComposer]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      setSending(true);
      const optimisticId = `tmp-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: optimisticId, role: "user", text: trimmed },
      ]);
      setInput("");
      try {
        const { data, error } = await supabase.functions.invoke("hammer-recall", {
          body: { threadId, message: trimmed },
        });
        if (error) throw error;
        const newThreadId: string | undefined = data?.threadId;
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            text: data?.answer ?? "",
            sources: data?.sources ?? [],
          },
        ]);
        loadThreads();
        if (newThreadId && newThreadId !== threadId) {
          nav(`/hammer/recall/${newThreadId}`, { replace: true });
        }
      } catch (e) {
        console.error("[recall] send", e);
        toast.error("Couldn't reach Hammer. Try again in a moment.");
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setInput(trimmed);
      } finally {
        setSending(false);
        focusComposer();
      }
    },
    [sending, threadId, loadThreads, nav, focusComposer],
  );

  const startNew = useCallback(() => {
    nav("/hammer/recall");
    setMessages([]);
    focusComposer();
  }, [nav, focusComposer]);

  const empty = messages.length === 0 && !loadingMsgs;

  return (
    <div className="mx-auto flex h-[100dvh] max-w-6xl flex-col p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav("/today")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Today
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Ask Hammer — Recall & Clarity</h1>
          <p className="text-xs text-muted-foreground">
            Ask anything about your own notes, drills, journals, workouts, at-bats.
            Give a date range if you want a specific window.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={startNew}>
          <MessageCirclePlus className="mr-1 h-4 w-4" /> New
        </Button>
      </div>

      <div className="grid flex-1 min-h-0 gap-3 md:grid-cols-[220px_1fr]">
        {/* Thread list */}
        <Card className="hidden md:flex md:flex-col min-h-0">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Past conversations</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-y-auto p-2">
            {threads.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                No conversations yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {threads.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => nav(`/hammer/recall/${t.id}`)}
                      className={`w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted ${
                        t.id === threadId ? "bg-muted font-medium" : ""
                      }`}
                    >
                      <div className="line-clamp-2">{t.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(t.updated_at).toLocaleDateString()}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Conversation */}
        <Card className="flex min-h-0 flex-col">
          <CardContent className="flex flex-1 min-h-0 flex-col gap-3 p-3">
            <ScrollArea className="flex-1 min-h-0 pr-2">
              {empty ? (
                <div className="space-y-3 py-6">
                  <p className="text-sm text-muted-foreground">
                    Try one of these, or ask your own question:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_STARTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => send(q)}
                        className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs hover:bg-primary/10"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m) => (
                    <MessageBubble key={m.id} msg={m} />
                  ))}
                  {sending && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Recalling…
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}
            </ScrollArea>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2 border-t pt-2"
            >
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask about anything you've logged, or say how you're feeling…"
                rows={2}
                className="min-h-[52px] flex-1 resize-none"
                disabled={sending}
              />
              <Button
                type="submit"
                size="icon"
                disabled={sending || !input.trim()}
                aria-label="Send"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: UIMessage }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground whitespace-pre-wrap">
          {msg.text}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <div className="whitespace-pre-wrap text-sm">{msg.text || "…"}</div>
      </div>
      {msg.sources && msg.sources.length > 0 && (
        <details className="rounded-md border bg-muted/30 px-2 py-1 text-xs">
          <summary className="cursor-pointer select-none text-muted-foreground">
            Sources ({msg.sources.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {msg.sources.map((s, i) => (
              <li key={`${s.source}-${s.id}-${i}`} className="flex gap-2">
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {s.source} · {s.date}
                </Badge>
                <span className="text-muted-foreground line-clamp-2">{s.text}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
