import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface OverlapWarning {
  type: 'cns' | 'elastic' | 'load_spike' | 'recovery';
  severity: 'advisory' | 'warning';
  message: string;
  suggestion?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    const body = await req.json();
    const { target_date, planned_cns_load, planned_fascial_load } = body;

    console.log('[detect-overlaps] Checking overlaps for user:', userId, 'date:', target_date);

    // Fetch last 7 days of load data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: loadHistory, error: historyError } = await supabase
      .from('athlete_load_tracking')
      .select('*')
      .eq('user_id', userId)
      .gte('entry_date', sevenDaysAgo.toISOString().split('T')[0])
      .order('entry_date', { ascending: false });

    if (historyError) {
      console.error('[detect-overlaps] Error fetching history:', historyError);
      throw historyError;
    }

    // Calculate averages
    const avgCNS = loadHistory?.length 
      ? loadHistory.reduce((sum, d) => sum + (d.cns_load_total || 0), 0) / loadHistory.length 
      : 0;
    
    const avgVolume = loadHistory?.length 
      ? loadHistory.reduce((sum, d) => sum + (d.volume_load || 0), 0) / loadHistory.length 
      : 0;

    const warnings: OverlapWarning[] = [];

    // Check CNS overlap
    if (planned_cns_load > 150) {
      warnings.push({
        type: 'cns',
        severity: 'warning',
        message: 'High CNS load planned - this may impair recovery',
        suggestion: 'Consider reducing explosive work or spacing sessions',
      });
    } else if (planned_cns_load > 120) {
      warnings.push({
        type: 'cns',
        severity: 'advisory',
        message: 'Elevated CNS load - monitor fatigue levels',
      });
    }

    // Check load spike (>50% above average)
    if (avgCNS > 0 && planned_cns_load > avgCNS * 1.5) {
      warnings.push({
        type: 'load_spike',
        severity: 'warning',
        message: `Load spike detected: ${Math.round((planned_cns_load / avgCNS - 1) * 100)}% above your 7-day average`,
        suggestion: 'Gradual progression recommended - try reducing volume by 20%',
      });
    }

    // Check elastic overload
    if (planned_fascial_load?.elastic > 80) {
      warnings.push({
        type: 'elastic',
        severity: 'advisory',
        message: 'High elastic/plyometric demand today',
        suggestion: 'Ensure thorough warm-up and consider extra recovery tomorrow',
      });
    }

    // Check consecutive high days
    const recentHighDays = loadHistory?.filter(d => (d.cns_load_total || 0) > 100).length || 0;
    if (recentHighDays >= 3 && planned_cns_load > 80) {
      warnings.push({
        type: 'recovery',
        severity: 'warning',
        message: `${recentHighDays} high-load days in the past week - recovery may be compromised`,
        suggestion: 'Consider a deload day or lighter session',
      });
    }

    console.log('[detect-overlaps] Generated warnings:', warnings.length);

    return new Response(JSON.stringify({
      success: true,
      warnings,
      context: {
        avgCNS: Math.round(avgCNS),
        avgVolume: Math.round(avgVolume),
        recentHighDays,
        plannedLoad: planned_cns_load,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[detect-overlaps] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
