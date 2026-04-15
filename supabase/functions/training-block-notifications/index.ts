import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];
    const results = { dailyChecks: 0, weeklyFlags: 0, endOfBlockPrompts: 0, missedMarked: 0 };

    // 1. Mark past scheduled workouts as missed
    const { data: pastWorkouts } = await supabase
      .from('block_workouts')
      .select('id, block_id')
      .eq('status', 'scheduled')
      .lt('scheduled_date', today);

    if (pastWorkouts && pastWorkouts.length > 0) {
      for (const pw of pastWorkouts) {
        await supabase
          .from('block_workouts')
          .update({ status: 'missed' })
          .eq('id', pw.id);
      }
      results.missedMarked = pastWorkouts.length;

      // Update block statuses for affected blocks
      const blockIds = [...new Set(pastWorkouts.map(w => w.block_id))];
      for (const bid of blockIds) {
        // Use service role — bypass RLS
        const { data: block } = await supabase
          .from('training_blocks')
          .select('id, status')
          .eq('id', bid)
          .single();

        if (block && block.status !== 'archived') {
          const { data: workouts } = await supabase
            .from('block_workouts')
            .select('status')
            .eq('block_id', bid);

          if (workouts) {
            const total = workouts.length;
            const completed = workouts.filter(w => w.status === 'completed').length;
            const remaining = workouts.filter(w => w.status === 'scheduled').length;

            let newStatus = 'active';
            if (remaining === 0) newStatus = 'archived';
            else if (remaining <= 3) newStatus = 'ready_for_regeneration';
            else if (total > 0 && (completed / total) >= 0.85) newStatus = 'nearing_completion';

            if (newStatus !== block.status) {
              await supabase
                .from('training_blocks')
                .update({ status: newStatus })
                .eq('id', bid);
            }
          }
        }
      }
    }

    // 2. Check for today's workouts (daily notification data)
    const { data: todayWorkouts } = await supabase
      .from('block_workouts')
      .select('id, block_id, workout_type, estimated_duration')
      .eq('scheduled_date', today)
      .eq('status', 'scheduled');

    results.dailyChecks = todayWorkouts?.length || 0;

    // 3. Weekly adherence check (run on Mondays)
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 1) {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekStr = lastWeek.toISOString().split('T')[0];

      const { data: activeBlocks } = await supabase
        .from('training_blocks')
        .select('id, user_id')
        .in('status', ['active', 'nearing_completion']);

      if (activeBlocks) {
        for (const ab of activeBlocks) {
          const { data: weekWorkouts } = await supabase
            .from('block_workouts')
            .select('status')
            .eq('block_id', ab.id)
            .gte('scheduled_date', lastWeekStr)
            .lt('scheduled_date', today);

          if (weekWorkouts && weekWorkouts.length > 0) {
            const completed = weekWorkouts.filter(w => w.status === 'completed').length;
            const adherence = completed / weekWorkouts.length;
            if (adherence < 0.6) {
              results.weeklyFlags++;
            }
          }
        }
      }
    }

    // 4. End-of-block prompts
    const { data: readyBlocks } = await supabase
      .from('training_blocks')
      .select('id, user_id')
      .eq('status', 'ready_for_regeneration');

    results.endOfBlockPrompts = readyBlocks?.length || 0;

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in training-block-notifications:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
