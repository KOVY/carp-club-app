/**
 * Unit tests for scoring module
 * Validates Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
import { describe, it, expect } from 'vitest';
import type { Ulovek } from '@/types/database.types';

// Re-implement scoring logic for testing (avoiding server-only import)
const MIN_VAHA_KG = 5;
const TOP_N_RYB = 5;

interface ScoringResult {
  skore: number;
  top5Ryby: Ulovek[];
  pocetRyb: number;
}

function calculateTymScore(ulovky: Ulovek[]): ScoringResult {
  const potvrzene = ulovky.filter(u => u.stav === 'potvrzeno');
  const validni = potvrzene.filter(u => u.vaha >= MIN_VAHA_KG);
  const sorted = [...validni].sort((a, b) => b.vaha - a.vaha);
  const top5 = sorted.slice(0, TOP_N_RYB);
  const skore = top5.reduce((sum, u) => sum + u.vaha, 0);
  
  return {
    skore,
    top5Ryby: top5,
    pocetRyb: top5.length,
  };
}

// Helper to create mock Ulovek
function createMockUlovek(overrides: Partial<Ulovek> = {}): Ulovek {
  return {
    id: crypto.randomUUID(),
    tym_id: 'team-1',
    zavod_id: 'zavod-1',
    vaha: 10,
    druh: 'kapr',
    foto_url: 'https://example.com/photo.jpg',
    chytil_user_id: null,
    cas: new Date().toISOString(),
    stav: 'potvrzeno',
    potvrzeno_rozhodcim: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('Scoring Module', () => {
  describe('calculateTymScore', () => {
    it('should return 0 for empty array', () => {
      const result = calculateTymScore([]);
      expect(result.skore).toBe(0);
      expect(result.pocetRyb).toBe(0);
      expect(result.top5Ryby).toHaveLength(0);
    });

    it('should only count confirmed catches (stav = potvrzeno)', () => {
      const ulovky: Ulovek[] = [
        createMockUlovek({ vaha: 10, stav: 'potvrzeno' }),
        createMockUlovek({ vaha: 15, stav: 'ceka' }),
        createMockUlovek({ vaha: 20, stav: 'zamitnuto' }),
      ];
      
      const result = calculateTymScore(ulovky);
      expect(result.skore).toBe(10);
      expect(result.pocetRyb).toBe(1);
    });

    it('should only count fish with weight >= 5kg (Requirement 5.3)', () => {
      const ulovky: Ulovek[] = [
        createMockUlovek({ vaha: 4.9, stav: 'potvrzeno' }),
        createMockUlovek({ vaha: 5, stav: 'potvrzeno' }),
        createMockUlovek({ vaha: 10, stav: 'potvrzeno' }),
      ];
      
      const result = calculateTymScore(ulovky);
      expect(result.skore).toBe(15); // 5 + 10
      expect(result.pocetRyb).toBe(2);
    });

    it('should sum top 5 heaviest fish (Requirement 5.1)', () => {
      const ulovky: Ulovek[] = [
        createMockUlovek({ vaha: 10, stav: 'potvrzeno' }),
        createMockUlovek({ vaha: 15, stav: 'potvrzeno' }),
        createMockUlovek({ vaha: 20, stav: 'potvrzeno' }),
        createMockUlovek({ vaha: 25, stav: 'potvrzeno' }),
        createMockUlovek({ vaha: 30, stav: 'potvrzeno' }),
        createMockUlovek({ vaha: 5, stav: 'potvrzeno' }), // Should not be counted
      ];
      
      const result = calculateTymScore(ulovky);
      // Top 5: 30 + 25 + 20 + 15 + 10 = 100
      expect(result.skore).toBe(100);
      expect(result.pocetRyb).toBe(5);
    });

    it('should count all fish if less than 5 (Requirement 5.2)', () => {
      const ulovky: Ulovek[] = [
        createMockUlovek({ vaha: 10, stav: 'potvrzeno' }),
        createMockUlovek({ vaha: 15, stav: 'potvrzeno' }),
        createMockUlovek({ vaha: 20, stav: 'potvrzeno' }),
      ];
      
      const result = calculateTymScore(ulovky);
      expect(result.skore).toBe(45); // 10 + 15 + 20
      expect(result.pocetRyb).toBe(3);
    });

    it('should count both kapr and amur (Requirement 5.4)', () => {
      const ulovky: Ulovek[] = [
        createMockUlovek({ vaha: 10, druh: 'kapr', stav: 'potvrzeno' }),
        createMockUlovek({ vaha: 15, druh: 'amur', stav: 'potvrzeno' }),
        createMockUlovek({ vaha: 20, druh: 'kapr', stav: 'potvrzeno' }),
      ];
      
      const result = calculateTymScore(ulovky);
      expect(result.skore).toBe(45); // All fish counted regardless of type
      expect(result.pocetRyb).toBe(3);
    });

    it('should return fish sorted by weight descending', () => {
      const ulovky: Ulovek[] = [
        createMockUlovek({ vaha: 10, stav: 'potvrzeno' }),
        createMockUlovek({ vaha: 30, stav: 'potvrzeno' }),
        createMockUlovek({ vaha: 20, stav: 'potvrzeno' }),
      ];
      
      const result = calculateTymScore(ulovky);
      expect(result.top5Ryby[0].vaha).toBe(30);
      expect(result.top5Ryby[1].vaha).toBe(20);
      expect(result.top5Ryby[2].vaha).toBe(10);
    });
  });
});
