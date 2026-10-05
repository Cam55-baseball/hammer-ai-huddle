/**
 * One conversation (owner ruling 2026-10-05). Every Ask Hammer entry point —
 * Recall, phase card, command chat, clip analysis, progress panel, help desk,
 * Royal Timing — shares the athlete's latest saved conversation as memory.
 * Each surface keeps its own answering job and its own entry context; this
 * module only supplies prior history and records each exchange, tagged with
 * where it happened. Signed-out or failed reads degrade to no memory, never
 * to invented memory.
 */
import { supabase } from "@/integrations/supabase/client";

export type ChatTurn = { role: "user" | "assistant"; content: string };
const HISTORY_LIMIT = 30;

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function latestThreadId(userId: string): Promise<string | null> {
  const { data } = await supabase.from("recall_threads").select("id").eq("user_id", userId)
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** Most recent turns of the shared conversation, oldest first. */
export async function loadSharedHistory(limit = HISTORY_LIMIT): Promise<ChatTurn[]> {
  try {
    const uid = await currentUserId();
    if (!uid) return [];
    const tid = await latestThreadId(uid);
    if (!tid) return [];
    const { data } = await supabase.from("recall_messages").select("role,parts,created_at")
      .eq("thread_id", tid).order("created_at", { ascending: false }).limit(limit);
    return (data ?? []).reverse().map((r: any) => {
      const p = Array.isArray(r.parts) ? r.parts[0] : null;
      const from = p?.entry ? `[Earlier, from ${p.entry}] ` : "";
      return { role: r.role === "assistant" ? "assistant" : "user", content: from + (p?.text ?? "") } as ChatTurn;
    }).filter((t) => t.content.trim().length > 0);
  } catch {
    return [];
  }
}

/** Save one exchange into the shared conversation. Never throws into the chat. */
export async function recordSharedExchange(entry: string, question: string, answer: string): Promise<void> {
  try {
    const uid = await currentUserId();
    if (!uid || !question.trim() || !answer.trim()) return;
    let tid = await latestThreadId(uid);
    if (!tid) {
      const { data, error } = await supabase.from("recall_threads")
        .insert({ user_id: uid, title: question.slice(0, 80) }).select("id").single();
      if (error) { console.error("[one-conversation] thread", error); return; }
      tid = data.id as string;
    }
    const { error } = await supabase.from("recall_messages").insert([
      { thread_id: tid, user_id: uid, role: "user", parts: [{ type: "text", text: question, entry }] },
      { thread_id: tid, user_id: uid, role: "assistant", parts: [{ type: "text", text: answer, entry }] },
    ]);
    if (error) { console.error("[one-conversation] messages", error); return; }
    await supabase.from("recall_threads").update({ updated_at: new Date().toISOString() }).eq("id", tid);
  } catch (e) {
    console.error("[one-conversation] record", e);
  }
}
