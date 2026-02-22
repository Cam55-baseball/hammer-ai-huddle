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

    // Authenticate user
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

    const { messages, analysisContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Messages array is required");
    }

    // Use authenticated userId instead of accepting from request
    const userId = user.id;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch owner's profile to get coaching philosophy
    let ownerBio = "";
    let ownerName = "Coach";

    const { data: ownerRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "owner")
      .maybeSingle();

    if (ownerRole) {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("full_name, bio")
        .eq("id", ownerRole.user_id)
        .single();

      if (ownerProfile) {
        ownerName = ownerProfile.full_name || "Coach";
        ownerBio = ownerProfile.bio || "";
      }
    }

    // Get user context for authenticated user
    let userContext = "";
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("subscribed_modules")
      .eq("user_id", userId)
      .single();

    const { data: progress } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", userId);

    if (subscription || progress) {
      userContext = `\n\nUser Context:\n`;
      if (subscription?.subscribed_modules) {
        userContext += `Active Modules: ${subscription.subscribed_modules.join(", ")}\n`;
      }
      if (progress && progress.length > 0) {
        userContext += `Progress:\n`;
        progress.forEach((p: any) => {
          userContext += `- ${p.sport} ${p.module}: ${p.videos_analyzed} videos, avg score: ${p.average_efficiency_score || "N/A"}\n`;
        });
      }
    }

    let analysisContextSection = "";
    if (analysisContext) {
      analysisContextSection = `\n\nANALYSIS CONTEXT:\nThe athlete just received the following analysis. Use this context to answer their follow-up questions with specific, personalized advice:\n${analysisContext}\n`;
    }

    const systemPrompt = `You are an expert biomechanics coach for baseball and softball athletes. You provide detailed, actionable advice on hitting, pitching, and throwing mechanics.

${ownerBio ? `Follow the coaching philosophy below unless the user asks otherwise.\n\nCoach: ${ownerName}\nPhilosophy: ${ownerBio}\n` : ''}
${userContext}
${analysisContextSection}
Provide clear, concise responses focused on improving athletic performance. Use technical terminology when appropriate but explain concepts clearly.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
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
    console.error("Error in ai-chat function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
