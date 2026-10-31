/** Owner philosophy-tool conversations share recall_threads but never appear in a player's Ask Hammer list. */
export const PHILOSOPHY_THREAD_TITLE = "Owner philosophy conversation";
export const PLAYER_THREAD_FILTER = `title.is.null,title.neq."${PHILOSOPHY_THREAD_TITLE}"`;
