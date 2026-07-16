import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listRecentEventsTool from "./tools/list-recent-events";
import listGamesTool from "./tools/list-games";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "hammers-modality-mcp",
  title: "Hammers Modality",
  version: "0.1.0",
  instructions:
    "Tools for the signed-in Hammers Modality athlete. Use `whoami` to verify the connection, `list_recent_events` to read the athlete's ASB timeline, and `list_games` to see their scheduled games, tournaments, and camps. All tools act as the signed-in user and respect RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listRecentEventsTool, listGamesTool],
});
