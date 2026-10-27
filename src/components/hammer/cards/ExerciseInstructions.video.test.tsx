import { render, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ExerciseInstructions } from './ExerciseInstructions';
const sources = vi.hoisted(() => ({ urls: [] as string[], slugs: [] as string[] }));
vi.mock('./ExerciseVideo', () => ({ ExerciseVideo: ({ slug }: { slug: string }) => { sources.slugs.push(slug); return null; } }));
vi.mock('@/components/video-library/VideoPlayer', () => ({ VideoPlayer: ({ videoUrl }: { videoUrl: string }) => { sources.urls.push(videoUrl); return null; } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn() } }));
afterEach(() => { cleanup(); sources.urls = []; sources.slugs = []; });
it('shows the exact saved owner attachment instead of an unrelated Vault slug lookup', () => {
  render(<ExerciseInstructions name="Owner drill" slug="built-in" videoUrl="https://www.youtube.com/watch?v=owner" setup="Saved setup" expanded />);
  expect(sources.urls).toEqual(['https://www.youtube.com/watch?v=owner']);
  expect(sources.slugs).toEqual([]);
});
it('preserves built-in video lookup when no owner attachment is saved', () => {
  render(<ExerciseInstructions name="Built-in" slug="built-in" setup="Saved setup" expanded />);
  expect(sources.slugs).toEqual(['built-in']); expect(sources.urls).toEqual([]);
});