import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl!, supabaseKey!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Messages array is required");
    }

    const userId = user.id;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch user role
    let userRole = "player";
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (roleData && roleData.length > 0) {
      const roles = roleData.map((r: any) => r.role);
      if (roles.includes("owner")) userRole = "owner";
      else if (roles.includes("admin")) userRole = "admin";
      else if (roles.includes("scout")) userRole = "scout";
      else if (roles.includes("coach")) userRole = "coach";
    }

    // Fetch subscribed modules
    let subscribedModules: string[] = [];
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("subscribed_modules")
      .eq("user_id", userId)
      .single();

    if (subscription?.subscribed_modules) {
      subscribedModules = subscription.subscribed_modules;
    }

    // Fetch owner contact email for fallback
    let supportEmail = "";
    const { data: ownerRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "owner")
      .maybeSingle();

    if (ownerRole) {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("contact_email")
        .eq("id", ownerRole.user_id)
        .single();
      if (ownerProfile?.contact_email) {
        supportEmail = ownerProfile.contact_email;
      }
    }

    // Map module keys to display names
    const tierNames: Record<string, string> = {
      'baseball_pitcher': 'Complete Pitcher (Baseball)',
      'softball_pitcher': 'Complete Pitcher (Softball)',
      'baseball_5tool': '5Tool Player (Baseball)',
      'softball_5tool': '5Tool Player (Softball)',
      'baseball_golden2way': 'Golden 2Way (Baseball)',
      'softball_golden2way': 'Golden 2Way (Softball)',
    };
    const displayModules = subscribedModules.map(m => tierNames[m] || m);

    const systemPrompt = `You are the Hammers Modality Help Desk Assistant — an in-app support AI for the Hammers Modality baseball and softball training platform.

YOUR ROLE: You help users navigate the app, explain features, troubleshoot issues, and answer frequently asked questions. You are NOT a biomechanics coach — do not provide training advice or mechanic analysis. If users ask about mechanics, politely direct them to the "Ask the Coach" feature inside the analysis pages.

USER CONTEXT:
- Role: ${userRole}
- Subscribed Tier: ${displayModules.length > 0 ? displayModules.join(", ") : "None (free tier)"}

APP STRUCTURE & NAVIGATION:
1. **Dashboard** (/dashboard) — Main hub showing subscribed tiers, Game Plan, quick actions
2. **Calendar** (/calendar) — Schedule and track training events, games, rest days
3. **5Tool Player** (/5tool-player) — Hitting + Throwing training hub with:
   - Hitting Video Analysis (/analyze/hitting)
   - Throwing Video Analysis (/analyze/throwing)
   - Production Lab (/production-lab) — Iron Bambino upgraded workout program
   - Speed Lab (/speed-lab) — Speed and agility training
   - Tex Vision (/tex-vision) — Visual training drills
4. **Complete Pitcher** (/complete-pitcher) — Pitching training hub with:
   - Pitching Video Analysis (/analyze/pitching)
   - Production Studio (/production-studio) — Pitching workout program (Heat Factory)
5. **The Golden 2Way** (/golden-2way) — Elite 2-way player hub with:
   - All features from 5Tool Player + Complete Pitcher
   - The Unicorn (/the-unicorn) — Merged elite workout system
6. **Players Club** (/players-club) — Community content and player resources
7. **The Vault** (/vault) — Personal training library with saved analyses, 6-week AI recaps
8. **Nutrition Hub** (/nutrition-hub) — Meal planning, food logging, hydration tracking, recipes
9. **Nutrition Tips** (/nutrition) — Daily nutrition tips and education
10. **Mind Fuel** (/mind-fuel) — Mental performance training, daily lessons, weekly challenges
11. **Bounce Back Bay** (/bounce-back-bay) — Injury prevention, recovery education, physio tracking
12. **Weather** (/weather) — Local weather for outdoor training planning
13. **Rankings** (/rankings) — Leaderboard comparing analysis scores
14. **My Activities** (/my-custom-activities) — Create and manage custom activity cards
15. **Profile** (/profile) — Update personal info, avatar, social links
16. **Help Desk** (/help-desk) — This page — FAQ, guides, AI chat support

SUBSCRIPTION TIERS:
- **Complete Pitcher** ($200/mo) — Pitching Analysis + Heat Factory (Production Studio)
- **5Tool Player** ($300/mo) — Hitting + Throwing Analysis, Iron Bambino (Production Lab), Speed Lab, Tex Vision
- **The Golden 2Way** ($400/mo) — Everything in both tiers + The Unicorn workout system

ROLE-SPECIFIC FEATURES:
- **Players**: Access training tiers, video analysis, vault, custom activities
- **Coaches** (/coach-dashboard): Manage players, share custom activities, view player progress
- **Scouts** (/scout-dashboard): Evaluate players, write scout letters, review videos
- **Admins** (/admin): User management, app settings
- **Owners** (/owner): Full control — manage users, subscriptions, scout applications, app settings

KEY FEATURES EXPLAINED:
- **Video Analysis**: Upload a video of your swing/pitch/throw → AI analyzes mechanics → provides efficiency score, feedback, drills, and a scorecard
- **Custom Activities**: Create personalized training cards with custom fields. Set recurring schedules, share with coaches.
- **The Vault**: Stores all your saved analyses. Every 6 weeks, an AI-generated recap summarizes your progress.
- **Game Plan**: Your daily schedule on the dashboard showing activities and training tasks for today.
- **Production Lab/Studio**: Progressive 6-week workout programs that loop continuously.
- **The Unicorn**: Elite merged workout combining strength, velocity development, speed, and arm care with CNS load management.
- **Tex Vision**: Daily vision training drills for pitch recognition. Streak tracking.
- **Speed Lab**: Speed and agility program with progressive tiers.

RESPONSE GUIDELINES:
- Be concise, friendly, and helpful
- Use step-by-step instructions when explaining how to do something
- Use bold for important terms and navigation paths
- If you genuinely cannot answer a question, say: "I'm not sure about that.${supportEmail ? ` Please contact support at ${supportEmail} for further help.` : ' Please contact support for further help.'}"
- Never make up features that don't exist
- Never provide biomechanics or training advice — redirect to "Ask the Coach" in analysis pages`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    return new Response(JSON.stringify({ message: assistantMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ai-helpdesk function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
