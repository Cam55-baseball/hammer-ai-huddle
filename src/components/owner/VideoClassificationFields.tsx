import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  VIDEO_CATEGORIES,
  VIDEO_SPORTS,
  subSkillsFor,
  type VideoCategory,
  type VideoSport,
} from '@/lib/videoCategoricalTaxonomy';

interface Props {
  sport: VideoSport | '';
  category: VideoCategory | '';
  subSkill: string;
  onChange: (next: { sport: VideoSport | ''; category: VideoCategory | ''; subSkill: string }) => void;
}

export function VideoClassificationFields({ sport, category, subSkill, onChange }: Props) {
  const subSkills = subSkillsFor(sport, category);

  return (
    <div className="grid gap-3 sm:grid-cols-3" data-testid="video-classification">
      <div className="space-y-1.5">
        <Label>Sport *</Label>
        <Select
          value={sport}
          onValueChange={(value) => onChange({ sport: value as VideoSport, category: '', subSkill: '' })}
        >
          <SelectTrigger aria-label="Video sport"><SelectValue placeholder="Select sport" /></SelectTrigger>
          <SelectContent>
            {VIDEO_SPORTS.map((item) => <SelectItem key={item} value={item} className="capitalize">{item}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Category *</Label>
        <Select
          value={category}
          disabled={!sport}
          onValueChange={(value) => onChange({ sport, category: value as VideoCategory, subSkill: '' })}
        >
          <SelectTrigger aria-label="Video category"><SelectValue placeholder={sport ? 'Select category' : 'Choose sport first'} /></SelectTrigger>
          <SelectContent>
            {VIDEO_CATEGORIES.map((item) => <SelectItem key={item} value={item} className="capitalize">{item}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Sub-skill *</Label>
        <Select
          value={subSkill}
          disabled={!category}
          onValueChange={(value) => onChange({ sport, category, subSkill: value })}
        >
          <SelectTrigger aria-label="Video sub-skill"><SelectValue placeholder={category ? 'Select sub-skill' : 'Choose category first'} /></SelectTrigger>
          <SelectContent>
            {subSkills.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}