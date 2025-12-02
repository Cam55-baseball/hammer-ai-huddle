import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('[list-monthly-reports] Fetching reports for user:', user.id);

    // Fetch all reports for the user
    const { data: reports, error: reportsError } = await supabase
      .from('monthly_reports')
      .select('id, report_period_start, report_period_end, status, created_at, viewed_at, downloaded_at, saved_to_library')
      .eq('user_id', user.id)
      .eq('saved_to_library', true)
      .order('created_at', { ascending: false });

    if (reportsError) {
      console.error('[list-monthly-reports] Error fetching reports:', reportsError);
      throw reportsError;
    }

    // Get cycle info
    const { data: cycle } = await supabase
      .from('user_report_cycles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log('[list-monthly-reports] Found', reports?.length || 0, 'reports');

    return new Response(
      JSON.stringify({
        reports: reports || [],
        cycle: cycle || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[list-monthly-reports] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
