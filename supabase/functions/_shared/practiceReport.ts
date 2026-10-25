/** Practice logs describe entered work, never independently observed faults. */
export interface LoggedPracticeSession {
  session_date?: string | null;
  coach_id?: string | null;
  drill_blocks?: unknown;
}

export function loggedPracticeReport(session: LoggedPracticeSession) {
  const source = session.coach_id ? 'Coach-entered practice log' : 'Athlete-entered practice log';
  const context = `${source} · ${session.session_date ?? 'Date not entered'}`;
  const blocks = Array.isArray(session.drill_blocks) ? session.drill_blocks : [];
  const situationalSplits: { category: string; metric: string; value: string; context: string }[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const name = typeof block.drill_type === 'string' ? block.drill_type.replace(/_/g, ' ') : 'Practice block';
    if (typeof block.volume === 'number' && Number.isInteger(block.volume) && block.volume > 0) {
      situationalSplits.push({ category: name, metric: 'Logged reps', value: String(block.volume), context });
    }
    if (Array.isArray(block.bunt_outcomes)) for (const outcome of block.bunt_outcomes) {
      if (!outcome || !['R','L'].includes(outcome.side) || !['squeeze','sac_3b','sac_1b','drag','push','hit'].includes(outcome.type) || !Number.isInteger(outcome.attempts) || outcome.attempts <= 0 || !Number.isInteger(outcome.successes) || outcome.successes < 0 || outcome.successes > outcome.attempts) continue;
      situationalSplits.push({ category: `${outcome.side === 'R' ? 'Right-handed' : 'Left-handed'} ${outcome.type.replace(/_/g,' ')} bunt`, metric: 'Successful bunts / entered attempts', value: `${outcome.successes} / ${outcome.attempts}`, context });
    }
    if (typeof block.execution_grade === 'number' && Number.isFinite(block.execution_grade) && block.execution_grade >= 0 && block.execution_grade <= 80) {
      situationalSplits.push({ category: name, metric: 'Entered execution grade', value: String(block.execution_grade), context });
    }
  }
  return {
    performanceBreakdown: { situationalSplits, patterns: [] as string[] },
    rootCauseAnalysis: [], priorityStack: [], prescriptiveFixes: [], gameTransfer: [],
    adaptiveProgression: null, nextSessionFocus: null,
  };
}
