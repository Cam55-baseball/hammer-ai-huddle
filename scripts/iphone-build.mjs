#!/usr/bin/env node
// Owner Nov 12 (build 13 fix 5): ONE command for iPhone builds — `npm run iphone`.
// 1. Deletes the old screens folder (dist) so old screens can never be synced into a build.
// 2. Builds the screens with enough memory (NODE_OPTIONS=--max-old-space-size=6144).
// 3. STOPS with a clear message if that build fails or leaves no screens.
// 4. Otherwise runs `npx cap sync ios`, then `npx cap open ios`, and prints when the screens were built.
// Context: build 12 most likely shipped Nov 7 screens because the screen build failed and the sync
// copied the old folder.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const run = (cmd, args, env) => spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env }, shell: process.platform === "win32" }).status ?? 1;

export function runIphoneBuild({ root = process.cwd(), exec = run, log = console.log, fail = console.error, fsApi = fs } = {}) {
  const dist = path.join(root, "dist");
  fsApi.rmSync(dist, { recursive: true, force: true });

  log("Building the screens…");
  const built = exec("npx", ["vite", "build"], { NODE_OPTIONS: "--max-old-space-size=6144" });
  const indexHtml = path.join(dist, "index.html");
  if (built !== 0 || !fsApi.existsSync(indexHtml)) {
    fail("\n✖ STOPPED: the screen build failed, so nothing was synced into the iPhone project.");
    fail("  Fix the error above and run `npm run iphone` again. Do NOT build in Xcode until this passes.\n");
    return 1;
  }

  let builtAt = null;
  try { builtAt = JSON.parse(fsApi.readFileSync(path.join(dist, "version.json"), "utf8")).builtAt ?? null; } catch { /* shown as unknown */ }

  log("Copying the new screens into the iPhone project…");
  if (exec("npx", ["cap", "sync", "ios"]) !== 0) {
    fail("\n✖ STOPPED: `npx cap sync ios` failed. Fix the error above and run `npm run iphone` again.\n");
    return 1;
  }
  log(`\n✔ Screens built ${builtAt ? new Date(builtAt).toLocaleString() : "(time not recorded)"} and synced into the iPhone project.`);
  log("Opening Xcode…");
  if (exec("npx", ["cap", "open", "ios"]) !== 0) {
    fail("Xcode didn't open by itself. Open ios/App/App.xcodeproj in Xcode.");
    return 1;
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(runIphoneBuild());
}
