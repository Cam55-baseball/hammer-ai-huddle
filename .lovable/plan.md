Fix the runtime `ReferenceError: Can't find variable: require` that crashes the **Hammers Today Plan** section.

## Root cause
`src/lib/hammer/prescription/dailyPlan.ts:176` uses CommonJS `require("./warmupLibrary")` inside the `warmup` builder branch. Vite strips `require` from browser bundles, so the component throws as soon as it tries to build a warm-up block.

## What I will do
1. Replace the inline `require("./warmupLibrary")` with a static ES module `import` at the top of `dailyPlan.ts`.
2. Keep the existing destructuring names (`buildWarmup`, `resolveWarmupContext`, `lifecycleFor`) so behavior is unchanged.
3. Search the `src/lib/hammer/` tree for any other `require()` calls and convert any remaining browser-bound ones.
4. Run the build/typecheck to confirm the error is gone.
5. Smoke-test the Today Plan route to verify the section renders without the ErrorBoundary fallback.

## Expected result
- The "Something went wrong here. (Can't find variable: require)" error no longer appears.
- The Hammers Today Plan card and warm-up block render normally.

No database or UI redesign needed — this is a bundler/runtime syntax fix.