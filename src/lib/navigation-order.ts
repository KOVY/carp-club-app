/**
 * Navigation order for swipe gestures in competition pages
 * Defines the order of pages for left/right swipe navigation
 */

/**
 * Ordered list of competition pages for swipe navigation
 * Empty string represents the main competition page
 */
export const ZAVOD_PAGES = [
  '',            // Přehled
  '/leaderboard', // Pořadí
  '/galerie',     // Galerie
  '/pravidla',    // Pravidla
  '/ulovky',      // Přidat úlovek
] as const;

export type ZavodPage = typeof ZAVOD_PAGES[number];

interface AdjacentPages {
  prev: string | null;
  next: string | null;
}

/**
 * Get adjacent pages for swipe navigation
 * @param currentPath - Current pathname (e.g., '/zavod/abc123/leaderboard')
 * @param zavodId - Competition ID
 * @returns Object with prev and next page URLs, or null if at edge
 */
export function getAdjacentPages(currentPath: string, zavodId: string): AdjacentPages {
  const basePath = `/zavod/${zavodId}`;

  // Extract the page suffix from the path
  const pageSuffix = currentPath.replace(basePath, '') || '';

  // Find current page index
  const currentIndex = ZAVOD_PAGES.indexOf(pageSuffix as ZavodPage);

  // If page not found in list, return null for both
  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  // Calculate adjacent indices
  const prevIndex = currentIndex > 0 ? currentIndex - 1 : null;
  const nextIndex = currentIndex < ZAVOD_PAGES.length - 1 ? currentIndex + 1 : null;

  return {
    prev: prevIndex !== null ? `${basePath}${ZAVOD_PAGES[prevIndex]}` : null,
    next: nextIndex !== null ? `${basePath}${ZAVOD_PAGES[nextIndex]}` : null,
  };
}

/**
 * Get page label for display
 */
export function getPageLabel(pageSuffix: string): string {
  const labels: Record<string, string> = {
    '': 'Přehled',
    '/leaderboard': 'Pořadí',
    '/galerie': 'Galerie',
    '/pravidla': 'Pravidla',
    '/ulovky': 'Přidat úlovek',
    '/potvrzeni': 'Potvrzení',
    '/admin': 'Admin',
  };
  return labels[pageSuffix] || pageSuffix;
}
