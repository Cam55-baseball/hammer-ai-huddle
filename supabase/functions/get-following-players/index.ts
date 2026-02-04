import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Determine sport from subscribed modules
function determineSport(modules: string[] | null): 'baseball' | 'softball' | 'both' | null {
  if (!modules || modules.length === 0) return null;
  
  const hasBaseball = modules.some(m => m.startsWith('baseball'));
  const hasSoftball = modules.some(m => m.startsWith('softball'));
  
  if (hasBaseball && hasSoftball) return 'both';
  if (hasBaseball) return 'baseball';
  if (hasSoftball) return 'softball';
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify user is a scout or coach
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['scout', 'coach']);

    if (roleError || !roleData || roleData.length === 0) {
      throw new Error('User must be a scout or coach');
    }

    // Use service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get accepted follows
    const { data: follows, error: followsError } = await supabaseAdmin
      .from('scout_follows')
      .select('player_id')
      .eq('scout_id', user.id)
      .eq('status', 'accepted');

    if (followsError) {
      throw followsError;
    }

    if (!follows || follows.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const playerIds = follows.map(f => f.player_id);

    // Get profiles for these players
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', playerIds);

    if (profilesError) {
      throw profilesError;
    }

    // Get subscriptions to determine sport for each player
    const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, subscribed_modules')
      .in('user_id', playerIds);

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError);
      // Continue without sport data if subscriptions fail
    }

    // Create a map of user_id to subscribed_modules
    const subscriptionMap = new Map<string, string[]>();
    if (subscriptions) {
      for (const sub of subscriptions) {
        subscriptionMap.set(sub.user_id, sub.subscribed_modules || []);
      }
    }

    const results = (profiles || []).map(profile => ({
      id: profile.id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      followStatus: 'accepted' as const,
      sport: determineSport(subscriptionMap.get(profile.id) || null)
    }));

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-following-players:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
