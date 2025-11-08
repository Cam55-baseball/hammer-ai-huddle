import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  action: z.enum(["pause", "cancel"], { errorMap: () => ({ message: "Action must be 'pause' or 'cancel'" }) }),
  feedback: z.string().trim().min(1, "Feedback is required").max(2000, "Feedback must be less than 2000 characters"),
  userName: z.string().trim().max(200, "Name must be less than 200 characters"),
  userEmail: z.string().email("Invalid email format").max(255, "Email must be less than 255 characters"),
  userId: z.string().uuid("Invalid user ID format"),
  modules: z.array(z.string()).max(50, "Too many modules specified"),
});

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBSCRIPTION-FEEDBACK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Validate input
    const body = await req.json();
    const { action, feedback, userName, userEmail, userId, modules } = requestSchema.parse(body);
    logStep("Feedback data received", { action, userName });

    // Get owner's email from user_roles table
    const { data: ownerRoles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'owner')
      .limit(1);

    if (rolesError || !ownerRoles || ownerRoles.length === 0) {
      logStep("No owner found", { error: rolesError?.message });
      throw new Error("Owner not found");
    }

    const ownerId = ownerRoles[0].user_id;
    logStep("Owner found", { ownerId });

    // Get owner's email from auth.users
    const { data: ownerData, error: ownerError } = await supabaseClient.auth.admin.getUserById(ownerId);
    if (ownerError || !ownerData?.user?.email) {
      logStep("Owner email not found", { error: ownerError?.message });
      throw new Error("Owner email not found");
    }

    const ownerEmail = ownerData.user.email;
    logStep("Owner email retrieved", { ownerEmail });

    // Format action for email
    const actionText = action === 'pause' ? 'Pause' : 'End';
    const timestamp = new Date().toLocaleString('en-US', { 
      dateStyle: 'medium', 
      timeStyle: 'short',
      timeZone: 'America/New_York'
    });

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "HammerAI Huddle <onboarding@resend.dev>",
      to: [ownerEmail],
      subject: `Subscription ${actionText} Feedback from ${userName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #DC2626;">Subscription ${actionText} Feedback</h2>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>User:</strong> ${userName}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${userEmail}</p>
            <p style="margin: 5px 0;"><strong>Action:</strong> ${actionText} Subscription</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${timestamp}</p>
          </div>

          <div style="margin: 20px 0;">
            <h3 style="color: #374151;">Feedback:</h3>
            <div style="background: #fff; padding: 15px; border-left: 4px solid #DC2626; border-radius: 4px;">
              ${feedback.replace(/\n/g, '<br>')}
            </div>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <div style="font-size: 12px; color: #6b7280;">
            <p style="margin: 5px 0;"><strong>User ID:</strong> ${userId}</p>
            <p style="margin: 5px 0;"><strong>Subscribed Modules:</strong> ${modules.length > 0 ? modules.join(', ') : 'None'}</p>
          </div>
        </div>
      `,
    });

    logStep("Email sent successfully", { response: emailResponse });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // Return validation errors with 400 status
    if (error instanceof z.ZodError) {
      logStep("Validation error", { errors: error.errors });
      return new Response(JSON.stringify({ error: "Validation error", details: error.errors }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in send-subscription-feedback", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});