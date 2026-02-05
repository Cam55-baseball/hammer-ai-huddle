import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    const {
      query,
      limit = 50,
      positions,
      throwingHands,
      battingSides,
      heightMin,
      heightMax,
      weightMin,
      weightMax,
      state,
      commitmentStatus,
      hsGradYearMin,
      hsGradYearMax,
      collegeGradYearMin,
      collegeGradYearMax,
      enrolledInCollege,
      isProfessional,
      isFreeAgent,
      mlbAffiliate,
      independentLeague,
      isForeignPlayer,
      sport,
    } = await req.json();

    // Helper to parse height strings like "6'2"" to inches
    const parseHeightToInches = (height: string): number | null => {
      const match = height.match(/(\d+)['′-](\d+)/);
      if (match) {
        return parseInt(match[1]) * 12 + parseInt(match[2]);
      }
      return null;
    };

    // Helper to parse weight strings like "180 lbs" to number
    const parseWeightToPounds = (weight: string): number | null => {
      const match = weight.match(/(\d+)/);
      return match ? parseInt(match[1]) : null;
    };

    // Check if we have any filters applied
    const hasFilters = positions?.length > 0 || throwingHands?.length > 0 || 
      battingSides?.length > 0 || heightMin || heightMax || weightMin || weightMax ||
      state || commitmentStatus || hsGradYearMin || hsGradYearMax ||
      collegeGradYearMin || collegeGradYearMax ||
      (typeof enrolledInCollege === 'boolean') ||
      (typeof isProfessional === 'boolean') ||
      (typeof isFreeAgent === 'boolean') ||
      mlbAffiliate || independentLeague ||
      (typeof isForeignPlayer === 'boolean') ||
      (sport === 'baseball' || sport === 'softball');

    // If no query and no filters, return empty
    if ((!query || query.trim().length < 2) && !hasFilters) {
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

    // Build query with filters
    let profileQuery = supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url, position, throwing_hand, batting_side, height, weight, state, high_school_grad_year, college_grad_year, commitment_status, enrolled_in_college, is_professional, is_free_agent, mlb_affiliate, independent_league, is_foreign_player')
      .neq('id', user.id);

    // Apply name search if provided
    if (query && query.trim().length >= 2) {
      profileQuery = profileQuery.ilike('full_name', `%${query.trim()}%`);
    }

    // Apply position filter
    if (positions && positions.length > 0) {
      profileQuery = profileQuery.in('position', positions);
    }

    // Apply throwing hand filter
    if (throwingHands && throwingHands.length > 0) {
      profileQuery = profileQuery.in('throwing_hand', throwingHands);
    }

    // Apply batting side filter
    if (battingSides && battingSides.length > 0) {
      profileQuery = profileQuery.in('batting_side', battingSides);
    }

    // Apply state filter
    if (state) {
      profileQuery = profileQuery.ilike('state', `%${state}%`);
    }

    // Apply commitment status filter
    if (commitmentStatus) {
      profileQuery = profileQuery.eq('commitment_status', commitmentStatus);
    }

    // Apply HS graduation year range
    if (hsGradYearMin) {
      profileQuery = profileQuery.gte('high_school_grad_year', parseInt(hsGradYearMin));
    }
    if (hsGradYearMax) {
      profileQuery = profileQuery.lte('high_school_grad_year', parseInt(hsGradYearMax));
    }

    // Apply college graduation year range
    if (collegeGradYearMin) {
      profileQuery = profileQuery.gte('college_grad_year', parseInt(collegeGradYearMin));
    }
    if (collegeGradYearMax) {
      profileQuery = profileQuery.lte('college_grad_year', parseInt(collegeGradYearMax));
    }

    // Apply boolean filters
    if (typeof enrolledInCollege === 'boolean') {
      profileQuery = profileQuery.eq('enrolled_in_college', enrolledInCollege);
    }
    if (typeof isProfessional === 'boolean') {
      profileQuery = profileQuery.eq('is_professional', isProfessional);
    }
    if (typeof isFreeAgent === 'boolean') {
      profileQuery = profileQuery.eq('is_free_agent', isFreeAgent);
    }
    if (typeof isForeignPlayer === 'boolean') {
      profileQuery = profileQuery.eq('is_foreign_player', isForeignPlayer);
    }

    // Apply text search filters
    if (mlbAffiliate) {
      profileQuery = profileQuery.ilike('mlb_affiliate', `%${mlbAffiliate}%`);
    }
    if (independentLeague) {
      profileQuery = profileQuery.ilike('independent_league', `%${independentLeague}%`);
    }

    profileQuery = profileQuery.limit(Math.min(limit, 50));

    const { data: profiles, error: profilesError } = await profileQuery;

    if (profilesError) {
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
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
      .in('player_id', profiles.map(p => p.id));

    if (followsError) {
      console.error('Error fetching follows:', followsError);
    }

    const followMap = new Map(follows?.map(f => [f.player_id, f.status]) || []);

    // Apply client-side height/weight filtering (since we need to parse strings)
    let filteredProfiles = profiles;
    
    if (heightMin || heightMax) {
      filteredProfiles = filteredProfiles.filter(profile => {
        if (!profile.height) return false;
        const heightInches = parseHeightToInches(profile.height);
        if (!heightInches) return false;
        
        const minInches = heightMin ? parseHeightToInches(heightMin) : null;
        const maxInches = heightMax ? parseHeightToInches(heightMax) : null;
        
        if (minInches && heightInches < minInches) return false;
        if (maxInches && heightInches > maxInches) return false;
        return true;
      });
    }

    if (weightMin || weightMax) {
      filteredProfiles = filteredProfiles.filter(profile => {
        if (!profile.weight) return false;
        const weightPounds = parseWeightToPounds(profile.weight);
        if (!weightPounds) return false;
        
        const minPounds = weightMin ? parseInt(weightMin) : null;
        const maxPounds = weightMax ? parseInt(weightMax) : null;
        
        if (minPounds && weightPounds < minPounds) return false;
        if (maxPounds && weightPounds > maxPounds) return false;
        return true;
      });
    }

    // Apply sport filter by checking subscriptions
    if (sport && (sport === 'baseball' || sport === 'softball')) {
      const profileIds = filteredProfiles.map(p => p.id);
      if (profileIds.length > 0) {
        const { data: subs } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id, subscribed_modules')
          .in('user_id', profileIds);

        const sportPrefix = sport + '_';
        const matchingUserIds = new Set(
          subs?.filter(s => 
            s.subscribed_modules?.some((m: string) => m.startsWith(sportPrefix))
          ).map(s => s.user_id) || []
        );

        filteredProfiles = filteredProfiles.filter(p => matchingUserIds.has(p.id));
      }
    }

    const results = filteredProfiles.map(profile => ({
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
    const message = (error && typeof error === 'object' && 'message' in (error as any))
      ? (error as any).message
      : String(error ?? 'Unknown error');
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
