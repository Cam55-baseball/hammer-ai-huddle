// Plan 4 GUEST MODE — a coach analyzes a player who has no account.
// NOTHING about the guest is saved or kept for AI training: the frames live only in this request,
// the result goes back to the coach's screen only. The one row written is the coach's own usage
// row (model, tokens, cost), so the hourly fair-use limit and cost tracking still work.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { chatCompletion } from "../_shared/googleAi.ts";
import { analysesLastHour, overHourlyLimit, hourlyResumeAt, logAiUsage, HOURLY_LIMIT_MESSAGE } from "../_shared/aiUsage.ts";
import { guestRequestError, guestResultFrom } from "../_shared/guestMode.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    const user = u.user;
    if (!user) return json({ error: "Please sign in first." }, 401);

    // Coaches (and owner/admin) only; when the coach-tools switch is on, a staff plan is needed too.
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const r = new Set((roles ?? []).map((x: any) => x.role));
    const staff = r.has("owner") || r.has("admin");
    if (!staff && !r.has("coach")) return json({ error: "Guest mode is for coaches." }, 403);
    if (!staff) {
      const { data: gate } = await admin.from("app_settings").select("setting_value").eq("setting_key", "staff_plan_gate").maybeSingle();
      const on = (gate?.setting_value as any)?.enabled === true;
      if (on) {
        const { data: has } = await admin.rpc("has_staff_plan", { _user: user.id });
        if (!has) return json({ error: "Coach plan needed.", code: "plan_needed" }, 402);
      }
    }

    const body = await req.json().catch(() => ({}));
    const err = guestRequestError(body);
    if (err) return json({ error: err }, 400);

    if (overHourlyLimit(await analysesLastHour(admin, user.id))) {
      return json({ error: HOURLY_LIMIT_MESSAGE, code: "hourly_limit", resume_at: await hourlyResumeAt(admin, user.id) }, 429);
    }

    const content: Array<Record<string, unknown>> = [
      { type: "text", text: `These are ${body.frames.length} pictures in order from one ${body.sport} ${body.module} rep. Give a short, honest coaching read for a young player. Only say what the pictures clearly show; if something can't be seen, leave it out.` },
      ...body.frames.map((url: string) => ({ type: "image_url", image_url: { url } })),
    ];
    const ai = await chatCompletion({
      model: "google/gemini-2.5-flash",
      temperature: 0,
      messages: [
        { role: "system", content: "You are an elite baseball and softball coach. Plain words a 14-year-old understands. Never guess." },
        { role: "user", content },
      ],
      tools: [{ type: "function", function: { name: "guest_read", parameters: { type: "object", properties: {
        score: { type: "number", description: "0-100 form score" },
        strengths: { type: "array", items: { type: "string" } },
        fixes: { type: "array", items: { type: "string" } },
        drills: { type: "array", items: { type: "string" } },
      }, required: ["score", "strengths", "fixes", "drills"] } } }],
      tool_choice: { type: "function", function: { name: "guest_read" } },
    });
    await logAiUsage(admin, { userId: user.id, functionName: "analyze-guest", analysisType: `guest_${body.module}`, result: ai });
    if (!ai.ok) return json({ error: "The analysis couldn't run right now. Try again in a minute." }, 502);
    const call = ai.data.choices?.[0]?.message?.tool_calls?.[0];
    let args: unknown = null;
    try { args = call ? JSON.parse(call.function.arguments) : null; } catch { args = null; }
    if (!args) return json({ error: "The analysis couldn't read this clip. Try a clearer video." }, 422);
    return json({ result: guestResultFrom(args), saved: false });
  } catch (e) {
    console.error("[analyze-guest]", e instanceof Error ? e.message : e);
    return json({ error: "Something went wrong. Nothing was saved." }, 500);
  }
});
