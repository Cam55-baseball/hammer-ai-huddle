import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const result = await build({ entryPoints: ['src/lib/prescription/analysisDrillServerEntry.ts'], bundle: true, write: false,
  metafile: true, format: 'esm', platform: 'neutral', alias: { '@': path.resolve('src') } });
const forbidden = Object.keys(result.metafile.inputs).filter(file => /integrations\/supabase|node_modules\/(react|@supabase)\//.test(file));
if (forbidden.length) throw new Error(`Browser dependencies: ${forbidden.join(', ')}`);
await mkdir('supabase/functions/_shared/generated', { recursive: true });
await writeFile('supabase/functions/_shared/generated/analysisDrills.mjs', result.outputFiles[0].contents);
console.log(`Analysis drill bundle: ${Object.keys(result.metafile.inputs).length} canonical sources`);