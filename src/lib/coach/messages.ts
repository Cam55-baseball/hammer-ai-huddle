/** Who receives a coach message, mirroring public.send_coach_message. */
export type MessageAudience = "player" | "player_and_parent" | "parent_only";

export function messageAudience(age: number | null): MessageAudience {
  if (age === null) return "player";
  if (age < 13) return "parent_only";
  if (age < 18) return "player_and_parent";
  return "player";
}

export const AUDIENCE_NOTE: Record<MessageAudience, string> = {
  player: "Goes to the player.",
  player_and_parent: "Goes to the player. A copy goes to their parent.",
  parent_only: "Player is under 13 — this goes to their parent only.",
};

export function sendErrorText(msg: string): string {
  if (msg.includes("parent_link_required"))
    return "This player is under 18 and has no linked parent yet, so messages can't be sent.";
  if (msg.includes("not_your_player")) return "You can only message players on your roster.";
  if (msg.includes("message_length")) return "Write a message (up to 2,000 characters).";
  return "Message not sent. Please try again.";
}
