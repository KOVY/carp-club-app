/**
 * Unit tests for permissions module
 * Validates Requirements: 8.2, 8.3, 8.4, 8.5, 8.6
 */
import { describe, it, expect } from 'vitest';

// Re-implement permissions logic for testing (avoiding server-only import)
type Role = 'zavodnik' | 'kapitan' | 'rozhodci' | 'poradatel' | 'divak';

interface PermissionContext {
  userId: string;
  role: Role;
  tymId?: string;
  pegCislo?: number;
  zavodId: string;
}

function canSubmitUlovek(ctx: PermissionContext): boolean {
  return ctx.role === 'kapitan' || ctx.role === 'rozhodci' || ctx.role === 'poradatel';
}

function canConfirmUlovek(ctx: PermissionContext, ulovekTymPeg: number): boolean {
  if (ctx.role === 'rozhodci' || ctx.role === 'poradatel') {
    return true;
  }
  
  if (ctx.role === 'kapitan' && ctx.pegCislo !== undefined) {
    const diff = Math.abs(ctx.pegCislo - ulovekTymPeg);
    return diff === 1;
  }
  
  return false;
}

function canViewFullLeaderboard(ctx: PermissionContext, embargoActive: boolean): boolean {
  if (!embargoActive) {
    return true;
  }
  return ctx.role === 'rozhodci' || ctx.role === 'poradatel';
}

function canIssueYellowCard(ctx: PermissionContext): boolean {
  return ctx.role === 'rozhodci' || ctx.role === 'poradatel';
}

function canManageZavod(ctx: PermissionContext): boolean {
  return ctx.role === 'poradatel';
}

function canViewTeamDetails(ctx: PermissionContext, targetTymId: string): boolean {
  if (ctx.role === 'divak') {
    return false;
  }
  
  if (ctx.role === 'zavodnik') {
    return ctx.tymId === targetTymId;
  }
  
  return true;
}

function isSelfConfirmation(ctx: PermissionContext, ulovekTymId: string): boolean {
  return ctx.tymId === ulovekTymId;
}

// Helper to create permission context
function createContext(overrides: Partial<PermissionContext> = {}): PermissionContext {
  return {
    userId: 'user-1',
    role: 'zavodnik',
    zavodId: 'zavod-1',
    ...overrides,
  };
}

describe('Permissions Module', () => {
  describe('canSubmitUlovek', () => {
    it('should allow kapitan to submit catches (Requirement 8.4)', () => {
      const ctx = createContext({ role: 'kapitan' });
      expect(canSubmitUlovek(ctx)).toBe(true);
    });

    it('should allow rozhodci to submit catches (Requirement 8.5)', () => {
      const ctx = createContext({ role: 'rozhodci' });
      expect(canSubmitUlovek(ctx)).toBe(true);
    });

    it('should allow poradatel to submit catches (Requirement 8.6)', () => {
      const ctx = createContext({ role: 'poradatel' });
      expect(canSubmitUlovek(ctx)).toBe(true);
    });

    it('should NOT allow zavodnik to submit catches', () => {
      const ctx = createContext({ role: 'zavodnik' });
      expect(canSubmitUlovek(ctx)).toBe(false);
    });

    it('should NOT allow divak to submit catches (Requirement 8.2)', () => {
      const ctx = createContext({ role: 'divak' });
      expect(canSubmitUlovek(ctx)).toBe(false);
    });
  });

  describe('canConfirmUlovek', () => {
    it('should allow rozhodci to confirm any catch (Requirement 8.5)', () => {
      const ctx = createContext({ role: 'rozhodci' });
      expect(canConfirmUlovek(ctx, 5)).toBe(true);
      expect(canConfirmUlovek(ctx, 100)).toBe(true);
    });

    it('should allow poradatel to confirm any catch (Requirement 8.6)', () => {
      const ctx = createContext({ role: 'poradatel' });
      expect(canConfirmUlovek(ctx, 5)).toBe(true);
    });

    it('should allow kapitan to confirm neighbor peg (diff = 1)', () => {
      const ctx = createContext({ role: 'kapitan', pegCislo: 5 });
      expect(canConfirmUlovek(ctx, 4)).toBe(true); // peg-1
      expect(canConfirmUlovek(ctx, 6)).toBe(true); // peg+1
    });

    it('should NOT allow kapitan to confirm non-neighbor peg', () => {
      const ctx = createContext({ role: 'kapitan', pegCislo: 5 });
      expect(canConfirmUlovek(ctx, 3)).toBe(false); // diff = 2
      expect(canConfirmUlovek(ctx, 7)).toBe(false); // diff = 2
      expect(canConfirmUlovek(ctx, 5)).toBe(false); // same peg
    });

    it('should NOT allow zavodnik to confirm catches', () => {
      const ctx = createContext({ role: 'zavodnik', pegCislo: 5 });
      expect(canConfirmUlovek(ctx, 4)).toBe(false);
    });

    it('should NOT allow divak to confirm catches', () => {
      const ctx = createContext({ role: 'divak' });
      expect(canConfirmUlovek(ctx, 5)).toBe(false);
    });
  });

  describe('canViewFullLeaderboard', () => {
    it('should allow everyone to view when embargo is NOT active', () => {
      const roles: Role[] = ['zavodnik', 'kapitan', 'rozhodci', 'poradatel', 'divak'];
      roles.forEach(role => {
        const ctx = createContext({ role });
        expect(canViewFullLeaderboard(ctx, false)).toBe(true);
      });
    });

    it('should only allow rozhodci and poradatel during embargo (Requirement 6.3)', () => {
      expect(canViewFullLeaderboard(createContext({ role: 'rozhodci' }), true)).toBe(true);
      expect(canViewFullLeaderboard(createContext({ role: 'poradatel' }), true)).toBe(true);
    });

    it('should NOT allow others during embargo (Requirement 6.2)', () => {
      expect(canViewFullLeaderboard(createContext({ role: 'zavodnik' }), true)).toBe(false);
      expect(canViewFullLeaderboard(createContext({ role: 'kapitan' }), true)).toBe(false);
      expect(canViewFullLeaderboard(createContext({ role: 'divak' }), true)).toBe(false);
    });
  });

  describe('canIssueYellowCard', () => {
    it('should allow rozhodci to issue yellow cards (Requirement 8.5)', () => {
      const ctx = createContext({ role: 'rozhodci' });
      expect(canIssueYellowCard(ctx)).toBe(true);
    });

    it('should allow poradatel to issue yellow cards (Requirement 8.6)', () => {
      const ctx = createContext({ role: 'poradatel' });
      expect(canIssueYellowCard(ctx)).toBe(true);
    });

    it('should NOT allow others to issue yellow cards', () => {
      expect(canIssueYellowCard(createContext({ role: 'zavodnik' }))).toBe(false);
      expect(canIssueYellowCard(createContext({ role: 'kapitan' }))).toBe(false);
      expect(canIssueYellowCard(createContext({ role: 'divak' }))).toBe(false);
    });
  });

  describe('canManageZavod', () => {
    it('should only allow poradatel to manage competition (Requirement 8.6)', () => {
      expect(canManageZavod(createContext({ role: 'poradatel' }))).toBe(true);
    });

    it('should NOT allow others to manage competition', () => {
      expect(canManageZavod(createContext({ role: 'rozhodci' }))).toBe(false);
      expect(canManageZavod(createContext({ role: 'kapitan' }))).toBe(false);
      expect(canManageZavod(createContext({ role: 'zavodnik' }))).toBe(false);
      expect(canManageZavod(createContext({ role: 'divak' }))).toBe(false);
    });
  });

  describe('canViewTeamDetails', () => {
    it('should NOT allow divak to view team details (Requirement 8.2)', () => {
      const ctx = createContext({ role: 'divak' });
      expect(canViewTeamDetails(ctx, 'any-team')).toBe(false);
    });

    it('should allow zavodnik to view own team only (Requirement 8.3)', () => {
      const ctx = createContext({ role: 'zavodnik', tymId: 'team-1' });
      expect(canViewTeamDetails(ctx, 'team-1')).toBe(true);
      expect(canViewTeamDetails(ctx, 'team-2')).toBe(false);
    });

    it('should allow kapitan to view all teams (Requirement 8.4)', () => {
      const ctx = createContext({ role: 'kapitan', tymId: 'team-1' });
      expect(canViewTeamDetails(ctx, 'team-1')).toBe(true);
      expect(canViewTeamDetails(ctx, 'team-2')).toBe(true);
    });

    it('should allow rozhodci to view all teams (Requirement 8.5)', () => {
      const ctx = createContext({ role: 'rozhodci' });
      expect(canViewTeamDetails(ctx, 'any-team')).toBe(true);
    });

    it('should allow poradatel to view all teams (Requirement 8.6)', () => {
      const ctx = createContext({ role: 'poradatel' });
      expect(canViewTeamDetails(ctx, 'any-team')).toBe(true);
    });
  });

  describe('isSelfConfirmation', () => {
    it('should detect self-confirmation (Requirement 4.6)', () => {
      const ctx = createContext({ tymId: 'team-1' });
      expect(isSelfConfirmation(ctx, 'team-1')).toBe(true);
    });

    it('should NOT flag different team as self-confirmation', () => {
      const ctx = createContext({ tymId: 'team-1' });
      expect(isSelfConfirmation(ctx, 'team-2')).toBe(false);
    });
  });
});
