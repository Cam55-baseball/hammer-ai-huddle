import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, secretKey } = await req.json();

    // Validate inputs
    if (!email || !secretKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email and secret key are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verify secret key
    const expectedKey = Deno.env.get('OWNER_INIT_KEY');
    if (secretKey !== expectedKey) {
      console.error('Invalid secret key provided');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid secret key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if an owner already exists
    const { data: existingOwner, error: checkError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('role', 'owner')
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing owner:', checkError);
      throw checkError;
    }

    if (existingOwner) {
      return new Response(
        JSON.stringify({ success: false, error: 'Owner account already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      );
    }

    // Look up user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      throw userError;
    }

    const user = users?.find(u => u.email === email);
    
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'User with this email not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Insert owner role
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'owner',
        status: 'active'
      });

    if (insertError) {
      console.error('Error inserting owner role:', insertError);
      throw insertError;
    }

    console.log(`Owner account initialized successfully for user: ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Owner account initialized successfully',
        userId: user.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in initialize-owner function:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
