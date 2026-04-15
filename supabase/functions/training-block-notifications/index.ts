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

    // 1. Snapshot-ID batch: select IDs first, then update exactly those rows
    const affectedBlockIds = new Set<string>();
    do {
      // Step A: snapshot target IDs (read-only, stable)
      const { data: targets } = await supabase
        .from('block_workouts')
        .select('id, block_id')
        .eq('status', 'scheduled')
        .lt('scheduled_date', today)
        .order('id', { ascending: true })
        .limit(500);
      if (!targets || targets.length === 0) break;

      const targetIds = targets.map(t => t.id);

      // Step B: update exactly those IDs
      await supabase
        .from('block_workouts')
        .update({ status: 'missed' })
        .in('id', targetIds);

      results.missedMarked += targets.length;
      for (const w of targets) affectedBlockIds.add(w.block_id);
    } while (true);

    // Update status for affected blocks
    if (affectedBlockIds.size > 0) {
      await Promise.all(
        [...affectedBlockIds].map(bid =>
          supabase.rpc('update_block_status_service', { p_block_id: bid })
        )
      );
    }

    // 2. Cursor-based: today's workouts
    let todayCursor: string | null = null;
    do {
      let query = supabase
        .from('block_workouts')
        .select('id')
        .eq('scheduled_date', today)
        .eq('status', 'scheduled')
        .order('id', { ascending: true })
        .limit(500);
      if (todayCursor) query = query.gt('id', todayCursor);
      const { data } = await query;
      if (!data || data.length === 0) break;
      results.dailyChecks += data.length;
      todayCursor = data[data.length - 1].id;
    } while (true);

    // 3. Weekly adherence check (Mondays)
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 1) {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekStr = lastWeek.toISOString().split('T')[0];

      let blockCursor: string | null = null;
      do {
        let query = supabase
          .from('training_blocks')
          .select('id, user_id')
          .in('status', ['active', 'nearing_completion'])
          .order('id', { ascending: true })
          .limit(500);
        if (blockCursor) query = query.gt('id', blockCursor);
        const { data: activeBlocks } = await query;
        if (!activeBlocks || activeBlocks.length === 0) break;
        blockCursor = activeBlocks[activeBlocks.length - 1].id;

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
      } while (true);
    }

    // 4. End-of-block prompts (cursor-based)
    let regenerationCursor: string | null = null;
    do {
      let query = supabase
        .from('training_blocks')
        .select('id')
        .eq('status', 'ready_for_regeneration')
        .order('id', { ascending: true })
        .limit(500);
      if (regenerationCursor) query = query.gt('id', regenerationCursor);
      const { data } = await query;
      if (!data || data.length === 0) break;
      results.endOfBlockPrompts += data.length;
      regenerationCursor = data[data.length - 1].id;
    } while (true);

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
