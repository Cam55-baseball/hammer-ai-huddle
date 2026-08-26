/**
 * signup-age-check
 *
 * STOPGAP — pending legal review. This is NOT a COPPA-compliance system and
 * makes no compliance claim. It performs one job: compute age server-side
 * from a date of birth and report an age band so the signup form can refuse
 * to create accounts for users under 13.
 *
 * Deliberate constraints:
 *  - The ONLY input accepted is a date of birth. No email, name, or password
 *    is accepted or logged by this function.
 *  - Nothing is written to the database. No row, no log, no event.
 *  - Under-13 responses carry no workaround path and imply no consent.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type AgeBand = "under_13" | "minor_13_17" | "adult";

/** Whole years elapsed, evaluated in UTC. */
function computeAgeYears(dob: Date, now: Date): number {
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() &&
      now.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => null);
    const raw = (body as { date_of_birth?: unknown } | null)?.date_of_birth;

    if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return json({ error: "A date of birth (YYYY-MM-DD) is required." }, 400);
    }

    const dob = new Date(`${raw}T00:00:00.000Z`);
    if (Number.isNaN(dob.getTime())) {
      return json({ error: "That date isn't valid." }, 400);
    }

    const now = new Date();
    if (dob.getTime() > now.getTime()) {
      return json({ error: "That date is in the future." }, 400);
    }

    const ageYears = computeAgeYears(dob, now);
    if (ageYears > 120) {
      return json({ error: "That date isn't valid." }, 400);
    }

    const ageBand: AgeBand =
      ageYears < 13 ? "under_13" : ageYears < 18 ? "minor_13_17" : "adult";

    if (ageBand === "under_13") {
      // Fail closed. No account, no further data collection, no alternate path.
      return json({
        allowed: false,
        age_band: ageBand,
        message:
          "Signing up at this age requires a parent or guardian, and that isn't available yet. Account creation can't continue.",
      });
    }

    return json({
      allowed: true,
      age_band: ageBand,
      age_years: ageYears,
      // Placeholder only — 13–17 handling is unresolved and awaiting legal review.
      pending_legal_review: ageBand === "minor_13_17",
    });
  } catch {
    // Fail closed on anything unexpected.
    return json(
      { allowed: false, error: "Age check unavailable. Please try again." },
      500,
    );
  }
});
