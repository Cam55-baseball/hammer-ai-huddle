// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RecapEmailRequest {
  recipientEmail: string;
  recipientName: string;
  recapData: {
    recap_period_start: string;
    recap_period_end: string;
    summary?: string;
    highlights?: string[];
    improvements?: string[];
    recommendations?: string[];
    workout_stats?: {
      total_workouts: number;
      total_weight: number;
      weight_increases: number;
    };
    mental_stats?: {
      avg_mental: number;
      avg_emotional: number;
      avg_physical: number;
      quiz_count: number;
    };
  };
  athleteName: string;
  totalWeightLifted?: number;
  strengthChangePercent?: number;
  pdfBase64?: string;
}

function stripBase64DataUrl(maybeDataUrl: string): string {
  return maybeDataUrl.replace(/^data:application\/pdf;base64,/, "");
}

async function sendWithResend(params: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: string }>;
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Hammers Modality <onboarding@resend.dev>",
      to: [params.to],
      subject: params.subject,
      html: params.html,
      attachments: params.attachments,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Resend error response:", json);
    throw new Error(
      typeof json?.message === "string" ? json.message : "Failed to send email"
    );
  }
  return json as { id?: string };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RecapEmailRequest = await req.json();
    const {
      recipientEmail,
      recipientName,
      recapData,
      athleteName,
      totalWeightLifted,
      strengthChangePercent,
      pdfBase64,
    } = body;

    console.log("Sending recap email to:", recipientEmail);

    const startDate = new Date(recapData.recap_period_start).toLocaleDateString(
      "en-US",
      { month: "long", day: "numeric", year: "numeric" }
    );
    const endDate = new Date(recapData.recap_period_end).toLocaleDateString(
      "en-US",
      { month: "long", day: "numeric", year: "numeric" }
    );

    const highlightsHtml =
      recapData.highlights
        ?.map((h) => `<li style="margin-bottom: 8px;">${h}</li>`)
        .join("") ?? "";
    const improvementsHtml =
      recapData.improvements
        ?.map((i) => `<li style="margin-bottom: 8px;">${i}</li>`)
        .join("") ?? "";
    const recommendationsHtml =
      recapData.recommendations
        ?.map((r) => `<li style="margin-bottom: 8px;">${r}</li>`)
        .join("") ?? "";

    const strengthBlock =
      typeof strengthChangePercent === "number" && strengthChangePercent !== 0
        ? `
          <div style="flex: 1; min-width: 120px; background: #f3f4f6; padding: 16px; border-radius: 12px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: ${
              strengthChangePercent > 0 ? "#22c55e" : "#ef4444"
            };">
              ${strengthChangePercent > 0 ? "+" : ""}${strengthChangePercent}%
            </div>
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Strength</div>
          </div>
        `
        : "";

    const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
        <h1 style="color: #8b5cf6; margin: 0 0 8px 0; font-size: 28px;">6-Week Training Recap</h1>
        <p style="color: #e5e7eb; margin: 0; font-size: 16px;">${startDate} - ${endDate}</p>
      </div>

      <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${recipientName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          <strong>${athleteName}</strong> has shared their 6-week training recap with you!
        </p>

        <div style="display: flex; gap: 16px; margin: 24px 0; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 120px; background: #f3f4f6; padding: 16px; border-radius: 12px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #8b5cf6;">${recapData.workout_stats?.total_workouts || 0}</div>
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Workouts</div>
          </div>

          <div style="flex: 1; min-width: 120px; background: #f3f4f6; padding: 16px; border-radius: 12px; text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #f97316;">${(totalWeightLifted || 0).toLocaleString()}</div>
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Lbs Lifted</div>
          </div>

          ${strengthBlock}
        </div>

        ${recapData.summary ? `<p style="color: #374151; font-size: 14px; line-height: 1.6;"><strong>Summary:</strong> ${recapData.summary}</p>` : ""}

        ${highlightsHtml ? `<h3 style="margin: 18px 0 8px; color: #111827;">Highlights</h3><ul style="margin: 0; padding-left: 18px; color: #374151;">${highlightsHtml}</ul>` : ""}
        ${improvementsHtml ? `<h3 style="margin: 18px 0 8px; color: #111827;">Areas to Improve</h3><ul style="margin: 0; padding-left: 18px; color: #374151;">${improvementsHtml}</ul>` : ""}
        ${recommendationsHtml ? `<h3 style="margin: 18px 0 8px; color: #111827;">Recommendations</h3><ul style="margin: 0; padding-left: 18px; color: #374151;">${recommendationsHtml}</ul>` : ""}

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
          This recap was shared via <strong>Hammers Modality</strong> - Elite Baseball & Softball Training
        </p>
      </div>
    </div>
  </body>
</html>
    `.trim();

    const attachments =
      typeof pdfBase64 === "string" && pdfBase64.length > 0
        ? [
            {
              filename: `training-recap-${recapData.recap_period_end}.pdf`,
              content: stripBase64DataUrl(pdfBase64),
            },
          ]
        : undefined;

    const emailResponse = await sendWithResend({
      to: recipientEmail,
      subject: `${athleteName}'s 6-Week Training Recap`,
      html: htmlContent,
      attachments,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, id: emailResponse.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in send-recap-email function:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});