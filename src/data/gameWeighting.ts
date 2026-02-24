export interface SessionWeighting {
  competitiveExecution: number;
  decisionIndex: number;
  volumeMultiplier: number;
  skillRefinement: number;
  intentCompliance: number;
}

export const gameWeighting: Record<string, SessionWeighting> = {
  game: {
    competitiveExecution: 1.25,
    decisionIndex: 1.18,
    volumeMultiplier: 0.7,
    skillRefinement: 1.0,
    intentCompliance: 1.0,
  },
  live_scrimmage: {
    competitiveExecution: 1.15,
    decisionIndex: 1.1,
    volumeMultiplier: 0.8,
    skillRefinement: 1.05,
    intentCompliance: 1.0,
  },
  personal_practice: {
    competitiveExecution: 1.0,
    decisionIndex: 1.0,
    volumeMultiplier: 1.0,
    skillRefinement: 1.15,
    intentCompliance: 1.2,
  },
  team_practice: {
    competitiveExecution: 1.0,
    decisionIndex: 1.05,
    volumeMultiplier: 1.0,
    skillRefinement: 1.1,
    intentCompliance: 1.15,
  },
  coach_lesson: {
    competitiveExecution: 1.0,
    decisionIndex: 1.0,
    volumeMultiplier: 0.9,
    skillRefinement: 1.2,
    intentCompliance: 1.25,
  },
  bullpen: {
    competitiveExecution: 1.0,
    decisionIndex: 1.0,
    volumeMultiplier: 0.9,
    skillRefinement: 1.15,
    intentCompliance: 1.2,
  },
  post_game_analysis: {
    competitiveExecution: 1.0,
    decisionIndex: 1.1,
    volumeMultiplier: 0.5,
    skillRefinement: 1.1,
    intentCompliance: 1.0,
  },
  rehab_session: {
    competitiveExecution: 0.3,
    decisionIndex: 0.3,
    volumeMultiplier: 0.3,
    skillRefinement: 0.5,
    intentCompliance: 0.5,
  },
};
