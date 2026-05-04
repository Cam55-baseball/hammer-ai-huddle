# Demo system

## Adding a new submodule preview

1. Insert a row into `demo_registry` with `node_type='submodule'`, `parent_slug=<category>`, and a `component_key`.
2. (Optional) Build an interactive shell at `src/components/demo/shells/<Name>Demo.tsx`.
3. Register it in `src/components/demo/DemoComponentRegistry.ts` under the same `component_key`.
4. Done — it appears automatically in the relevant tier/category pages, the completion engine
   updates the denominator, and `Start Here` will sequence it if `is_recommended=true`.

## Add a category

Insert a row with `node_type='category'`, `parent_slug=<tier>`. Set `is_recommended=true` on
the one you want highlighted as "Most athletes start here".

## A/B test a node

Set `ab_variant='A'` or `'B'` on the node. `useDemoRegistry` filters to the user's variant
(stored in `demo_progress.variant`).

## Hard rules

- Demo shells must use `useDemoSafeQuery` for reads and `useDemoSafeMutation` for any write.
- Never import live Supabase mutations directly in a shell.
- Edge functions called from a demo session must check `rejectIfDemo(req, corsHeaders)`.
