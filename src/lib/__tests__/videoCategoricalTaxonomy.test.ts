import { describe, expect, it } from 'vitest';
import { isValidVideoClassification, subSkillsFor } from '../videoCategoricalTaxonomy';

describe('video categorical taxonomy', () => {
  it.each(['baseball','softball'] as const)('%s has six exact bunt types on each side plus fundamentals, hitting only', sport => {
    const tags = subSkillsFor(sport, 'hitting');
    expect(tags.filter(tag => tag.startsWith('Right-handed:'))).toHaveLength(6);
    expect(tags.filter(tag => tag.startsWith('Left-handed:'))).toHaveLength(6);
    expect(tags).toContain('Bunting fundamentals');
    expect(isValidVideoClassification(sport, 'pitching', 'Bunting fundamentals')).toBe(false);
  });
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