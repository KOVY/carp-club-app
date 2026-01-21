// Application constants
// These values are configurable per competition but have sensible defaults

/**
 * System admin user IDs - centralized for security
 * These users have full access to all features
 */
export const SYSTEM_ADMIN_IDS = [
  'adfa3aa5-9e63-4a0b-8dac-f1f5911bcf25' // prorybolov@gmail.com
] as const;

/**
 * Check if a user ID is a system admin
 */
export function isSystemAdmin(userId: string): boolean {
  return SYSTEM_ADMIN_IDS.includes(userId as typeof SYSTEM_ADMIN_IDS[number]);
}

/**
 * Minimum weight of fish in kg to be counted for scoring
 * Requirement 3.2: Fish under 5kg are rejected
 */
export const MIN_VAHA_KG = 5;

/**
 * Number of top fish to count for team score
 * Requirement 5.1: Score is sum of top 5 heaviest confirmed fish
 */
export const TOP_N_RYB = 5;

/**
 * Default number of confirmations required for a catch
 * Can be overridden per competition
 */
export const DEFAULT_POCET_POTVRZENI = 2;

/**
 * Maximum number of team members (excluding captain)
 */
export const MAX_CLENU_TYMU = 3;

/**
 * Session timeout in hours
 * Requirement 9.5: Auto-logout after 24 hours of inactivity
 */
export const SESSION_TIMEOUT_HOURS = 24;

/**
 * Fish types allowed in competitions
 */
export const DRUHY_RYB = ['kapr', 'amur'] as const;

/**
 * User roles in the system
 */
export const USER_ROLES = ['zavodnik', 'kapitan', 'rozhodci', 'poradatel', 'divak'] as const;

/**
 * Competition states
 */
export const STAVY_ZAVODU = ['priprava', 'probiha', 'ukoncen'] as const;

/**
 * Confirmation states for catches
 */
export const STAVY_POTVRZENI = ['ceka', 'potvrzeno', 'zamitnuto'] as const;
