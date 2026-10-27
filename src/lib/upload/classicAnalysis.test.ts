import { describe, expect, it } from "vitest";
import { CLASSIC_GATEWAY_URL, classicGatewayCompletion, classicRequestBody } from "../../../supabase/functions/_shared/classicAnalysis";
import { ANALYSIS_ROUTES, reliableAnalysis } from "../../../supabase/functions/_shared/analysisReliability";

const full = { choices: [{ message: { tool_calls: [{ function: { arguments: JSON.stringify({
  summary: ["Get your front foot down first"], feedback: "Your shoulders turn before your foot lands.",
  positives: ["Balanced setup"], improvements: [{ key: "early_shoulder_rotation" }], drills: [{ title: "Pause at landing" }],
}) } }] } }] };
const req = { model: "x", messages: [{ role: "user" as const, content: [{ type: "image_url", image_url: { url: "data:image/jpeg;base64,AAAA" } }] }], tools: [{ type: "function", function: { name: "return_analysis", parameters: {} } }], tool_choice: { type: "function", function: { name: "return_analysis" } }, temperature: 0 };

describe("classic analysis engine", () => {
  it("is always the first attempt", () => expect(ANALYSIS_ROUTES[0]).toBe("classic:google/gemini-2.5-flash"));
  it("sends the January request: Gemini 2.5 Flash, frames as images, forced return_analysis", () => {
    const body = classicRequestBody(req as never);
    expect(body.model).toBe("google/gemini-2.5-flash");
    expect(body.tool_choice).toEqual({ type: "function", function: { name: "return_analysis" } });
    expect(JSON.stringify(body.messages)).toContain("image_url");
  });
  it("posts to the Lovable AI Gateway and returns the full report on the first try", async () => {
    const seen: string[] = [];
    const fetchImpl = (async (url: string) => { seen.push(url); return new Response(JSON.stringify(full), { status: 200 }); }) as unknown as typeof fetch;
    const routes: string[] = [];
    const result = await reliableAnalysis(async (route) => { routes.push(route); return classicGatewayCompletion(req as never, { fetchImpl, apiKey: "k" }); }, async () => {});
    expect(seen).toEqual([CLASSIC_GATEWAY_URL]);
    expect(routes).toEqual(["classic:google/gemini-2.5-flash"]);
    expect(result.ok).toBe(true);
    expect(result.provider).toBe("lovable");
  });
  it("credit or access denials on the classic engine end the request without rerouting", async () => {
    for (const status of [402, 403]) {
      const routes: string[] = [];
      const fetchImpl = (async () => new Response("{}", { status })) as unknown as typeof fetch;
      const result = await reliableAnalysis(async (route) => { routes.push(route); return classicGatewayCompletion(req as never, { fetchImpl, apiKey: "k" }); }, async () => {});
      expect(routes).toEqual(["classic:google/gemini-2.5-flash"]);
      expect(result.status).toBe(status);
    }
  });
  it("a busy classic engine falls to today's route after waiting", async () => {
    const events: string[] = [];
    await reliableAnalysis(async (route) => { events.push(route); return route.startsWith("classic") ? { ok: false, status: 503, data: {} } : { ok: true, status: 200, data: full }; }, async () => {}, async () => { events.push("wait"); });
    expect(events).toEqual(["classic:google/gemini-2.5-flash", "wait", "google/gemini-2.5-flash"]);
  });
});
