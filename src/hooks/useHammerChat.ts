/**
 * useHammerChat — single conversational hook backing every Hammer chat surface.
 *
 * Sprint: Coach Hammer Authority Consolidation (Section F).
 *
 * One identity. One in-memory conversation per athlete session. Backed by
 * `hammer-chat` edge function which composes athlete context + canonical
 * next step into the system prompt.
 *
 * INPUT INTEGRITY LAW (added after the equipment-drop failure):
 * when an athlete states their equipment in this chat, the statement is parsed
 * DETERMINISTICALLY on the client, written through `save_equipment_context`,
 * and re-read from the database before any confirmation is spoken. The model
 * is never the thing that claims a save happened. If the parse is uncertain,
 * Hammer shows what it understood and asks — it never says "got it" and
 * stores nothing.
 */
import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import { useHammerNextStep } from "@/hooks/useHammerNextStep";
import {
  fetchPersistentEquipment,
  plainEquipmentSaveError,
  writePersistentEquipment,
  writeSessionEquipment,
} from "@/lib/hammer/context/equipment";
import {
  equipmentList,
  isAffirmation,
  isRejection,
  mergeEquipment,
  parseEquipmentStatement,
  plainList,
  type ParsedEquipmentStatement,
} from "@/lib/hammer/context/equipmentVocabulary";

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
  /** True once a chat turn has written equipment to the athlete's profile. */
  readonly savedEquipment: boolean;
  send(text: string): Promise<void>;
  reset(): void;
}

export const CHAT_EQUIPMENT_SOURCE = "chat_self_report";

export function useHammerChat(options: HammerChatOptions = {}): HammerChatApi {
  const ctx = useHammerAthleteContext();
  // Heuristic step only — chat context must never trigger an AI generation.
  const nextStep = useHammerNextStep({ aiEnabled: false });
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<HammerChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedEquipment, setSavedEquipment] = useState(false);
  const pending = useRef<ParsedEquipmentStatement | null>(null);
  const categoryFocus = options.categoryFocus ?? null;

  const say = useCallback((content: string) => {
    setMessages((cur) => [...cur, { role: "assistant", content, ts: Date.now() }]);
  }, []);

  /**
   * Commit a parsed statement. Only a confirmed, re-read database row is
   * allowed to produce a confirmation message.
   */
  const commitEquipment = useCallback(
    async (parsed: ParsedEquipmentStatement) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id ?? null;
      if (!userId) {
        say("You're signed out, so I couldn't save that. Sign in and tell me again — nothing was stored.");
        return;
      }
      let existing: string[] = [];
      try {
        existing = await fetchPersistentEquipment(userId);
      } catch {
        existing = [];
      }
      const merged = mergeEquipment(existing, parsed);
      if (merged.length === 0) {
        say("That would leave your equipment list empty, so I didn't save it. Tell me at least one thing you can train with — even just open space.");
        return;
      }
      try {
        if (parsed.scope === "session") {
          await writeSessionEquipment(userId, merged, null, CHAT_EQUIPMENT_SOURCE);
        } else {
          await writePersistentEquipment(userId, merged, null, CHAT_EQUIPMENT_SOURCE);
        }
      } catch (e) {
        say(plainEquipmentSaveError(e as Error & { code?: string; details?: string }));
        return;
      }

      // Verify the row actually landed before speaking a confirmation.
      const { data: row, error: readError } = await supabase
        .from("athlete_equipment_context")
        .select("equipment, scope, source")
        .eq("user_id", userId)
        .eq("scope", parsed.scope)
        .maybeSingle();
      const stored = ((row as { equipment?: string[] } | null)?.equipment ?? []) as string[];
      const landed = !readError && merged.every((t) => stored.includes(t));
      if (!landed) {
        say("I sent that to the server but couldn't confirm it saved, so I'm not going to tell you it worked. Try once more.");
        return;
      }

      setSavedEquipment(true);
      await queryClient.invalidateQueries({ queryKey: ["hammer-context-envelope", userId] });
      await queryClient.invalidateQueries({ queryKey: ["athlete-equipment-context", userId] });

      const dropped = parsed.lacks.length > 0 ? ` I took ${equipmentList(parsed.lacks)} off the list.` : "";
      const when = parsed.scope === "session" ? " for today" : "";
      // HONESTY LAW: anything the athlete named that we could not map is
      // reported as NOT saved. Never let a confirmation imply full coverage.
      const missed =
        parsed.unrecognized.length > 0
          ? ` I did not recognise ${plainList(parsed.unrecognized.map((u) => `"${u}"`))}, so that is not saved — tell me more about it and I'll add it.`
          : "";
      say(`Saved${when} — ${equipmentList(stored)}.${dropped}${missed} Your hitting and training plans now use this list.`);
    },
    [queryClient, say],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setMessages((cur) => [...cur, { role: "user", content: trimmed, ts: Date.now() }]);
      setIsSending(true);
      setError(null);
      try {
        // --- Deterministic equipment path (runs before the model) ---
        const awaiting = pending.current;
        if (awaiting) {
          if (isAffirmation(trimmed)) {
            pending.current = null;
            await commitEquipment(awaiting);
            return;
          }
          if (isRejection(trimmed)) {
            pending.current = null;
            say("Nothing saved. Tell me exactly what you've got — for example \"tee, net and a front toss screen\".");
            return;
          }
          pending.current = null;
        }

        const parsed = parseEquipmentStatement(trimmed);
        if (parsed.confidence === "high") {
          await commitEquipment(parsed);
          return;
        }
        if (parsed.confidence === "low") {
          pending.current = parsed;
          const haveLine = parsed.have.length > 0 ? `you have ${equipmentList(parsed.have)}` : "";
          const lackLine = parsed.lacks.length > 0 ? `you don't have ${equipmentList(parsed.lacks)}` : "";
          const understood = [haveLine, lackLine].filter(Boolean).join(", and ");
          const missedLine = parsed.unrecognized.length > 0 ? ` I did not recognise ${plainList(parsed.unrecognized.map((u) => `"${u}"`))}.` : "";
          say(`I want to get this right before I save anything. I understood: ${understood}.${missedLine} Is that correct? Reply yes, or just list what you've got.`);
          return;
        }

        // --- Ordinary conversation ---
        const contextSnapshot = ctx.variables.map((v) => ({
          key: v.key,
          value: v.value,
          missing: v.missing,
          source: v.source,
        }));
        const history = [...messages, { role: "user" as const, content: trimmed }];
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
        say(reply);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsSending(false);
      }
    },
    [messages, ctx, nextStep, categoryFocus, commitEquipment, say],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    setSavedEquipment(false);
    pending.current = null;
  }, []);

  return { messages, isSending, error, savedEquipment, send, reset };
}
