import { movementGroups, movementScore, type MovementScreen } from "./movementScreen";

export function movementSummary(screen: MovementScreen) {
  return movementGroups.flatMap(group => group.items.flatMap(item => {
    const observation = screen.observations?.[item.key];
    if (!observation) return [];
    return [{ key: item.key, name: item.name, unit: item.unit, left: observation.left?.trim() || null, right: observation.right?.trim() || null,
      leftStatus: observation.leftStatus ?? null, rightStatus: observation.rightStatus ?? null,
      leftScore: movementScore(observation.leftStatus), rightScore: movementScore(observation.rightStatus) }];
  }));
}