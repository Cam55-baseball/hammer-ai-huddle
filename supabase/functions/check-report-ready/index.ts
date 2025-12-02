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

    console.log('[check-report-ready] Checking for user:', user.id);

    // Get user's report cycle
    let { data: cycle, error: cycleError } = await supabase
      .from('user_report_cycles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // If no cycle exists, create one
    if (cycleError && cycleError.code === 'PGRST116') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', user.id)
        .single();

      const cycleStartDate = profile?.created_at || new Date().toISOString();
      const nextReportDate = new Date(cycleStartDate);
      nextReportDate.setDate(nextReportDate.getDate() + 30);

      const { data: newCycle, error: insertError } = await supabase
        .from('user_report_cycles')
        .insert({
          user_id: user.id,
          cycle_start_date: cycleStartDate,
          next_report_date: nextReportDate.toISOString(),
          reports_generated: 0
        })
        .select()
        .single();

      if (insertError) {
        console.error('[check-report-ready] Error creating cycle:', insertError);
        throw new Error('Failed to create report cycle');
      }

      cycle = newCycle;
    } else if (cycleError) {
      console.error('[check-report-ready] Error fetching cycle:', cycleError);
      throw cycleError;
    }

    const now = new Date();
    const nextReportDate = new Date(cycle.next_report_date);
    const daysRemaining = Math.ceil((nextReportDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Check if report is due
    if (now >= nextReportDate) {
      // Check if a report already exists for this period
      const { data: existingReport } = await supabase
        .from('monthly_reports')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('report_period_start', cycle.cycle_start_date)
        .single();

      if (existingReport) {
        // Report exists but may not have been viewed
        console.log('[check-report-ready] Existing report found:', existingReport.id);
        return new Response(
          JSON.stringify({
            reportReady: true,
            reportId: existingReport.id,
            needsGeneration: false,
            status: existingReport.status
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Report is due and needs to be generated
      console.log('[check-report-ready] Report due, needs generation');
      return new Response(
        JSON.stringify({
          reportReady: true,
          needsGeneration: true,
          cycleStartDate: cycle.cycle_start_date,
          nextReportDate: cycle.next_report_date
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Report not due yet
    console.log('[check-report-ready] Report not due yet, days remaining:', daysRemaining);
    return new Response(
      JSON.stringify({
        reportReady: false,
        daysRemaining: Math.max(0, daysRemaining),
        nextReportDate: cycle.next_report_date,
        cycleStartDate: cycle.cycle_start_date,
        reportsGenerated: cycle.reports_generated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[check-report-ready] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
