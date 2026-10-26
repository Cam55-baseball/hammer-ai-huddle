/** Approved owner teaching only. New beliefs must remain in the owner review queue. */
export type BuntSide = 'R' | 'L';
export type BuntType = 'squeeze' | 'sac_3b' | 'sac_1b' | 'drag' | 'push' | 'hit';
export const BUNT_TYPES: readonly BuntType[] = ['squeeze','sac_3b','sac_1b','drag','push','hit'];
export const BUNT_WORDING: Record<BuntSide, Record<BuntType, string>> = {
 R: {
  squeeze: 'Squeeze bunt (softly on 1B side of pitcher angled so pitcher grabs it instead of 1B)',
  sac_3b: 'Sac bunt toward 3B (man on second)', sac_1b: 'Sac bunt toward 1B (man on 1B)',
  drag: 'Drag bunt (toward 3B)', push: 'Push bunt (LHP only: beyond pitcher to the position of second baseman)',
  hit: 'Bunt for a hit (Softly down 1B line)',
 },
 L: {
  squeeze: 'Squeeze bunt (softly on 1B side of pitcher angled so pitcher grabs it instead of 1B)',
  sac_3b: 'Sac bunt toward 3B (man on second)', sac_1b: 'Sac bunt toward 1B (man on 1B)',
  drag: 'Drag bunt (toward 3B)', push: 'Push bunt (LHP only/ not for Switch hitters: Beyond pitcher to the position of second baseman)',
  hit: 'Bunt for a hit (Softly down 1B line)',
 },
};
export const DRAG_BUNT_GUIDANCE = 'The drag bunt is a bunt for a hit toward the 3B line, as close to the line as possible. The acceptable miss is a foul ball. Use it early in the count, never with two strikes: a foul bunt with two strikes is a strikeout.';
export const LEFT_POWER_GUIDANCE = 'Bunting for hits against the shift and base-stealing mastery: steal jumps, reads, Royal timing on jumps and baserunning sessions. Your existing plan and safety rules decide the work; this guidance adds no reps or days.';
export const MASTERY_MINIMUM = 'MLB/AUSL minimum: put balls in play at an elite rate; play impeccable defense; have a good throwing arm for the position (accuracy, health, velocity); and at minimum elite speed OR elite power. Work toward the weakest required pillar. If neither speed nor power is elite, prefer the more attainable one only when the data supports that choice. Missing evidence means Need more data.';
export const BUNTING_MASTERY = {
 id: 'bunting_mastery', version: 1, source: 'Camryn Williams · October 26, 2026',
 fundamentals: 'Record the actual batting side, exact bunt type, attempts and successful bunts. Missing success is unknown, not a failure. Keep other people clear of the bat and ball; stop for pain or unsafe space.',
 drag: DRAG_BUNT_GUIDANCE, leftPower: LEFT_POWER_GUIDANCE,
 types: BUNT_WORDING,
};
export function buntGuidance(side:BuntSide,type:BuntType):string {
 return type === 'drag' ? DRAG_BUNT_GUIDANCE : BUNT_WORDING[side][type];
}
/** Flag the recorded count, without inventing the pitch's actual outcome. */
export function twoStrikeBunt(result:unknown,strikes:unknown):boolean {
 return ['bunt_foul','bunt_in_play'].includes(String(result)) &&
  (typeof strikes === 'number' || typeof strikes === 'string' && strikes.trim() !== '') && Number(strikes) === 2;
}
export const buntingKnowledgeText = () => `BUNTING MASTERY — ${BUNTING_MASTERY.source}\n${BUNTING_MASTERY.fundamentals}\n${DRAG_BUNT_GUIDANCE}\n${LEFT_POWER_GUIDANCE}\n${(['R','L'] as const).flatMap(side=>BUNT_TYPES.map(type=>`${side}: ${BUNT_WORDING[side][type]}`)).join('\n')}\nUse only this approved teaching. No invented shift, corner, squeeze or softball tactics. Unapproved new teaching must be proposed to the owner, not presented as live coaching.`;