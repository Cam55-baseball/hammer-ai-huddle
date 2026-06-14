# Fix: Video Analysis Completely Broken

## Root Cause (Confirmed)

The `analyze-video` edge function is **failing to boot**:

```
worker boot error: Uncaught SyntaxError: Identifier 'language' has already been declared
  at analyze-video/index.ts:1700
```

Because the function never starts, every invocation from the client returns:

```
FunctionsFetchError: Failed to send a request to the Edge Function
```

That surfaces in the UI as "Analysis Failed." It affects **every module** — hitting, pitching, throwing — not just hitting.

### Why it happened

In the last polish pass we added a replay-equivalence cache pre-check (lines 1644–1683) that needed `language` for the fingerprint, so a `const language` was added at **line 1648**. The original `const language` declaration further down at **line 1716** was never removed, producing a duplicate `const` in the same scope. Deno fails the entire module at parse time, so no request ever reaches `serve()`.

## The Fix (1 file, ~2 lines)

`supabase/functions/analyze-video/index.ts`

Remove the duplicate declaration at line 1716. The earlier `const language` at line 1648 already covers the same value and stays in scope for the rest of the handler, so `languageName` / `languageInstruction` below it keep working unchanged.

```diff
-    // Extract language from request
-    const language = body.language || 'en';
-    const languageName = getLanguageName(language);
+    // language was already resolved above for the replay-equivalence
+    // fingerprint; reuse it here.
+    const languageName = getLanguageName(language);
```

## Verification

1. Redeploy `analyze-video`.
2. Tail edge function logs — confirm no more `worker boot error`, see normal `booted (time: …ms)` lines.
3. From the preview, upload a hitting clip → analysis should complete (not "Analysis Failed").
4. Re-run the same video → second run should hit the replay cache (`replay_cache: true`) and return byte-identical `ai_analysis` — the consistency guarantee from the previous pass.

## Scope Discipline

This is a one-line surgical fix to restore production. No changes to prompts, scoring, schema, retry logic, or the replay cache itself — all of those were correct, they just never got to execute because the file didn't parse.
