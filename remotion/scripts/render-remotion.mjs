import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT_JSON = process.env.INPUT_JSON;
const QUEUE_ID = process.env.QUEUE_ID;

// Supabase for status updates + storage upload
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!INPUT_JSON) {
  console.error("INPUT_JSON env var required (JSON with title, format, sceneSequence)");
  process.exit(1);
}

const FORMAT_CONFIGS = {
  tiktok: { width: 1080, height: 1920 },
  reels: { width: 1080, height: 1920 },
  shorts: { width: 1080, height: 1920 },
  youtube: { width: 1920, height: 1080 },
  hero: { width: 1920, height: 1080 },
};

const VALID_SCENE_KEYS = [
  "hook-problem", "dashboard-hero", "mpi-engine",
  "tex-vision-drill", "vault-progress", "cta-closer",
];

const TRANSITION_FRAMES = 15;

async function updateStatus(supabase, queueId, projectId, status, extra = {}) {
  if (!supabase || !queueId) return;
  await supabase
    .from("promo_render_queue")
    .update({ status, ...extra })
    .eq("id", queueId);
  if (projectId) {
    await supabase
      .from("promo_projects")
      .update({ status, ...(extra.output_url ? { output_url: extra.output_url } : {}) })
      .eq("id", projectId);
  }
}

async function main() {
  const input = JSON.parse(INPUT_JSON);
  const { title, format, sceneSequence } = input;

  // Validation
  if (!sceneSequence || sceneSequence.length === 0) {
    throw new Error("sceneSequence is empty");
  }
  for (const entry of sceneSequence) {
    if (!VALID_SCENE_KEYS.includes(entry.sceneKey)) {
      throw new Error(`Unknown scene_key: '${entry.sceneKey}'`);
    }
    if (!entry.simData || Object.keys(entry.simData).length === 0) {
      throw new Error(`Missing simData for scene '${entry.sceneKey}'`);
    }
  }

  let supabase = null;
  let projectId = null;

  if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Get project_id from queue
    if (QUEUE_ID) {
      const { data: qRow } = await supabase
        .from("promo_render_queue")
        .select("project_id")
        .eq("id", QUEUE_ID)
        .single();
      projectId = qRow?.project_id;
    }
  }

  const totalDuration =
    sceneSequence.reduce((sum, s) => sum + s.durationInFrames, 0) -
    TRANSITION_FRAMES * Math.max(0, sceneSequence.length - 1);

  console.log(`Project: "${title}" | Format: ${format}`);
  console.log(`Scenes: ${sceneSequence.length} | Frames: ${totalDuration} (${(totalDuration / 30).toFixed(1)}s)`);

  console.log("Bundling...");
  const bundled = await bundle({
    entryPoint: path.resolve(__dirname, "../src/index.ts"),
    webpackOverride: (config) => config,
  });
  console.log("Bundle complete");

  const browser = await openBrowser("chrome", {
    browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
    chromiumOptions: {
      args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    },
    chromeMode: "chrome-for-testing",
  });

  const dims = FORMAT_CONFIGS[format] || FORMAT_CONFIGS.tiktok;

  const composition = await selectComposition({
    serveUrl: bundled,
    id: "main",
    puppeteerInstance: browser,
    inputProps: { sceneSequence },
  });

  composition.width = dims.width;
  composition.height = dims.height;
  composition.durationInFrames = totalDuration;

  const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, "_");
  const localPath = `/tmp/${safeTitle}_${Date.now()}.mp4`;

  console.log(`Rendering ${dims.width}x${dims.height} → ${localPath}`);

  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: localPath,
    puppeteerInstance: browser,
    muted: true,
    concurrency: 1,
    inputProps: { sceneSequence },
  });

  await browser.close({ silent: false });
  console.log(`Render complete: ${localPath}`);

  // Upload to storage
  let publicUrl = null;
  if (supabase) {
    const fileBuffer = fs.readFileSync(localPath);
    const storagePath = `renders/${safeTitle}_${Date.now()}.mp4`;

    console.log(`Uploading to storage: ${storagePath}`);
    const { error: uploadErr } = await supabase.storage
      .from("promo-videos")
      .upload(storagePath, fileBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Upload failed:", uploadErr.message);
      await updateStatus(supabase, QUEUE_ID, projectId, "failed", {
        error_message: `Upload failed: ${uploadErr.message}`,
      });
      process.exit(1);
    }

    const { data: urlData } = supabase.storage
      .from("promo-videos")
      .getPublicUrl(storagePath);

    publicUrl = urlData?.publicUrl;
    console.log(`Public URL: ${publicUrl}`);

    // Update DB
    await updateStatus(supabase, QUEUE_ID, projectId, "complete", {
      output_url: publicUrl,
      completed_at: new Date().toISOString(),
    });
  }

  // Also copy to /mnt/documents for local access
  const docPath = `/mnt/documents/${safeTitle}.mp4`;
  fs.copyFileSync(localPath, docPath);

  console.log(`\n✅ Render complete`);
  console.log(`   Local: ${docPath}`);
  if (publicUrl) console.log(`   URL: ${publicUrl}`);
}

main().catch(async (err) => {
  console.error("Render failed:", err);

  if (SUPABASE_URL && SUPABASE_KEY && QUEUE_ID) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: qRow } = await supabase
      .from("promo_render_queue")
      .select("project_id")
      .eq("id", QUEUE_ID)
      .single();

    await supabase
      .from("promo_render_queue")
      .update({ status: "failed", error_message: err.message })
      .eq("id", QUEUE_ID);

    if (qRow?.project_id) {
      await supabase
        .from("promo_projects")
        .update({ status: "failed" })
        .eq("id", qRow.project_id);
    }
  }

  process.exit(1);
});
