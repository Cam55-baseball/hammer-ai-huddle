// Hammer Recall & Clarity chat — grounded recall + mental-clarity dialogue
// over the athlete's own history (notes, journals, logs, sessions, at-bats).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MODEL = "google/gemini-3-flash-preview";

const SYSTEM_PROMPT = `You are Hammer — the athlete's private recall + clarity coach.

Your job:
1) RECALL: answer questions grounded in the athlete's own history (notes, journal entries, video annotations, workouts, at-bats, mood/CNS logs). NEVER invent memories. If the retrieved corpus is thin, say so and ask ONE sharpening question (e.g. "roughly when?").
2) CITE: whenever you reference something the athlete wrote or logged, quote a short snippet and name the source + date, e.g. \`"felt light through zone" — Note, 6/12\`.
3) CLARIFY: if the athlete signals mental heaviness (anxious, flat, spiraling, burned out, doubting), shift into a calm sports-psych register: reflect what you heard, surface a cue from their OWN past good days, and offer ONE concrete next 10-min move (breathwork, journaling prompt, mobility flow, walk).
4) SHAPE THE PLAN: when the athlete asks to lighten or reshape today, propose changes as a bulleted "Suggested reset" block at the end of your answer. Keep it inside what a coach would allow (no ego-lifting on a bad-CNS day, no skipping recovery).
5) VOICE: warm, direct, one-teammate-to-another. Short paragraphs. No fluff, no hype, no fake certainty. When you don't know, say "I don't have that in your log yet."

If the athlete gives a date range, ONLY reason about entries inside that range.`;

interface RecallSource {
  source: string;
  id: string;
  date: string;
  text: string;
  meta?: Record<string, unknown>;
}

// ---------- Date range parsing ----------
function parseDateRange(text: string): { from?: string; to?: string } {
  const t = text.toLowerCase();
  // explicit "M/D/YY - M/D/YY" or "M/D/YYYY to M/D/YYYY"
  const rx =
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*(?:-|to|through|thru|–|—|until)\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/;
  const m = t.match(rx);
  if (m) {
    const norm = (y: string) => (y.length === 2 ? `20${y}` : y);
    const iso = (mo: string, d: string, y: string) =>
      `${norm(y)}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    return {
      from: iso(m[1], m[2], m[3]),
      to: iso(m[4], m[5], m[6]),
    };
  }
  // "last N days/weeks"
  const rel = t.match(/last\s+(\d+)\s+(day|days|week|weeks|month|months)/);
  if (rel) {
    const n = Number(rel[1]);
    const unit = rel[2];
    const days =
      unit.startsWith("week") ? n * 7 : unit.startsWith("month") ? n * 30 : n;
    const now = new Date();
    const from = new Date(now.getTime() - days * 86400_000);
    return { from: from.toISOString().slice(0, 10) };
  }
  if (/\bthis week\b/.test(t)) {
    const now = new Date();
    const from = new Date(now.getTime() - 7 * 86400_000);
    return { from: from.toISOString().slice(0, 10) };
  }
  if (/\bthis month\b/.test(t)) {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    return { from };
  }
  return {};
}

// ---------- Retrieval ----------
async function retrieveContext(
  db: ReturnType<typeof createClient>,
  userId: string,
  query: string,
  range: { from?: string; to?: string },
): Promise<RecallSource[]> {
  const out: RecallSource[] = [];
  const q = query.trim();
  const like = q ? `%${q.split(/\s+/).slice(0, 4).join("%")}%` : null;
  const from = range.from ?? null;
  const to = range.to ?? null;

  const applyRange = <T>(builder: T, col: string): T => {
    let b: any = builder;
    if (from) b = b.gte(col, from);
    if (to) b = b.lte(col, to + "T23:59:59");
    return b as T;
  };

  const runs: Array<Promise<void>> = [];

  // Free notes
  runs.push(
    (async () => {
      let b: any = db
        .from("vault_free_notes")
        .select("id,content,created_at")
        .eq("user_id", userId);
      b = applyRange(b, "created_at");
      if (like) b = b.ilike("content", like);
      const { data } = await b.order("created_at", { ascending: false }).limit(10);
      (data || []).forEach((r: any) =>
        out.push({
          source: "Note",
          id: r.id,
          date: (r.created_at || "").slice(0, 10),
          text: String(r.content || "").slice(0, 400),
        }),
      );
    })(),
  );

  // Workout notes
  runs.push(
    (async () => {
      let b: any = db
        .from("vault_workout_notes")
        .select("id,notes,created_at")
        .eq("user_id", userId);
      b = applyRange(b, "created_at");
      if (like) b = b.ilike("notes", like);
      const { data } = await b.order("created_at", { ascending: false }).limit(10);
      (data || []).forEach((r: any) =>
        out.push({
          source: "Workout note",
          id: r.id,
          date: (r.created_at || "").slice(0, 10),
          text: String(r.notes || "").slice(0, 400),
        }),
      );
    })(),
  );

  // Mental health journal
  runs.push(
    (async () => {
      let b: any = db
        .from("mental_health_journal")
        .select("id,entry,mood,created_at")
        .eq("user_id", userId);
      b = applyRange(b, "created_at");
      if (like) b = b.ilike("entry", like);
      const { data } = await b.order("created_at", { ascending: false }).limit(10);
      (data || []).forEach((r: any) =>
        out.push({
          source: "Journal",
          id: r.id,
          date: (r.created_at || "").slice(0, 10),
          text: `${r.mood ? `[${r.mood}] ` : ""}${String(r.entry || "").slice(0, 400)}`,
        }),
      );
    })(),
  );

  // Thought logs
  runs.push(
    (async () => {
      let b: any = db
        .from("thought_logs")
        .select("id,thought,created_at")
        .eq("user_id", userId);
      b = applyRange(b, "created_at");
      if (like) b = b.ilike("thought", like);
      const { data } = await b.order("created_at", { ascending: false }).limit(8);
      (data || []).forEach((r: any) =>
        out.push({
          source: "Thought log",
          id: r.id,
          date: (r.created_at || "").slice(0, 10),
          text: String(r.thought || "").slice(0, 400),
        }),
      );
    })(),
  );

  // Video annotations
  runs.push(
    (async () => {
      let b: any = db
        .from("video_annotations")
        .select("id,note,created_at,video_id")
        .eq("user_id", userId);
      b = applyRange(b, "created_at");
      if (like) b = b.ilike("note", like);
      const { data } = await b.order("created_at", { ascending: false }).limit(10);
      (data || []).forEach((r: any) =>
        out.push({
          source: "Video note",
          id: r.id,
          date: (r.created_at || "").slice(0, 10),
          text: String(r.note || "").slice(0, 400),
          meta: { video_id: r.video_id },
        }),
      );
    })(),
  );

  // Daily log (mood/CNS/sleep)
  runs.push(
    (async () => {
      let b: any = db
        .from("athlete_daily_log")
        .select("id,mood,sleep_hours,cns_score,soreness,notes,log_date")
        .eq("user_id", userId);
      if (from) b = b.gte("log_date", from);
      if (to) b = b.lte("log_date", to);
      const { data } = await b.order("log_date", { ascending: false }).limit(14);
      (data || []).forEach((r: any) =>
        out.push({
          source: "Daily log",
          id: r.id,
          date: r.log_date,
          text: `mood ${r.mood ?? "—"} · sleep ${r.sleep_hours ?? "—"}h · CNS ${r.cns_score ?? "—"} · sore ${r.soreness ?? "—"}${r.notes ? ` · ${r.notes}` : ""}`,
        }),
      );
    })(),
  );

  // At-bats
  runs.push(
    (async () => {
      let b: any = db
        .from("gp_at_bats")
        .select("id,result,notes,created_at,pitch_count,exit_velo_max")
        .eq("user_id", userId);
      b = applyRange(b, "created_at");
      if (like) b = b.ilike("notes", like);
      const { data } = await b.order("created_at", { ascending: false }).limit(10);
      (data || []).forEach((r: any) =>
        out.push({
          source: "At-bat",
          id: r.id,
          date: (r.created_at || "").slice(0, 10),
          text: `result ${r.result ?? "—"}${r.exit_velo_max ? ` · EV ${r.exit_velo_max}` : ""}${r.notes ? ` · ${r.notes}` : ""}`,
        }),
      );
    })(),
  );

  await Promise.allSettled(runs);
  // Keep the ~30 most recent to control prompt size
  out.sort((a, b) => (a.date < b.date ? 1 : -1));
  return out.slice(0, 30);
}

// ---------- LLM ----------
async function askLLM(
  apiKey: string,
  history: Array<{ role: string; content: string }>,
  contextBlock: string,
): Promise<string> {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: contextBlock },
    ...history,
  ];
  const res = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.5 }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gateway ${res.status}: ${body}`);
  }
  const j = await res.json();
  return j?.choices?.[0]?.message?.content ?? "I don't have that in your log yet.";
}

// ---------- Handler ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: userRes, error: userErr } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userRes?.user) throw new Error("Unauthorized");
    const userId = userRes.user.id;

    const { threadId, message } = await req.json();
    if (!message || typeof message !== "string") throw new Error("message required");

    // Resolve or create thread
    let tid = threadId as string | undefined;
    if (!tid) {
      const { data: t, error: te } = await admin
        .from("recall_threads")
        .insert({
          user_id: userId,
          title: message.slice(0, 60),
        })
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

    // Load prior messages for context
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
      .filter((m) => m.content.trim().length > 0);
    history.push({ role: "user", content: message });

    // Retrieval
    const range = parseDateRange(message);
    const sources = await retrieveContext(admin, userId, message, range);
    const contextBlock =
      sources.length === 0
        ? "RECALL CORPUS: (no matching entries found in the athlete's log for this query)."
        : "RECALL CORPUS (cite these when relevant, quote short snippets):\n" +
          sources
            .map(
              (s, i) => `[${i + 1}] ${s.source} · ${s.date}: ${s.text.replace(/\s+/g, " ").trim()}`,
            )
            .join("\n");

    // LLM
    const answer = await askLLM(lovableKey, history, contextBlock);

    // Persist user + assistant messages
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
        parts: [{ type: "text", text: answer, sources }],
      },
    ]);

    return new Response(
      JSON.stringify({ threadId: tid, answer, sources }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[hammer-recall]", msg);
    const status = /unauthorized|no auth/i.test(msg) ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
