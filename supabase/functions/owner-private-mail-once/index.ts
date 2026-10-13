// One-time, owner-only: send a private note to the owner's inbox only. Deleted right after use.
import { createClient } from "npm:@supabase/supabase-js@2";
import { EMAIL_FROM, EMAIL_REPLY_TO } from "../_shared/email.ts";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: u } = await admin.auth.getUser((req.headers.get("authorization") ?? "").replace("Bearer ", ""));
  if (!u.user) return new Response("no", { status: 401, headers: cors });
  const { data: r } = await admin.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "owner");
  if (!r?.length) return new Response("no", { status: 403, headers: cors });
  const { subject, text } = await req.json();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to: ["hammersmodality@hammersmodality.org"], reply_to: EMAIL_REPLY_TO, subject, text }),
  });
  return new Response(JSON.stringify({ status: res.status, body: (await res.text()).slice(0, 200) }), { headers: { ...cors, "content-type": "application/json" } });
});
