import { BodyMapSelector } from './BodyMapSelector';

interface BodyAreaSelectorProps {
  selectedAreas: string[];
  onChange: (areas: string[]) => void;
}

export function BodyAreaSelector({ selectedAreas, onChange }: BodyAreaSelectorProps) {
  return (
    <BodyMapSelector
      selectedAreas={selectedAreas}
      onChange={onChange}
    />
  );
}
