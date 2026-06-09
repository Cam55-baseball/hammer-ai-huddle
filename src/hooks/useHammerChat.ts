/**
 * useHammerChat — single conversational hook backing every Hammer chat surface.
 *
 * Sprint: Coach Hammer Authority Consolidation (Section F).
 *
 * One identity. One in-memory conversation per athlete session. Backed by
 * `hammer-chat` edge function which composes athlete context + canonical
 * next step into the system prompt. Persistence to an ASB chat ledger
 * topic is the next iteration; for now the conversation lives in memory
 * to keep the surface unified without inventing new storage.
 */
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import { useHammerNextStep } from "@/hooks/useHammerNextStep";

export interface HammerChatMessage {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

export interface HammerCategoryFocusInput {
  readonly id: string;
  readonly name: string;
  readonly hierarchyRank: "non_negotiable" | "rank_1";
  readonly whyItMatters: string;
  readonly howToImprove: string;
}

export interface HammerChatOptions {
  readonly categoryFocus?: HammerCategoryFocusInput | null;
}

export interface HammerChatApi {
  readonly messages: ReadonlyArray<HammerChatMessage>;
  readonly isSending: boolean;
  readonly error: string | null;
  send(text: string): Promise<void>;
  reset(): void;
}

export function useHammerChat(options: HammerChatOptions = {}): HammerChatApi {
  const ctx = useHammerAthleteContext();
  const nextStep = useHammerNextStep();
  const [messages, setMessages] = useState<HammerChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categoryFocus = options.categoryFocus ?? null;

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const userMsg: HammerChatMessage = { role: "user", content: trimmed, ts: Date.now() };
      const history = [...messages, userMsg];
      setMessages(history);
      setIsSending(true);
      setError(null);
      try {
        const contextSnapshot = ctx.variables.map((v) => ({
          key: v.key,
          value: v.value,
          missing: v.missing,
          source: v.source,
        }));
        const { data, error: invokeError } = await supabase.functions.invoke("hammer-chat", {
          body: {
            messages: history.map((m) => ({ role: m.role, content: m.content })),
            context: { variables: contextSnapshot },
            nextStep: {
              tier: nextStep.tier,
              title: nextStep.title,
              why: nextStep.why,
              instruction: nextStep.instruction,
              route: nextStep.route,
              source: nextStep.source,
            },
            categoryFocus,
          },
        });
        if (invokeError) throw invokeError;
        const reply = (data?.reply as string | undefined) ?? "I'm here — say more.";
        setMessages((cur) => [...cur, { role: "assistant", content: reply, ts: Date.now() }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsSending(false);
      }
    },
    [messages, ctx, nextStep, categoryFocus],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isSending, error, send, reset };
}
