import { useMPIScores } from '@/hooks/useMPIScores';

export function useAIPrompts() {
  const { data: mpi, isLoading } = useMPIScores();

  const prompts: string[] = Array.isArray(mpi?.development_prompts) ? (mpi.development_prompts as string[]) : [];
  const hasPrompts = prompts.length > 0;

  return { prompts, hasPrompts, isLoading };
}
