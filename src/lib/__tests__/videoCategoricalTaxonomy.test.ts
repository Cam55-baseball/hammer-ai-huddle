import { describe, expect, it } from 'vitest';
import { isValidVideoClassification, subSkillsFor } from '../videoCategoricalTaxonomy';

describe('video categorical taxonomy', () => {
  it('keeps sport-specific pitches in their legal pitching branch', () => {
    expect(subSkillsFor('softball', 'pitching')).toContain('Rise ball');
    expect(subSkillsFor('baseball', 'pitching')).not.toContain('Rise ball');
    expect(subSkillsFor('baseball', 'pitching')).toContain('Slider');
    expect(subSkillsFor('softball', 'pitching')).not.toContain('Slider');
  });

  it('rejects a valid sub-skill under the wrong category', () => {
    expect(isValidVideoClassification('softball', 'pitching', 'Rise ball')).toBe(true);
    expect(isValidVideoClassification('softball', 'hitting', 'Rise ball')).toBe(false);
  });
});