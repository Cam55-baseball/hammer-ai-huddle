import { builtinCareTags } from '../../../supabase/functions/_shared/tissueCare/matching';

/** Owner Nov 2: body areas and movement types of the day's tissue-care rows, via the shared care tagger. */
export function careVideoExtras(rows: ReadonlyArray<{ name?: string | null; role?: string | null; setup?: string | null }>) {
  const areas = new Set<string>(); const types = new Set<string>();
  for (const row of rows) {
    const tags = row.name ? builtinCareTags({ name: row.name, role: row.role, setup: row.setup }) : null;
    tags?.areas.forEach(a => areas.add(a)); tags?.types.forEach(t => types.add(t));
  }
  return { careAreas: [...areas], careTypes: [...types] };
}
