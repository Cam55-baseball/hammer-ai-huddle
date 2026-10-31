import { describe, it, expect } from "vitest";
import { PHILOSOPHY_THREAD_TITLE, PLAYER_THREAD_FILTER } from "@/lib/hammer/philosophyThreads";
import { CHAT_PAGE } from "@/components/hammer/HammerChat";

describe("Ask Hammer lists", () => {
  it("excludes owner philosophy threads but keeps untitled ones", () => {
    expect(PLAYER_THREAD_FILTER).toBe('title.is.null,title.neq."Owner philosophy conversation"');
    expect(PHILOSOPHY_THREAD_TITLE).toBe("Owner philosophy conversation");
  });
  it("opens at the newest six messages", () => { expect(CHAT_PAGE).toBe(6); });
});
