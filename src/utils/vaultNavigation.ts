/**
 * Centralized Vault Deep-Linking System
 * 
 * Provides type-safe URL generation, scroll handling, and parameter parsing
 * for all Vault sections and quiz dialogs.
 */

import type { RefObject } from 'react';

// Type-safe section identifiers
export type VaultSection = 
  | 'performance-tests' 
  | 'progress-photos' 
  | 'scout-grades' 
  | 'pitching-grades' 
  | 'nutrition'
  | 'wellness-goals'
  | 'saved-items';

// Type-safe quiz identifiers  
export type VaultQuiz = 'morning' | 'pre_lift' | 'night';

// Section configuration
interface SectionConfig {
  tab: 'today' | 'weekly' | 'history';
  autoOpen: boolean;
}

export const VAULT_SECTIONS: Record<VaultSection, SectionConfig> = {
  'performance-tests': { tab: 'today', autoOpen: true },
  'progress-photos': { tab: 'today', autoOpen: false },
  'scout-grades': { tab: 'today', autoOpen: true },
  'pitching-grades': { tab: 'today', autoOpen: true },
  'nutrition': { tab: 'today', autoOpen: false },
  'wellness-goals': { tab: 'today', autoOpen: true },
  'saved-items': { tab: 'today', autoOpen: false },
} as const;

// Quiz types that can be opened via URL
export const VAULT_QUIZZES = ['morning', 'pre_lift', 'night', 'prelift'] as const;

/**
 * Generate a URL to navigate to a specific Vault section
 */
export function getVaultSectionUrl(section: VaultSection): string {
  return `/vault?openSection=${section}`;
}

/**
 * Generate a URL to open a specific quiz dialog
 */
export function getVaultQuizUrl(quiz: VaultQuiz): string {
  return `/vault?openQuiz=${quiz}`;
}

/**
 * Parse URL search params into structured vault navigation params
 */
export function parseVaultParams(searchParams: URLSearchParams): {
  section: VaultSection | null;
  quiz: VaultQuiz | null;
} {
  const openSection = searchParams.get('openSection');
  const openQuiz = searchParams.get('openQuiz');
  
  // Validate section
  const validSection = openSection && Object.keys(VAULT_SECTIONS).includes(openSection)
    ? (openSection as VaultSection)
    : null;
  
  // Validate and normalize quiz (handle 'prelift' alias)
  let validQuiz: VaultQuiz | null = null;
  if (openQuiz === 'morning' || openQuiz === 'night') {
    validQuiz = openQuiz;
  } else if (openQuiz === 'pre_lift' || openQuiz === 'prelift') {
    validQuiz = 'pre_lift';
  }
  
  return { section: validSection, quiz: validQuiz };
}

/**
 * Get the tab that should be active for a given section
 */
export function getTabForSection(section: VaultSection): string {
  return VAULT_SECTIONS[section]?.tab || 'today';
}

/**
 * Check if a section should auto-open (expand) when navigated to
 */
export function shouldAutoOpen(section: VaultSection): boolean {
  return VAULT_SECTIONS[section]?.autoOpen || false;
}

/**
 * Scroll to a vault section with reliable retry mechanism
 * Handles async content rendering with multiple timed attempts
 */
export function scrollToVaultSection(
  refMap: Record<string, RefObject<HTMLDivElement | null>>,
  section: VaultSection,
  onSuccess?: () => void
): void {
  const scrollAttempt = (): boolean => {
    const ref = refMap[section];
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onSuccess?.();
      return true;
    }
    return false;
  };

  // Immediate attempt
  if (scrollAttempt()) return;

  // Retry with increasing delays for async content
  const delays = [100, 300, 600, 1000];
  delays.forEach(delay => {
    setTimeout(() => {
      scrollAttempt();
    }, delay);
  });
}

/**
 * Create a ref map key from a section identifier
 */
export function getSectionRefKey(section: VaultSection): string {
  return section;
}

/**
 * Check if a string is a valid VaultSection
 */
export function isValidSection(value: string): value is VaultSection {
  return Object.keys(VAULT_SECTIONS).includes(value);
}

/**
 * Check if a string is a valid VaultQuiz
 */
export function isValidQuiz(value: string): value is VaultQuiz {
  return value === 'morning' || value === 'pre_lift' || value === 'night' || value === 'prelift';
}
