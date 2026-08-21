// Hammer Recall & Clarity chat — grounded recall + mental-clarity dialogue over
// the athlete's own history, plus a live "right now" snapshot of today.
//
// Retrieval is driven by the source registry in ./sources.ts so recall stays in
// step with the product: new athlete-facing records are added there, once.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { chatCompletion } from "../_shared/googleAi.ts";
import {
  RECALL_SOURCES,
  budgetMerge,
  buildOrFilter,
  extractTerms,
  type RecallSource,
} from "./sources.ts";
import { parseDateRange } from "./dateRange.ts";
import { buildNowBlock } from "./nowContext.ts";

const MODEL = "google/gemini-3.6-flash";

const SYSTEM_PROMPT = `You are Hammer — the athlete's private recall + clarity coach inside Hammers Modality.

Your job:
1) NOW: you are given a live "RIGHT NOW" block with today's date, today's plan and completion state, recent check-ins, injuries, schedule and latest tests. Use it for anything about today, this week, or what's next. Never guess the date — it is given to you.
2) RECALL: answer questions grounded in the athlete's own history (notes, journals, video notes, workouts, sessions, plan tasks, games, at-bats, reports, tests, recaps, calendar). NEVER invent memories. If the retrieved corpus is thin, say so plainly and ask ONE sharpening question (e.g. "roughly when?").
3) CITE: whenever you reference something the athlete wrote or logged, quote a short snippet and name the source + date, e.g. \`"felt light through zone" — Note, 6/12\`.
4) CLARIFY: if the athlete signals mental heaviness (anxious, flat, spiraling, burned out, doubting), shift into a calm sports-psych register: reflect what you heard, surface a cue from their OWN past good days, and offer ONE concrete next 10-min move (breathwork, journaling prompt, mobility flow, walk).
5) SHAPE THE PLAN: when the athlete asks to lighten or reshape today, propose changes as a bulleted "Suggested reset" block at the end. Stay inside what a coach would allow (no ego-lifting on a bad-CNS day, no skipping recovery, never push through a flagged injury).
6) VOICE: warm, direct, one-teammate-to-another. Short paragraphs. No fluff, no hype, no fake certainty. When you don't know, say "I don't have that in your log yet."

If the athlete gives a date range, ONLY reason about entries inside that range.`;

// ---------- Retrieval ----------
async function retrieveContext(
  db: any,
  userId: string,
  query: string,
  range: { from?: string; to?: string },
): Promise<{ sources: RecallSource[]; coverage: Array<{ label: string; count: number }> }> {
  const terms = extractTerms(query);
  const from = range.from ?? null;
  const to = range.to ?? null;
  const collected: RecallSource[] = [];
  const coverage: Array<{ label: string; count: number }> = [];

  await Promise.allSettled(
    RECALL_SOURCES.map(async (def) => {
      const base = () => {
        let b: any = db.from(def.table).select(def.select).eq(def.userColumn, userId);
        for (const [col, val] of Object.entries(def.eq ?? {})) b = b.eq(col, val);
        for (const col of def.isNull ?? []) b = b.is(col, null);
        if (from) b = b.gte(def.dateColumn, from);
        if (to) b = b.lte(def.dateColumn, def.timestamp ? `${to}T23:59:59` : to);
        return b.order(def.dateColumn, { ascending: false }).limit(def.limit);
      };

      let rows: any[] = [];
      const orFilter = buildOrFilter(def, terms);
      if (orFilter) {
        const { data, error } = await base().or(orFilter);
        if (error) console.error(`[hammer-recall] ${def.table} keyword`, error.message);
        rows = data ?? [];
      }
      // Fallback: no keyword hits (or no searchable columns) — take recent rows so
      // the chat always has grounded material from this source.
      if (rows.length === 0) {
        const { data, error } = await base();
        if (error) console.error(`[hammer-recall] ${def.table} recent`, error.message);
        rows = data ?? [];
      }

      let kept = 0;
      for (const r of rows) {
        const mapped = def.map(r);
        if (!mapped || !mapped.text.trim()) continue;
        const rawDate = r[def.dateColumn];
        collected.push({
          source: def.label,
          key: def.key,
          id: String(r.id ?? `${def.key}-${kept}`),
          date: String(rawDate ?? "").slice(0, 10),
          text: mapped.text,
          href: mapped.href,
          meta: mapped.meta,
        });
        kept += 1;
      }
      if (kept > 0) coverage.push({ label: def.label, count: kept });
    }),
  );

  return { sources: budgetMerge(collected), coverage };
}

// ---------- LLM ----------
async function askLLM(
  history: Array<{ role: string; content: string }>,
  blocks: string[],
): Promise<string> {
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...blocks.map((b) => ({ role: "system" as const, content: b })),
    ...history.map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: m.content,
    })),
  ];
  const result = await chatCompletion({ model: MODEL, messages, temperature: 0.5 });
  if (!result.ok) {
    throw new Error(
      `ai_provider_${result.status}: ${result.errorBody?.slice(0, 200) ?? "no response body"}`,
    );
  }
  return (
    result.data?.choices?.[0]?.message?.content ??
    "I couldn't put that together just now — try asking again in a moment."
  );
}

// ---------- Handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: userRes, error: userErr } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userRes?.user) throw new Error("Unauthorized");
    const userId = userRes.user.id;

    const body = await req.json();
    const message = body?.message;
    const tzOffsetMin = Number.isFinite(body?.tzOffsetMinutes) ? Number(body.tzOffsetMinutes) : 0;
    if (!message || typeof message !== "string") throw new Error("message required");

    // Athlete-local "now" (browser sends getTimezoneOffset()).
    const now = new Date(Date.now() - tzOffsetMin * 60_000);

    // Resolve or create thread
    let tid = body?.threadId as string | undefined;
    if (!tid) {
      const { data: t, error: te } = await admin
        .from("recall_threads")
        .insert({ user_id: userId, title: message.slice(0, 60) })
        .select("id")
        .single();
      if (te) throw te;
      tid = t.id;
    } else {
      const { data: owned } = await admin
        .from("recall_threads")
        .select("id,user_id")
        .eq("id", tid)
        .maybeSingle();
      if (!owned || owned.user_id !== userId) throw new Error("Thread not found");
    }

    // Prior turns
    const { data: prior } = await admin
      .from("recall_messages")
      .select("role,parts,created_at")
      .eq("thread_id", tid)
      .order("created_at", { ascending: true })
      .limit(30);

    const history = (prior || [])
      .map((m: any) => ({
        role: m.role,
        content: Array.isArray(m.parts)
          ? m.parts.map((p: any) => p?.text ?? "").join("")
          : String(m.parts ?? ""),
      }))
      .filter((m: any) => m.content.trim().length > 0);
    history.push({ role: "user", content: message });

    // Live state + retrieval, in parallel
    const range = parseDateRange(message, now);
    const [nowBlock, retrieved] = await Promise.all([
      buildNowBlock(admin, userId, now).catch((e) => {
        console.error("[hammer-recall] nowBlock", e instanceof Error ? e.message : String(e));
        return `RIGHT NOW: today is ${now.toISOString().slice(0, 10)} (live state unavailable).`;
      }),
      retrieveContext(admin, userId, message, range),
    ]);

    const { sources, coverage } = retrieved;
    const rangeLine = range.from
      ? `DATE FILTER: only reason about ${range.from}${range.to ? ` → ${range.to}` : " → today"} (${range.label ?? "range"}).`
      : "";

    const corpusBlock =
      sources.length === 0
        ? "RECALL CORPUS: (no entries found in the athlete's log for this query)."
        : "RECALL CORPUS (cite these when relevant, quote short snippets):\n" +
          sources.map((s, i) => `[${i + 1}] ${s.source} · ${s.date}: ${s.text}`).join("\n");

    const blocks = [nowBlock, rangeLine, corpusBlock].filter(Boolean);
    const answer = await askLLM(history, blocks);

    await admin.from("recall_messages").insert([
      {
        thread_id: tid,
        user_id: userId,
        role: "user",
        parts: [{ type: "text", text: message }],
      },
      {
        thread_id: tid,
        user_id: userId,
        role: "assistant",
        parts: [{ type: "text", text: answer, sources, coverage }],
      },
    ]);

    await admin
      .from("recall_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", tid);

    return new Response(JSON.stringify({ threadId: tid, answer, sources, coverage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[hammer-recall]", msg);
    const unauthorized = /unauthorized|no auth/i.test(msg);
    const provider = /^ai_provider_/.test(msg);
    return new Response(
      JSON.stringify({
        error: msg,
        userMessage: unauthorized
          ? "Please sign in again to use Recall."
          : provider
            ? "Hammer couldn't reach the coaching model just now. Try again in a moment."
            : "Recall hit a snag pulling your history. Try again in a moment.",
      }),
      {
        status: unauthorized ? 401 : provider ? 502 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
