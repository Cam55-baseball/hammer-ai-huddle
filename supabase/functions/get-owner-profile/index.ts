import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to translate text using Lovable AI
async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (!text || targetLanguage === 'en') return text;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return text;

  const languageNames: Record<string, string> = {
    es: "Spanish",
    fr: "French",
    de: "German",
    ja: "Japanese",
    zh: "Chinese (Simplified)",
    nl: "Dutch",
    ko: "Korean",
  };

  const targetLangName = languageNames[targetLanguage] || targetLanguage;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Translate to ${targetLangName}. Return ONLY the translation, no explanations.`,
          },
          { role: "user", content: text },
        ],
      }),
    });

    if (!response.ok) return text;

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body for targetLanguage (optional)
    let targetLanguage = 'en';
    try {
      const body = await req.json();
      targetLanguage = body.targetLanguage || 'en';
    } catch {
      // No body or invalid JSON, use default English
    }

    // Get the owner's user_id from user_roles
    const { data: ownerRole, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "owner")
      .maybeSingle();

    if (roleError || !ownerRole) {
      return new Response(
        JSON.stringify({ full_name: null, bio: null, avatar_url: null }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get owner's profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name, contact_email, bio, avatar_url, credentials, social_instagram, social_twitter, social_facebook, social_linkedin, social_youtube, social_tiktok, social_website, social_website_2, social_website_3, social_website_4, social_website_5")
      .eq("id", ownerRole.user_id)
      .single();

    if (profileError) throw profileError;

    // Translate bio and credentials if targetLanguage is not English
    let translatedBio = profile.bio;
    let translatedCredentials = profile.credentials;

    if (targetLanguage !== 'en') {
      // Translate bio
      if (profile.bio) {
        translatedBio = await translateText(profile.bio, targetLanguage);
      }

      // Translate credentials array
      if (profile.credentials && profile.credentials.length > 0) {
        translatedCredentials = await Promise.all(
          profile.credentials.map((cred: string) => translateText(cred, targetLanguage))
        );
      }
    }

    // Construct response with both original and translated content
    const responseData = {
      ...profile,
      full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || null,
      bio: translatedBio,
      credentials: translatedCredentials,
      // Include originals for fallback
      original_bio: profile.bio,
      original_credentials: profile.credentials,
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in get-owner-profile function:", error);
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
