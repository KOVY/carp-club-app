/**
 * Scoring module for calculating team scores
 * SERVER ONLY - never import in client components
 *
 * Requirements (Pravidla 2026):
 * - 5.1: Score is sum of top 7 heaviest confirmed fish
 * - 5.2: If team has less than 7 fish, sum all confirmed fish
 * - 5.3: Only fish with weight >= 5kg count
 * - 5.4: Both kapr and amur count towards the same total
 * - 5.5: Tie-breaking by time of last counted catch (earlier = better)
 */
import 'server-only';

import { MIN_VAHA_KG, TOP_N_RYB } from './constants';
import type { Ulovek } from '@/types/database.types';
import type { LeaderboardEntry, ScoringResult } from './types';

/**
 * Calculate team score from their catches
 *
 * @param ulovky - Array of team's catches
 * @returns ScoringResult with score, top N fish (7 by default), and count
 */
export function calculateTymScore(ulovky: Ulovek[]): ScoringResult {
  // 1. Filter only confirmed catches (stav = 'potvrzeno')
  const potvrzene = ulovky.filter(u => u.stav === 'potvrzeno');
  
  // 2. Filter weight >= MIN_VAHA_KG (5kg)
  const validni = potvrzene.filter(u => u.vaha >= MIN_VAHA_KG);
  
  // 3. Sort descending by weight
  const sorted = [...validni].sort((a, b) => b.vaha - a.vaha);
  
  // 4. Take top N fish (7 by Pravidla 2026)
  const top5 = sorted.slice(0, TOP_N_RYB);
  
  // 5. Sum weights
  const skore = top5.reduce((sum, u) => sum + u.vaha, 0);
  
  return {
    skore,
    top5Ryby: top5,
    pocetRyb: top5.length,
  };
}

/**
 * Sort leaderboard entries by score and tie-breaking rules
 * 
 * Primary: Score (descending)
 * Secondary: Time of last counted catch (earlier = better)
 * 
 * @param entries - Array of leaderboard entries
 * @returns Sorted array with updated poradi (rank)
 */
export function sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const sorted = [...entries].sort((a, b) => {
    // Primary: Score descending
    if (b.skore !== a.skore) {
      return b.skore - a.skore;
    }
    
    // Secondary: Time of last counted catch (earlier = better)
    // poradiCas is the confirmation time of the last counted fish
    const timeA = new Date(a.poradiCas).getTime();
    const timeB = new Date(b.poradiCas).getTime();
    return timeA - timeB;
  });
  
  // Update poradi (rank) for each entry
  return sorted.map((entry, index) => ({
    ...entry,
    poradi: index + 1,
  }));
}

/**
 * Get the time of the last counted catch for tie-breaking
 * Uses the confirmation time (updated_at when stav changed to 'potvrzeno')
 *
 * @param top5Ryby - Array of top N fish for the team
 * @returns ISO string of the latest confirmation time, or epoch if no fish
 */
export function getPoradiCas(top5Ryby: Ulovek[]): string {
  if (top5Ryby.length === 0) {
    return new Date(0).toISOString();
  }
  
  // Find the latest updated_at among top 5 fish
  // This represents when the last fish was confirmed
  const times = top5Ryby.map(u => new Date(u.updated_at).getTime());
  const latestTime = Math.max(...times);
  
  return new Date(latestTime).toISOString();
}
