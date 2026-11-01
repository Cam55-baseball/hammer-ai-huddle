import { supabase } from '@/integrations/supabase/client';

/**
 * Asks the same server judge Start uses whether starting details are missing.
 * True only on a definite "missing" answer; unknown answers let the server decide.
 */
export async function startingDetailsMissing(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('initial_plan_missing');
    return !error && Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}
