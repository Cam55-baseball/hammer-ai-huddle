import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const result = await build({ entryPoints: ['src/lib/prescription/analysisDrillServerEntry.ts'], bundle: true, write: false,
  metafile: true, format: 'esm', platform: 'neutral', alias: { '@': path.resolve('src') },
  external:[path.resolve('src/integrations/supabase/client')],treeShaking:true,
  define:{window:'undefined','import.meta.env.MODE':'"server"'} });
const forbidden = Object.keys(result.metafile.inputs).filter(file => /integrations\/supabase|node_modules\/(react|@supabase)\//.test(file));
if (forbidden.length) throw new Error(`Browser dependencies: ${forbidden.join(', ')}`);
if(/import\s*\([^)]*integrations\/supabase|from\s+["'][^"']*integrations\/supabase/.test(result.outputFiles[0].text))throw new Error('Server bundle retained a browser client');
await mkdir('supabase/functions/_shared/generated', { recursive: true });
await writeFile('supabase/functions/_shared/generated/analysisDrills.mjs', result.outputFiles[0].contents);
console.log(`Analysis drill bundle: ${Object.keys(result.metafile.inputs).length} canonical sources`);