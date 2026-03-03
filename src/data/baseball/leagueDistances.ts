export interface LeagueDistance {
  level: string;
  label: string;
  mound_ft: number;
  mound_label: string;
  bases_ft: number;
}

export const baseballLeagueDistances: LeagueDistance[] = [
  { level: '8u', label: '8U', mound_ft: 42, mound_label: "42'", bases_ft: 60 },
  { level: '10u', label: '10U', mound_ft: 46, mound_label: "46'", bases_ft: 65 },
  { level: '12u', label: '12U', mound_ft: 50, mound_label: "50'", bases_ft: 70 },
  { level: '13u', label: '13U', mound_ft: 54, mound_label: "54'", bases_ft: 80 },
  { level: '14u', label: '14U', mound_ft: 60.5, mound_label: "60'6\"", bases_ft: 90 },
  { level: 'hs', label: 'High School', mound_ft: 60.5, mound_label: "60'6\"", bases_ft: 90 },
  { level: 'college', label: 'College', mound_ft: 60.5, mound_label: "60'6\"", bases_ft: 90 },
  { level: 'pro', label: 'Pro', mound_ft: 60.5, mound_label: "60'6\"", bases_ft: 90 },
];
