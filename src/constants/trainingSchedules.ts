/**
 * Smart default schedules for training modules.
 * These kick in when a user has NO custom game_plan_task_schedule row.
 * Users can override via "Repeat Weekly" settings.
 *
 * Day values use JavaScript's getDay() format:
 *   0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
 */
export const TRAINING_DEFAULT_SCHEDULES: Record<string, number[]> = {
  'workout-hitting':  [1, 2, 4, 5, 6], // Mon, Tue, Thu, Fri, Sat (5-day structure, Wed+Sun rest)
  'workout-pitching': [1, 2, 4, 5, 6], // Mon, Tue, Thu, Fri, Sat (mirrors Iron Bambino)
  'speed-lab':        [1, 3, 5],        // Mon, Wed, Fri (48h CNS recovery between sessions)
};
