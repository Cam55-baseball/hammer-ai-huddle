export interface LeagueDistance {
  level: string;
  label: string;
  mound_ft: number;
  mound_label: string;
  bases_ft: number;
}

export const softballLeagueDistances: LeagueDistance[] = [
  { level: '10u', label: '10U', mound_ft: 35, mound_label: "35'", bases_ft: 55 },
  { level: '12u', label: '12U', mound_ft: 40, mound_label: "40'", bases_ft: 60 },
  { level: '14u', label: '14U', mound_ft: 43, mound_label: "43'", bases_ft: 60 },
  { level: 'hs', label: 'High School', mound_ft: 43, mound_label: "43'", bases_ft: 60 },
  { level: 'college', label: 'College', mound_ft: 43, mound_label: "43'", bases_ft: 60 },
  { level: 'pro', label: 'Pro', mound_ft: 43, mound_label: "43'", bases_ft: 60 },
];
