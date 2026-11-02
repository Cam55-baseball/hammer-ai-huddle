import { topicKey } from './informational';

/** Owner Nov 2: the day's Mind kind → the shared mind/vision taxonomy topic its videos carry. */
const MIND_TOPIC: Record<string, string> = {
  focus_routine: topicKey('mind', 'movement_pattern', 'focus_routine'),
  breathing: topicKey('mind', 'movement_pattern', 'breathing'),
  journaling: topicKey('mind', 'movement_pattern', 'journaling'),
  film_study: topicKey('mind', 'movement_pattern', 'mental_study'),
  situations: topicKey('mind', 'movement_pattern', 'mental_study'),
  tex_vision: topicKey('vision', 'movement_pattern', 'tex_vision'),
};
export function mindVideoTopics(kind: string | null | undefined): string[] {
  return kind && MIND_TOPIC[kind] ? [MIND_TOPIC[kind]] : [];
}
