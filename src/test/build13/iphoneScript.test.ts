// Owner Nov 12 (build 13 fix 5): `npm run iphone` stops when the screen build fails, so old screens
// can never be synced into an iPhone build.
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runIphoneBuild } from "../../../scripts/iphone-build.mjs";
import pkg from "../../../package.json";

function tmpRoot(withOldScreens: boolean) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "iphone-"));
  if (withOldScreens) {
    fs.mkdirSync(path.join(root, "dist"));
    fs.writeFileSync(path.join(root, "dist", "index.html"), "<old screens from Nov 7>");
  }
  return root;
}

describe("npm run iphone", () => {
  it("is the one script: node scripts/iphone-build.mjs", () => {
    expect((pkg as any).scripts.iphone).toBe("node scripts/iphone-build.mjs");
  });
  it("a failed screen build STOPS before sync, and the old screens folder is gone", () => {
    const root = tmpRoot(true);
    const calls: string[] = [];
    const fail = vi.fn();
    const code = runIphoneBuild({ root, exec: (c: string, a: string[], env?: any) => { calls.push([c, ...a].join(" ") + (env?.NODE_OPTIONS ? ` [${env.NODE_OPTIONS}]` : "")); return 1; }, log: () => {}, fail });
    expect(code).toBe(1);
    expect(calls).toEqual(["npx vite build [--max-old-space-size=6144]"]);
    expect(fs.existsSync(path.join(root, "dist", "index.html"))).toBe(false);
    expect(fail.mock.calls.join(" ")).toContain("STOPPED");
  });
  it("a build that 'succeeds' without screens also stops", () => {
    const root = tmpRoot(true);
    const calls: string[] = [];
    expect(runIphoneBuild({ root, exec: (c: string, a: string[]) => { calls.push(a.join(" ")); return 0; }, log: () => {}, fail: () => {} })).toBe(1);
    expect(calls).toEqual(["vite build"]);
  });
  it("success: build, then cap sync ios, then cap open ios, and prints when the screens were built", () => {
    const root = tmpRoot(false);
    const calls: string[] = [];
    const logs: string[] = [];
    const exec = (c: string, a: string[]) => {
      calls.push(a.join(" "));
      if (a[0] === "vite") {
        fs.mkdirSync(path.join(root, "dist"), { recursive: true });
        fs.writeFileSync(path.join(root, "dist", "index.html"), "new");
        fs.writeFileSync(path.join(root, "dist", "version.json"), JSON.stringify({ build: "x", builtAt: "2026-11-12T21:40:00Z" }));
      }
      return 0;
    };
    expect(runIphoneBuild({ root, exec, log: (m: string) => logs.push(m), fail: () => {} })).toBe(0);
    expect(calls).toEqual(["vite build", "cap sync ios", "cap open ios"]);
    expect(logs.join("\n")).toMatch(/Screens built .*2026/);
  });
});
