import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// This is a server-function dependency bundle, not the Vite app build.
const output = "supabase/functions/_shared/generated/hammerBlockBuilder.mjs";
const result = await build({
  entryPoints: ["src/lib/hammer/prescription/serverBlockBuilder.ts"],
  bundle: true, write: false, metafile: true, format: "esm", platform: "neutral",
  alias: { "@": path.resolve("src") },
  external: [path.resolve("src/integrations/supabase/client")],
  define: { "window": "undefined", "localStorage": "undefined", "import.meta.env.DEV": "false", "import.meta.env.MODE": '"server"' },
  treeShaking: true,
});
const forbidden = Object.keys(result.metafile.inputs).filter(file =>
  /integrations\/supabase\/(client|previewAuthStorage)|node_modules\/(react|@supabase)\//.test(file));
if (forbidden.length) throw new Error(`Browser dependencies in server builder: ${forbidden.join(", ")}`);
if (/import\s*\([^)]*integrations\/supabase|from\s+["'][^"']*integrations\/supabase/.test(result.outputFiles[0].text)) {
  throw new Error("Server bundle retained a browser client import");
}
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, result.outputFiles[0].contents);
console.log(`Shared block builder bundled from ${Object.keys(result.metafile.inputs).length} source modules.`);