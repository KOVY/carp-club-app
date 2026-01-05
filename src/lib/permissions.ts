/**
 * Permissions module for role-based access control
 * SERVER ONLY - never import in client components
 * 
 * Requirements:
 * - 8.2: divak has read-only access to public data
 * - 8.3: zavodnik can see own team data
 * - 8.4: kapitan can submit catches and confirm neighbor catches
 * - 8.5: rozhodci can confirm all catches and issue yellow cards
 * - 8.6: poradatel has full access
 */
import 'server-only';

import type { PermissionContext } from './types';

type Role = 'zavodnik' | 'kapitan' | 'rozhodci' | 'poradatel' | 'divak';

/**
 * Check if user can submit a catch
 * Only kapitan, rozhodci, and poradatel can submit catches
 * 
 * @param ctx - Permission context with user role
 * @returns true if user can submit catches
 */
export function canSubmitUlovek(ctx: PermissionContext): boolean {
  return ctx.role === 'kapitan' || ctx.role === 'rozhodci' || ctx.role === 'poradatel';
}

/**
 * Check if user can confirm a catch
 * - rozhodci and poradatel can confirm any catch
 * - kapitan can only confirm catches from neighbor pegs (|diff| = 1)
 * 
 * @param ctx - Permission context with user role and peg number
 * @param ulovekTymPeg - Peg number of the team that made the catch
 * @returns true if user can confirm the catch
 */
export function canConfirmUlovek(ctx: PermissionContext, ulovekTymPeg: number): boolean {
  // rozhodci and poradatel can confirm any catch
  if (ctx.role === 'rozhodci' || ctx.role === 'poradatel') {
    return true;
  }
  
  // kapitan can only confirm neighbor pegs
  if (ctx.role === 'kapitan' && ctx.pegCislo !== undefined) {
    const diff = Math.abs(ctx.pegCislo - ulovekTymPeg);
    return diff === 1;
  }
  
  return false;
}

/**
 * Check if user can view full leaderboard (with weights)
 * During embargo, only rozhodci and poradatel can see weights
 * 
 * @param ctx - Permission context with user role
 * @param embargoActive - Whether embargo is currently active
 * @returns true if user can see full leaderboard with weights
 */
export function canViewFullLeaderboard(ctx: PermissionContext, embargoActive: boolean): boolean {
  if (!embargoActive) {
    return true;
  }
  return ctx.role === 'rozhodci' || ctx.role === 'poradatel';
}

/**
 * Check if user can issue yellow cards
 * Only rozhodci and poradatel can issue yellow cards
 * 
 * @param ctx - Permission context with user role
 * @returns true if user can issue yellow cards
 */
export function canIssueYellowCard(ctx: PermissionContext): boolean {
  return ctx.role === 'rozhodci' || ctx.role === 'poradatel';
}

/**
 * Check if user can manage competition (create, update, delete)
 * Only poradatel has full management access
 * 
 * @param ctx - Permission context with user role
 * @returns true if user can manage competition
 */
export function canManageZavod(ctx: PermissionContext): boolean {
  return ctx.role === 'poradatel';
}

/**
 * Check if user can view team details
 * - divak can only see public info
 * - zavodnik can see own team
 * - kapitan, rozhodci, poradatel can see all teams
 * 
 * @param ctx - Permission context with user role and team ID
 * @param targetTymId - ID of the team to view
 * @returns true if user can view team details
 */
export function canViewTeamDetails(ctx: PermissionContext, targetTymId: string): boolean {
  // divak can only see public info (handled elsewhere)
  if (ctx.role === 'divak') {
    return false;
  }
  
  // zavodnik can only see own team
  if (ctx.role === 'zavodnik') {
    return ctx.tymId === targetTymId;
  }
  
  // kapitan, rozhodci, poradatel can see all teams
  return true;
}

/**
 * Check if user can perform self-confirmation (should always be false)
 * Requirement 4.6: Cannot confirm own team's catch
 * 
 * @param ctx - Permission context with user's team ID
 * @param ulovekTymId - ID of the team that made the catch
 * @returns true if this would be self-confirmation (not allowed)
 */
export function isSelfConfirmation(ctx: PermissionContext, ulovekTymId: string): boolean {
  return ctx.tymId === ulovekTymId;
}

/**
 * Get the role hierarchy level for comparison
 * Higher number = more permissions
 * 
 * @param role - User role
 * @returns Numeric level of the role
 */
export function getRoleLevel(role: Role): number {
  const levels: Record<Role, number> = {
    divak: 0,
    zavodnik: 1,
    kapitan: 2,
    rozhodci: 3,
    poradatel: 4,
  };
  return levels[role];
}

/**
 * Check if user has at least the specified role level
 * 
 * @param ctx - Permission context with user role
 * @param requiredRole - Minimum required role
 * @returns true if user has at least the required role level
 */
export function hasMinimumRole(ctx: PermissionContext, requiredRole: Role): boolean {
  return getRoleLevel(ctx.role) >= getRoleLevel(requiredRole);
}
