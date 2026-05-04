// Server-side firewall for demo sessions. Edge functions can call this guard
// to reject any mutation that arrives with `x-demo-session: 1`.
export function isDemoSession(req: Request): boolean {
  return req.headers.get('x-demo-session') === '1';
}

export function rejectIfDemo(req: Request, corsHeaders: Record<string, string>): Response | null {
  if (isDemoSession(req)) {
    return new Response(
      JSON.stringify({ error: 'Demo sessions cannot perform real writes.', demo: true }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  return null;
}
