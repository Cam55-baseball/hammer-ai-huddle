import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EvaluationReportCard } from '../EvaluationReportCard';
import type { EvaluationRow } from '@/hooks/useEvaluations';

const baseReport: EvaluationRow = {
  id: 'r1',
  user_id: 'u1',
  evaluator_id: 'e1',
  grade_type: 'two_way',
  grade_source: 'scout',
  graded_at: '2026-08-20T00:00:00Z',
  evaluation_context: 'In-person — game',
  event_description: null,
  overall_grade: 55,
  notes: null,
  player_confirmed: true,
  player_confirmed_at: null,
  is_switch_hitter: true,
  is_ambidextrous_pitcher: true,
  // Blended mirrors that must be suppressed when per-side rows exist.
  hitting_grade: 50,
  hitting_grade_future: 55,
  fastball_grade: 55,
  fastball_grade_future: 60,
};

describe('EvaluationReportCard side splits', () => {
  it('renders switch-hitter bat-side grades per side and hides blended rows', () => {
    render(
      <EvaluationReportCard
        report={baseReport}
        batSides={[
          {
            grade_id: 'r1',
            bat_side: 'R',
            hitting_grade: 55,
            hitting_grade_future: 60,
            power_grade: 45,
            power_grade_future: 50,
            plate_discipline_grade: null,
            plate_discipline_grade_future: null,
          },
          {
            grade_id: 'r1',
            bat_side: 'L',
            hitting_grade: 45,
            hitting_grade_future: 50,
            power_grade: 40,
            power_grade_future: 45,
            plate_discipline_grade: 55,
            plate_discipline_grade_future: 55,
          },
        ]}
      />,
    );
    expect(screen.getByText('Offense by batting side')).toBeTruthy();
    expect(screen.getByText('Right-handed AB')).toBeTruthy();
    expect(screen.getByText('Left-handed AB')).toBeTruthy();
    expect(screen.getAllByText('Switch hitter').length).toBeGreaterThan(0);
    // Blended "Hit" row must not appear outside the per-side sections.
    expect(screen.queryByText(/^Hit$/)).toBeNull();
  });

  it('renders ambidextrous pitching grades per throwing arm and hides blended rows', () => {
    render(
      <EvaluationReportCard
        report={baseReport}
        pitchingSides={[
          {
            grade_id: 'r1',
            throwing_hand: 'R',
            fastball_grade: 60,
            fastball_grade_future: 65,
            control_grade: 50,
            control_grade_future: 55,
            deception_grade: null,
            deception_grade_future: null,
          },
          {
            grade_id: 'r1',
            throwing_hand: 'L',
            fastball_grade: 45,
            fastball_grade_future: 50,
            control_grade: 55,
            control_grade_future: 60,
            hold_runners_grade: 40,
            hold_runners_grade_future: null,
          },
        ]}
      />,
    );
    expect(screen.getByText('Pitching by throwing arm')).toBeTruthy();
    expect(screen.getByText('Right-handed pitching')).toBeTruthy();
    expect(screen.getByText('Left-handed pitching')).toBeTruthy();
    expect(screen.getAllByText('Ambidextrous pitcher').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Both arms seen').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Holding Runners').length).toBe(1);
    // Blended "Fastball" row must not appear outside the per-side sections —
    // the two per-side Fastball rows are the only ones rendered.
    expect(screen.getAllByText('Fastball').length).toBe(2);
  });

  it('keeps blended rows when no side-split data exists (backwards compatible)', () => {
    render(<EvaluationReportCard report={baseReport} />);
    expect(screen.queryByText('Pitching by throwing arm')).toBeNull();
    expect(screen.getAllByText('Fastball').length).toBe(1);
    expect(screen.getAllByText(/^Hit$/).length).toBe(1);
  });
});
