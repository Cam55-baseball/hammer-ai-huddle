## Redeploy edge functions sharing `_shared/seasonPhase.ts`

Verify the parse error fix by redeploying every function that imports the shared module.

### Functions to deploy
- adapt-training-block
- suggest-adaptation
- ai-chat
- suggest-meals
- compute-hammer-state
- generate-training-block
- hie-analyze

### Steps
1. Call `supabase--deploy_edge_functions` with the seven function names above.
2. If any deploy fails, fetch logs via `supabase--edge_function_logs` and patch the shared file.
3. Confirm all return success.