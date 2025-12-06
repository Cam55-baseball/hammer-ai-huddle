import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Challenge library - 12 themed challenges that rotate weekly
const CHALLENGES = [
  {
    id: 'focus_week',
    category: 'mental_mastery',
    totalDays: 7,
  },
  {
    id: 'leadership_week',
    category: 'leadership',
    totalDays: 7,
  },
  {
    id: 'gratitude_week',
    category: 'emotional_balance',
    totalDays: 7,
  },
  {
    id: 'visualization_week',
    category: 'mental_mastery',
    totalDays: 7,
  },
  {
    id: 'discipline_week',
    category: 'life_mastery',
    totalDays: 7,
  },
  {
    id: 'encouragement_week',
    category: 'leadership',
    totalDays: 7,
  },
  {
    id: 'presence_week',
    category: 'life_mastery',
    totalDays: 7,
  },
  {
    id: 'accountability_week',
    category: 'leadership',
    totalDays: 7,
  },
  {
    id: 'calm_week',
    category: 'emotional_balance',
    totalDays: 7,
  },
  {
    id: 'purpose_week',
    category: 'life_mastery',
    totalDays: 7,
  },
  {
    id: 'energy_week',
    category: 'leadership',
    totalDays: 7,
  },
  {
    id: 'reset_day',
    category: 'emotional_balance',
    totalDays: 1,
  },
];

// Challenge badges
const CHALLENGE_BADGES = [
  { id: 'challenge_starter', threshold: 1 },
  { id: 'challenge_warrior', threshold: 5 },
  { id: 'challenge_champion', threshold: 10 },
  { id: 'challenge_legend', threshold: 25 },
];

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { action, ...body } = await req.json().catch(() => ({}));
    const userId = user.id;
    const today = new Date();
    const currentWeek = getWeekNumber(today);
    const currentYear = today.getFullYear();

    console.log(`[get-weekly-challenge] User: ${userId}, Week: ${currentWeek}, Year: ${currentYear}, Action: ${action}`);

    // Get current week's challenge for this user
    let { data: challengeData, error: challengeError } = await supabase
      .from('mind_fuel_challenges')
      .select('*')
      .eq('user_id', userId)
      .eq('challenge_week', currentWeek)
      .eq('challenge_year', currentYear)
      .maybeSingle();

    // Get completed challenges count for badges
    const { count: completedCount } = await supabase
      .from('mind_fuel_challenges')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    // Get challenge history
    const { data: historyData } = await supabase
      .from('mind_fuel_challenges')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(10);

    // Handle check-in action
    if (action === 'check_in' && challengeData) {
      if (challengeData.status === 'active') {
        const newDaysCompleted = Math.min(
          challengeData.days_completed + 1,
          challengeData.total_days
        );
        
        const isNowCompleted = newDaysCompleted >= challengeData.total_days;
        
        const { error: updateError } = await supabase
          .from('mind_fuel_challenges')
          .update({
            days_completed: newDaysCompleted,
            status: isNowCompleted ? 'completed' : 'active',
            completed_at: isNowCompleted ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', challengeData.id);

        if (updateError) {
          console.error('[get-weekly-challenge] Check-in error:', updateError);
          throw updateError;
        }

        // Update local data for response
        challengeData.days_completed = newDaysCompleted;
        challengeData.status = isNowCompleted ? 'completed' : 'active';

        // Track new badges for response
        let awardedBadges: string[] = [];

        // Check for new challenge badges
        if (isNowCompleted) {
          const newCompletedCount = (completedCount || 0) + 1;
          
          // Get user's mind fuel streak data for badge updates
          const { data: streakData } = await supabase
            .from('mind_fuel_streaks')
            .select('badges_earned')
            .eq('user_id', userId)
            .maybeSingle();

          if (streakData) {
            let badgesEarned = streakData.badges_earned || [];

            for (const badge of CHALLENGE_BADGES) {
              if (newCompletedCount >= badge.threshold && !badgesEarned.includes(badge.id)) {
                badgesEarned = [...badgesEarned, badge.id];
                awardedBadges.push(badge.id);
              }
            }

            // Check for perfect week badge
            if (newDaysCompleted === challengeData.total_days && !badgesEarned.includes('perfect_week')) {
              badgesEarned = [...badgesEarned, 'perfect_week'];
              awardedBadges.push('perfect_week');
            }

            // Check for comeback_kid badge (completed after having a failed challenge)
            const { data: failedChallenges } = await supabase
              .from('mind_fuel_challenges')
              .select('id')
              .eq('user_id', userId)
              .eq('status', 'failed')
              .limit(1);

            if (failedChallenges && failedChallenges.length > 0 && !badgesEarned.includes('comeback_kid')) {
              badgesEarned = [...badgesEarned, 'comeback_kid'];
              awardedBadges.push('comeback_kid');
            }

            if (awardedBadges.length > 0) {
              await supabase
                .from('mind_fuel_streaks')
                .update({ badges_earned: badgesEarned })
                .eq('user_id', userId);
              
              console.log(`[get-weekly-challenge] Awarded badges: ${awardedBadges.join(', ')}`);
            }
          }
        }

        // Store awarded badges for response
        (challengeData as any).newBadges = awardedBadges;

        console.log(`[get-weekly-challenge] Check-in successful. Days: ${newDaysCompleted}/${challengeData.total_days}`);
      }
    }

    // Handle start challenge action
    if (action === 'start' && !challengeData) {
      // Determine which challenge to assign (rotate based on week number)
      const challengeIndex = currentWeek % CHALLENGES.length;
      const selectedChallenge = CHALLENGES[challengeIndex];

      const { data: newChallenge, error: insertError } = await supabase
        .from('mind_fuel_challenges')
        .insert({
          user_id: userId,
          challenge_week: currentWeek,
          challenge_year: currentYear,
          challenge_id: selectedChallenge.id,
          status: 'active',
          days_completed: 0,
          total_days: selectedChallenge.totalDays,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[get-weekly-challenge] Start error:', insertError);
        throw insertError;
      }

      challengeData = newChallenge;
      console.log(`[get-weekly-challenge] Started challenge: ${selectedChallenge.id}`);
    }

    // Calculate days remaining in week
    const dayOfWeek = today.getDay();
    const daysRemainingInWeek = 7 - dayOfWeek;

    // Get challenge definition if active
    let currentChallengeDefinition = null;
    if (challengeData) {
      currentChallengeDefinition = CHALLENGES.find(c => c.id === challengeData.challenge_id);
    }

    // If no challenge started yet, show what this week's challenge would be
    let availableChallenge = null;
    if (!challengeData) {
      const challengeIndex = currentWeek % CHALLENGES.length;
      availableChallenge = CHALLENGES[challengeIndex];
    }

    const response = {
      currentChallenge: challengeData ? {
        ...challengeData,
        definition: currentChallengeDefinition,
      } : null,
      availableChallenge,
      daysRemainingInWeek,
      completedChallengesCount: completedCount || 0,
      history: historyData || [],
      newBadges: (challengeData as any)?.newBadges || [],
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[get-weekly-challenge] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
