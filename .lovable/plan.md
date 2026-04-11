

# Invoke populate-drill-instructions Edge Function

## Problem
The `curl_edge_functions` tool cannot inject actual secret values into headers — it sends the literal string `{{Owner_Key}}`. The function's auth check compares the header against `Deno.env.get("Owner_Key")`, so the request gets 401.

## Solution
Temporarily add a secondary auth path to the edge function that accepts the **logged-in user's JWT** (already auto-injected by the `curl_edge_functions` tool) and verifies they have the `owner` role in the database. This avoids changing the architecture — the `Owner_Key` path stays intact for external use.

### Step 1: Update `populate-drill-instructions/index.ts` auth block

Add a fallback after the Owner_Key check: if no valid Owner_Key header, check if the request has a valid JWT from an owner-role user.

```typescript
// Auth check - Owner_Key header OR authenticated owner user
const ownerKey = req.headers.get("x-owner-key") || req.headers.get("Owner_Key");
const expectedKey = Deno.env.get("Owner_Key");
let authorized = expectedKey && ownerKey === expectedKey;

if (!authorized) {
  // Fallback: check if caller is an authenticated owner
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabase.auth.getUser(token);
    if (data?.user) {
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "owner")
        .eq("status", "active")
        .maybeSingle();
      authorized = !!role;
    }
  }
}

if (!authorized) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

### Step 2: Deploy the updated function

### Step 3: Invoke via `curl_edge_functions`

The tool auto-injects the logged-in user's auth token. Since the user is the owner, the fallback auth path will succeed.

```
POST /populate-drill-instructions
body: {"batch_size": 5, "limit": 100}
```

### Step 4: Verify results

Check logs and query the database to confirm drills were populated.

### No other files change. The Owner_Key path remains for future external calls.

