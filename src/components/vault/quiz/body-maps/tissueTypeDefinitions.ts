export interface TissueType {
  id: string;
  label: string;
  emoji: string;
  description: string;
  color: string; // Tailwind color class prefix (e.g., 'red' for bg-red-500)
}

export const TISSUE_TYPES: TissueType[] = [
  {
    id: 'muscle',
    label: 'Muscle',
    emoji: '💪',
    description: 'Deep, achy, or cramping feeling',
    color: 'red',
  },
  {
    id: 'tendon',
    label: 'Tendon',
    emoji: '🔗',
    description: 'Sharp near joints, worse with load',
    color: 'blue',
  },
  {
    id: 'ligament',
    label: 'Ligament',
    emoji: '🦴',
    description: 'Instability or swelling near joints',
    color: 'purple',
  },
  {
    id: 'bone',
    label: 'Bone',
    emoji: '🦷',
    description: 'Deep, localized point tenderness',
    color: 'slate',
  },
  {
    id: 'joint',
    label: 'Joint',
    emoji: '⚙️',
    description: 'Stiffness, grinding, or locking',
    color: 'amber',
  },
  {
    id: 'nerve',
    label: 'Nerve',
    emoji: '⚡',
    description: 'Tingling, numbness, or shooting pain',
    color: 'yellow',
  },
];

export function getTissueTypeById(id: string): TissueType | undefined {
  return TISSUE_TYPES.find((t) => t.id === id);
}

export function getTissueTypeLabel(id: string): string {
  return getTissueTypeById(id)?.label || id;
}
