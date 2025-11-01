import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { query, limit = 50 } = await req.json();

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Search profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url')
      .ilike('full_name', `%${query.trim()}%`)
      .neq('id', user.id)
      .limit(Math.min(limit, 50));

    if (profilesError) {
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profileIds = profiles.map(p => p.id);

    // Filter to only players
    const { data: playerRoles, error: playerRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .in('user_id', profileIds)
      .eq('role', 'player');

    if (playerRolesError) {
      throw playerRolesError;
    }

    const playerIds = new Set(playerRoles?.map(r => r.user_id) || []);
    const playerProfiles = profiles.filter(p => playerIds.has(p.id));

    if (playerProfiles.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get follow statuses
    const { data: follows, error: followsError } = await supabaseAdmin
      .from('scout_follows')
      .select('player_id, status')
      .eq('scout_id', user.id)
      .in('player_id', playerProfiles.map(p => p.id));

    if (followsError) {
      console.error('Error fetching follows:', followsError);
    }

    const followMap = new Map(follows?.map(f => [f.player_id, f.status]) || []);

    const results = playerProfiles.map(profile => ({
      id: profile.id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      followStatus: followMap.get(profile.id) || 'none'
    }));

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-players:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
