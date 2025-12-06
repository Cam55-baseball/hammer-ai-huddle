import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Badge definitions
const STREAK_BADGES = [
  { id: 'mind_starter', days: 1, name: 'Mind Starter' },
  { id: 'week_focus', days: 7, name: 'Week of Focus' },
  { id: 'consistency_champ', days: 30, name: 'Consistency Champ' },
  { id: 'mental_warrior', days: 60, name: 'Mental Warrior' },
  { id: 'limitless_leader', days: 100, name: 'Limitless Leader' },
  { id: 'unbreakable_mind', days: 365, name: 'Unbreakable Mind' },
];

const CATEGORY_BADGES = [
  { id: 'focus_master', category: 'mental_mastery', threshold: 20, name: 'Focus Master' },
  { id: 'peace_practitioner', category: 'emotional_balance', threshold: 20, name: 'Peace Practitioner' },
  { id: 'leadership_elite', category: 'leadership', threshold: 20, name: 'Leadership Elite' },
  { id: 'discipline_engine', category: 'life_mastery', threshold: 20, name: 'Discipline Engine' },
];

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

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { sport = 'both' } = await req.json().catch(() => ({}));
    const userId = user.id;
    const today = new Date().toISOString().split('T')[0];

    console.log(`[get-daily-lesson] User: ${userId}, Sport: ${sport}, Date: ${today}`);

    // Get or create streak data
    let { data: streakData, error: streakError } = await supabase
      .from('mind_fuel_streaks')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!streakData) {
      // Create new streak record
      const { data: newStreak, error: insertError } = await supabase
        .from('mind_fuel_streaks')
        .insert({
          user_id: userId,
          current_streak: 0,
          longest_streak: 0,
          total_visits: 0,
          lessons_collected: 0,
          badges_earned: [],
          categories_explored: {},
          last_visit_date: null,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[get-daily-lesson] Error creating streak:', insertError);
        throw insertError;
      }
      streakData = newStreak;
    }

    // Update streak logic
    let currentStreak = streakData.current_streak || 0;
    let longestStreak = streakData.longest_streak || 0;
    let totalVisits = streakData.total_visits || 0;
    let lessonsCollected = streakData.lessons_collected || 0;
    let badgesEarned = streakData.badges_earned || [];
    let categoriesExplored = streakData.categories_explored || {};
    const lastVisitDate = streakData.last_visit_date;

    // Check if already visited today
    const alreadyVisitedToday = lastVisitDate === today;

    if (!alreadyVisitedToday) {
      // Update streak
      if (lastVisitDate) {
        const lastDate = new Date(lastVisitDate);
        const todayDate = new Date(today);
        const diffTime = todayDate.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive day
          currentStreak += 1;
        } else if (diffDays > 1) {
          // Check for reset badge
          if (diffDays >= 7 && !badgesEarned.includes('the_reset')) {
            badgesEarned = [...badgesEarned, 'the_reset'];
          }
          // Streak broken
          currentStreak = 1;
        }
      } else {
        // First visit ever
        currentStreak = 1;
      }

      // Update longest streak
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }

      totalVisits += 1;
    }

    // Check for streak badges
    const newBadges: string[] = [];
    for (const badge of STREAK_BADGES) {
      if (currentStreak >= badge.days && !badgesEarned.includes(badge.id)) {
        badgesEarned = [...badgesEarned, badge.id];
        newBadges.push(badge.id);
      }
    }

    // Get viewed lessons count for today
    const { count: todayViewCount } = await supabase
      .from('user_viewed_lessons')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('viewed_at', `${today}T00:00:00`)
      .lte('viewed_at', `${today}T23:59:59`);

    const dailyLimit = 1;
    const lessonsRemainingToday = Math.max(0, dailyLimit - (todayViewCount || 0));

    // Get total lessons and viewed lessons
    const { count: totalLessons } = await supabase
      .from('mind_fuel_lessons')
      .select('*', { count: 'exact', head: true })
      .or(`sport.eq.${sport},sport.eq.both`);

    const { count: viewedLessons } = await supabase
      .from('user_viewed_lessons')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    let lesson = null;
    let isNewLesson = false;

    if (lessonsRemainingToday > 0) {
      // Get a random unviewed lesson
      const { data: viewedIds } = await supabase
        .from('user_viewed_lessons')
        .select('lesson_id')
        .eq('user_id', userId);

      const viewedIdList = viewedIds?.map(v => v.lesson_id) || [];

      let query = supabase
        .from('mind_fuel_lessons')
        .select('*')
        .or(`sport.eq.${sport},sport.eq.both`);

      if (viewedIdList.length > 0) {
        query = query.not('id', 'in', `(${viewedIdList.join(',')})`);
      }

      const { data: availableLessons } = await query;

      if (availableLessons && availableLessons.length > 0) {
        // Pick random lesson
        const randomIndex = Math.floor(Math.random() * availableLessons.length);
        lesson = availableLessons[randomIndex];
        isNewLesson = true;

        // Mark as viewed
        await supabase
          .from('user_viewed_lessons')
          .insert({
            user_id: userId,
            lesson_id: lesson.id,
          });

        lessonsCollected += 1;

        // Update categories explored
        const category = lesson.category;
        categoriesExplored[category] = (categoriesExplored[category] || 0) + 1;

        // Check for category badges
        for (const badge of CATEGORY_BADGES) {
          if (
            categoriesExplored[badge.category] >= badge.threshold &&
            !badgesEarned.includes(badge.id)
          ) {
            badgesEarned = [...badgesEarned, badge.id];
            newBadges.push(badge.id);
          }
        }

        // Check for breakthrough badge (50 lessons)
        if (lessonsCollected === 50 && !badgesEarned.includes('breakthrough_day')) {
          badgesEarned = [...badgesEarned, 'breakthrough_day'];
          newBadges.push('breakthrough_day');
        }

        // Check for unlocked potential badge (all categories explored)
        const allCategories = ['mental_mastery', 'emotional_balance', 'leadership', 'life_mastery'];
        const allExplored = allCategories.every(cat => (categoriesExplored[cat] || 0) > 0);
        if (allExplored && !badgesEarned.includes('unlocked_potential')) {
          badgesEarned = [...badgesEarned, 'unlocked_potential'];
          newBadges.push('unlocked_potential');
        }
      } else {
        // All lessons viewed - could generate AI lesson here in future
        console.log('[get-daily-lesson] All lessons viewed for user');
      }
    }

    // Update streak data
    const { error: updateError } = await supabase
      .from('mind_fuel_streaks')
      .update({
        current_streak: currentStreak,
        longest_streak: longestStreak,
        total_visits: totalVisits,
        lessons_collected: lessonsCollected,
        badges_earned: badgesEarned,
        categories_explored: categoriesExplored,
        last_visit_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[get-daily-lesson] Error updating streak:', updateError);
    }

    const response = {
      lesson,
      isNewLesson,
      streak: {
        currentStreak,
        longestStreak,
        totalVisits,
        lessonsCollected,
        badgesEarned,
        categoriesExplored,
      },
      stats: {
        totalLessons: totalLessons || 0,
        viewedLessons: viewedLessons || 0,
        lessonsRemainingToday,
        dailyLimit,
      },
      newBadges,
    };

    console.log(`[get-daily-lesson] Response: streak=${currentStreak}, newBadges=${newBadges.length}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[get-daily-lesson] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
