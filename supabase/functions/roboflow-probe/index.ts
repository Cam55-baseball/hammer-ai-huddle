// Diagnostic probe: inspect the connected Roboflow workspace so we know
// whether a trained ball-detection model already exists, or whether a public
// Universe model must be used as the starting point. Never echoes the API key.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function rfGet(url: string): Promise<{ ok: boolean; status: number; data: unknown }> {
  try {
    const res = await fetch(url);
    const text = await res.text();
    let data: unknown = null;
    try { data = JSON.parse(text); } catch { data = text.slice(0, 500); }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const apiKey = Deno.env.get("ROBOFLOW_API_KEY");
  if (!supabaseUrl || !anonKey) return json({ error: "Server is not configured" }, 500);
  if (!apiKey) return json({ error: "ROBOFLOW_API_KEY secret is not set" }, 500);

  // NOTE: temporary diagnostic function (deleted after investigation).
  // Returns workspace metadata only — never the API key.

  const report: Record<string, unknown> = { key_present: true };

  // 1) Workspace root
  const root = await rfGet(`https://api.roboflow.com/?api_key=${apiKey}`);
  report.workspace_root = { status: root.status, data: root.data };

  const ws = (root.data as { workspace?: string | { url?: string } })?.workspace;
  const wsUrl = typeof ws === "string" ? ws : ws?.url;

  // 2) Workspace projects
  const projects: Array<Record<string, unknown>> = [];
  if (wsUrl) {
    const wsDetail = await rfGet(`https://api.roboflow.com/${wsUrl}?api_key=${apiKey}`);
    report.workspace_detail = { status: wsDetail.status, data: wsDetail.data };
    const wsProjects =
      (wsDetail.data as { workspace?: { projects?: Array<{ id: string; name: string; type: string; models?: number }> } })
        ?.workspace?.projects ?? [];
    report.projects_count = wsProjects.length;

    // 3) For each project, fetch versions to see whether a trained model exists
    for (const p of wsProjects.slice(0, 25)) {
      const shortId = p.id.includes("/") ? p.id.split("/")[1] : p.id;
      const detail = await rfGet(`https://api.roboflow.com/${wsUrl}/${shortId}?api_key=${apiKey}`);
      const versions =
        (detail.data as { versions?: Array<{ id: string; name: string; models?: Array<{ id: string }> }> })
          ?.versions ?? [];
      projects.push({
        id: p.id,
        name: p.name,
        type: p.type,
        versions: versions.map((v) => ({
          id: v.id,
          name: v.name,
          trained_model: Array.isArray(v.models) && v.models.length > 0,
        })),
      });
    }
  }
  report.projects = projects;

  // 4) Universe public model search (no key needed) — candidate starting points
  const universeQueries = ["baseball", "softball", "ball detection"];
  const universe: Record<string, unknown> = {};
  for (const q of universeQueries) {
    const res = await rfGet(`https://api.roboflow.com/v1/search?query=${encodeURIComponent(q)}`);
    const results = (res.data as { results?: Array<Record<string, unknown>> })?.results;
    universe[q] = {
      status: res.status,
      results: Array.isArray(results)
        ? results.slice(0, 8).map((r) => ({
            id: r.id, name: r.name, type: r.type, models: r.models,
            annotation: r.annotation, downloads: r.downloads, stars: r.stars,
          }))
        : res.data,
    };
  }
  report.universe_search = universe;

  return json(report);
});
