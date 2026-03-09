import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, userId } = await req.json();

    if (!idea || typeof idea !== 'string' || idea.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Idea text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Hammers Modality <onboarding@resend.dev>',
        to: ['HammersModality@gmail.com'],
        subject: `💡 New Idea Submission from Hammers Modality`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Idea Submitted</h2>
            <p style="color: #666; font-size: 14px;">Submitted at: ${timestamp}</p>
            ${userId ? `<p style="color: #666; font-size: 14px;">User ID: ${userId}</p>` : ''}
            <hr style="border: 1px solid #eee; margin: 16px 0;" />
            <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; border-left: 4px solid #6366f1;">
              <p style="color: #333; font-size: 16px; white-space: pre-wrap; margin: 0;">${idea.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      throw new Error(`Resend API failed [${emailResponse.status}]: ${errorData}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error submitting idea:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
