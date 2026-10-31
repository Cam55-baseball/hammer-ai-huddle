import { describe, expect, it } from 'vitest';
import { filterSendCatalog, vaultSendItem, drillSendItem, sendCatalog } from './sendCatalog';
import type { CatalogMovement } from '@/hooks/useWorkoutCatalog';
import type { CustomActivityTemplate } from '@/types/customActivity';
describe('coach sends retain declared work', () => {
  it('saved recovery templates keep their explicit category rather than becoming lifts', () => {
    const template = { id:'saved',title:'Recovery',sport:'baseball',activity_type:'workout',coach_card_category:'recovery',exercises:[{id:'a',name:'Breathing'}] } as unknown as CustomActivityTemplate;
    expect(sendCatalog([], [template], 'baseball').find(item => item.id === 'saved')?.category).toBe('recovery');
  });
  it('does not list another sport’s Vault items', () => {
    const rows = [{ id: 'softball-only', name: 'Windmill', sport_scope: 'softball', category: 'windmill_pitching' }, { id: 'shared', name: 'Shared', sport_scope: 'both', category: 'warmup' }] as CatalogMovement[];
    const list = sendCatalog(rows, [], 'baseball');
    expect(list.some(item => item.id === 'vault:softball-only')).toBe(false);
    expect(list.some(item => item.id === 'vault:shared')).toBe(true);
  });
  it('retains Vault identity, exact dose and complete gear groups without a template reference', () => {
    const item = vaultSendItem({ id: 'vault-row', slug: 'reviewed', name: 'Reviewed', category: 'warmup', default_sets: 2, default_reps: 8, dosage_unit: 'reps', equipment: ['bat'], equipment_requirements: ['net'], equipment_alternatives: [['tee', 'baseballs'], ['partner']] } as CatalogMovement);
    expect(item.templateId).toBeNull();
    expect(item.category).toBe('warmup');
    expect(item.exercises[0]).toMatchObject({ slug: 'reviewed', sets: 2, reps: 8, equipment_requirements: ['bat', 'net'], equipment_alternatives: [['tee', 'baseballs'], ['partner']] });
  });
  it('retains a sport drill count and mandatory plus alternative gear', () => {
    const item = drillSendItem({ id: 'tee', name: 'Tee Work', module: 'hitting', description: 'Declared drill', defaultReps: 25, intensity: 'medium', equipmentNeeded: ['bat', 'baseballs'], equipmentAlternatives: [['tee'], ['partner', 'screen']] }, 'baseball');
    expect(item.exercises[0]).toMatchObject({ reps: 25, dosage_unit: 'reps', equipment_requirements: ['bat', 'baseballs'], equipment_alternatives: [['tee'], ['partner', 'screen']] });
    expect(item.exercises[0].slug).toBeUndefined();
  });
  it('search and category selection both narrow the same catalog', () => {
    const items = [{ id: 'a', title: 'Tee Work', category: 'hitting', source: 'baseball drills', exercises: [], templateId: null }, { id: 'b', title: 'Tee shoulder', category: 'warmup', source: 'Vault', exercises: [], templateId: null }];
    expect(filterSendCatalog(items, 'tee', 'hitting').map(x => x.id)).toEqual(['a']);
    expect(filterSendCatalog(items, 'missing', 'all')).toEqual([]);
  });
});