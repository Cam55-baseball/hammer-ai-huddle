import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("authorized Apple build settings", () => {
  it("sets every iOS build definition to 6 and keeps marketing version 1.0", () => {
    const project = readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");
    const builds = [...project.matchAll(/CURRENT_PROJECT_VERSION\s*=\s*([^;]+);/g)].map((m) => m[1]);
    const versions = [...project.matchAll(/MARKETING_VERSION\s*=\s*([^;]+);/g)].map((m) => m[1]);
    expect(builds).toEqual(["6", "6"]);
    expect(versions).toEqual(["1.0", "1.0"]);
    const plist = readFileSync("ios/App/App/Info.plist", "utf8");
    expect(plist).toMatch(/<key>CFBundleVersion<\/key>\s*<string>\$\(CURRENT_PROJECT_VERSION\)<\/string>/);
  });
});