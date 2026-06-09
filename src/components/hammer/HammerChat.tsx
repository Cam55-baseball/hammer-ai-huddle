/**
 * HammerChat — unified Ask-Coach surface. One identity, one memory, one
 * conversational thread for the active session. Sprint: Section F.
 */
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useHammerChat } from "@/hooks/useHammerChat";
import { getHammerIdentity } from "@/lib/hammer/identity";

export interface HammerCategoryFocus {
  readonly id: string;
  readonly name: string;
  readonly hierarchyRank: "non_negotiable" | "rank_1";
  readonly whyItMatters: string;
  readonly howToImprove: string;
}

interface Props {
  readonly compact?: boolean;
  readonly categoryFocus?: HammerCategoryFocus | null;
}

export function HammerChat({ compact = false, categoryFocus = null }: Props) {
  const identity = getHammerIdentity();
  const chat = useHammerChat({ categoryFocus });
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat.messages.length]);

  const submit = async () => {
    if (!draft.trim() || chat.isSending) return;
    const t = draft;
    setDraft("");
    await chat.send(t);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Ask {identity.voiceLabel}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div
          ref={scrollRef}
          className={`space-y-2 overflow-y-auto rounded-md border bg-muted/20 p-2 ${
            compact ? "max-h-40" : "max-h-72"
          }`}
        >
          {chat.messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Ask me about today, your plan, or anything you're stuck on.
            </p>
          ) : (
            chat.messages.map((m, i) => (
              <div
                key={i}
                className={`text-xs whitespace-pre-wrap rounded px-2 py-1 ${
                  m.role === "user"
                    ? "bg-primary/10 ml-6"
                    : "bg-card mr-6 border border-border/50"
                }`}
              >
                {m.content}
              </div>
            ))
          )}
          {chat.isSending && (
            <p className="text-[10px] text-muted-foreground italic">Hammer is thinking…</p>
          )}
        </div>
        {chat.error && <p className="text-[10px] text-destructive">{chat.error}</p>}
        <div className="flex gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Ask ${identity.voiceLabel}…`}
            rows={compact ? 1 : 2}
            className="text-xs resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <Button size="sm" onClick={submit} disabled={chat.isSending || !draft.trim()}>
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
