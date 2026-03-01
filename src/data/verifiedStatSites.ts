export interface StatSite {
  id: string;
  label: string;
  profileType: string; // maps to verifiedStatBoosts key
  sport: 'baseball' | 'softball' | 'both';
  domainPatterns: string[]; // URL must contain at least one
}

export const verifiedStatSites: StatSite[] = [
  // Baseball
  { id: 'bbref', label: 'Baseball Reference', profileType: 'mlb', sport: 'baseball', domainPatterns: ['baseball-reference.com'] },
  { id: 'savant', label: 'MLB Savant', profileType: 'mlb', sport: 'baseball', domainPatterns: ['baseballsavant.mlb.com'] },
  { id: 'milb', label: 'MiLB Profile', profileType: 'milb', sport: 'baseball', domainPatterns: ['milb.com'] },
  { id: 'ncaa_d1_bb', label: 'NCAA D1 Baseball', profileType: 'ncaa_d1', sport: 'baseball', domainPatterns: ['.ncaa.', 'stats.ncaa.org', 'goheels.com', 'gators.com', 'texassports.com'] },
  { id: 'ncaa_d2_bb', label: 'NCAA D2 Baseball', profileType: 'ncaa_d2', sport: 'baseball', domainPatterns: ['.ncaa.', 'stats.ncaa.org'] },
  { id: 'ncaa_d3_bb', label: 'NCAA D3 Baseball', profileType: 'ncaa_d3', sport: 'baseball', domainPatterns: ['.ncaa.', 'stats.ncaa.org'] },
  { id: 'naia_bb', label: 'NAIA Baseball', profileType: 'naia', sport: 'baseball', domainPatterns: ['naia.org', '.naia.'] },
  { id: 'pg', label: 'Perfect Game', profileType: 'indie_pro', sport: 'baseball', domainPatterns: ['perfectgame.org'] },
  { id: 'indie_bb', label: 'Indie Pro Baseball', profileType: 'indie_pro', sport: 'baseball', domainPatterns: [] },
  { id: 'foreign_bb', label: 'Foreign Pro Baseball', profileType: 'foreign_pro', sport: 'baseball', domainPatterns: [] },

  // Softball
  { id: 'ausl', label: 'AUSL Profile', profileType: 'ausl', sport: 'softball', domainPatterns: [] },
  { id: 'ncaa_d1_sb', label: 'NCAA D1 Softball', profileType: 'ncaa_d1', sport: 'softball', domainPatterns: ['.ncaa.', 'stats.ncaa.org'] },
  { id: 'ncaa_d2_sb', label: 'NCAA D2 Softball', profileType: 'ncaa_d2', sport: 'softball', domainPatterns: ['.ncaa.', 'stats.ncaa.org'] },
  { id: 'ncaa_d3_sb', label: 'NCAA D3 Softball', profileType: 'ncaa_d3', sport: 'softball', domainPatterns: ['.ncaa.', 'stats.ncaa.org'] },
  { id: 'naia_sb', label: 'NAIA Softball', profileType: 'naia', sport: 'softball', domainPatterns: ['naia.org', '.naia.'] },
  { id: 'indie_sb', label: 'Indie Pro Softball', profileType: 'indie_pro', sport: 'softball', domainPatterns: [] },
];

export function getSitesForSport(sport: 'baseball' | 'softball'): StatSite[] {
  return verifiedStatSites.filter(s => s.sport === sport || s.sport === 'both');
}

export function validateUrlForSite(url: string, site: StatSite): { valid: boolean; message?: string } {
  if (!url) return { valid: false, message: 'URL is required' };
  
  try {
    new URL(url); // basic URL validation
  } catch {
    return { valid: false, message: 'Invalid URL format' };
  }

  // If site has no domain patterns, accept any valid URL
  if (site.domainPatterns.length === 0) return { valid: true };

  const lowerUrl = url.toLowerCase();
  const matches = site.domainPatterns.some(pattern => lowerUrl.includes(pattern.toLowerCase()));
  
  if (!matches) {
    return { valid: false, message: `URL must be from ${site.label} (expected: ${site.domainPatterns.join(' or ')})` };
  }

  return { valid: true };
}
