import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const PROJECT_ID = process.env.PROJECT_ID;

if (!PROJECT_ID) {
  console.error("PROJECT_ID env var required");
  process.exit(1);
}

const FORMAT_CONFIGS = {
  tiktok: { width: 1080, height: 1920 },
  reels: { width: 1080, height: 1920 },
  shorts: { width: 1080, height: 1920 },
  youtube: { width: 1920, height: 1080 },
  hero: { width: 1920, height: 1080 },
};

const DURATION_MAP = { "3s": 90, "7s": 210, "15s": 450 };
const TRANSITION_FRAMES = 15;

async function main() {
  // 1. Load project from DB
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data: project, error: projErr } = await supabase
    .from("promo_projects")
    .select("*")
    .eq("id", PROJECT_ID)
    .single();

  if (projErr || !project) {
    console.error("Failed to load project:", projErr?.message);
    process.exit(1);
  }

  console.log(`Loaded project: "${project.title}" (${project.format})`);

  // 2. Load scene data
  const sceneSequence = project.scene_sequence || [];
  const sceneIds = sceneSequence.map((s) => s.scene_id);

  const { data: scenes } = await supabase
    .from("promo_scenes")
    .select("*")
    .in("id", sceneIds);

  const sceneMap = {};
  for (const s of scenes || []) {
    sceneMap[s.id] = s;
  }

  // 3. Build input props
  const inputSequence = sceneSequence.map((item) => {
    const scene = sceneMap[item.scene_id];
    const dur = item.duration_variant || "7s";
    return {
      sceneKey: item.scene_key,
      simData: scene?.sim_data || {},
      durationInFrames: DURATION_MAP[dur] || 210,
    };
  });

  const totalDuration =
    inputSequence.reduce((sum, s) => sum + s.durationInFrames, 0) -
    TRANSITION_FRAMES * Math.max(0, inputSequence.length - 1);

  console.log(`Scene sequence: ${inputSequence.length} scenes, ${totalDuration} frames (${(totalDuration / 30).toFixed(1)}s)`);

  // 4. Bundle
  console.log("Bundling...");
  const bundled = await bundle({
    entryPoint: path.resolve(__dirname, "../src/index.ts"),
    webpackOverride: (config) => config,
  });

  // 5. Open browser
  const browser = await openBrowser("chrome", {
    browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
    chromiumOptions: {
      args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    },
    chromeMode: "chrome-for-testing",
  });

  // 6. Select composition with overrides
  const dims = FORMAT_CONFIGS[project.format] || FORMAT_CONFIGS.tiktok;

  const composition = await selectComposition({
    serveUrl: bundled,
    id: "main",
    puppeteerInstance: browser,
    inputProps: { sceneSequence: inputSequence },
  });

  // Override dimensions and duration
  composition.width = dims.width;
  composition.height = dims.height;
  composition.durationInFrames = totalDuration;

  const safeTitle = project.title.replace(/[^a-zA-Z0-9_-]/g, "_");
  const outputPath = `/mnt/documents/${safeTitle}.mp4`;

  console.log(`Rendering ${dims.width}x${dims.height} → ${outputPath}`);

  // 7. Render
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: outputPath,
    puppeteerInstance: browser,
    muted: true,
    concurrency: 1,
    inputProps: { sceneSequence: inputSequence },
  });

  await browser.close({ silent: false });

  console.log(`\n✅ Render complete: ${outputPath}`);

  // 8. Update project status
  await supabase
    .from("promo_projects")
    .update({ status: "complete", output_url: outputPath })
    .eq("id", PROJECT_ID);

  console.log("Project status updated to complete");
}

main().catch((err) => {
  console.error("Render failed:", err);
  process.exit(1);
});
