import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Accept scene data directly via env to avoid RLS issues
// In production, this would use service role key
const INPUT_JSON = process.env.INPUT_JSON;

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

const TRANSITION_FRAMES = 15;

async function main() {
  const input = JSON.parse(INPUT_JSON);
  const { title, format, sceneSequence } = input;

  const totalDuration =
    sceneSequence.reduce((sum, s) => sum + s.durationInFrames, 0) -
    TRANSITION_FRAMES * Math.max(0, sceneSequence.length - 1);

  console.log(`Project: "${title}" | Format: ${format}`);
  console.log(`Scenes: ${sceneSequence.length} | Frames: ${totalDuration} (${(totalDuration / 30).toFixed(1)}s)`);

  // Bundle
  console.log("Bundling...");
  const bundled = await bundle({
    entryPoint: path.resolve(__dirname, "../src/index.ts"),
    webpackOverride: (config) => config,
  });
  console.log("Bundle complete");

  // Browser
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
  const outputPath = `/mnt/documents/${safeTitle}.mp4`;

  console.log(`Rendering ${dims.width}x${dims.height} → ${outputPath}`);

  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: outputPath,
    puppeteerInstance: browser,
    muted: true,
    concurrency: 1,
    inputProps: { sceneSequence },
  });

  await browser.close({ silent: false });

  console.log(`\n✅ Render complete: ${outputPath}`);
}

main().catch((err) => {
  console.error("Render failed:", err);
  process.exit(1);
});
