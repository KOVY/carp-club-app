import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Vrátí bezpečnou same-origin relativní cestu pro redirect (ochrana proti Open Redirect),
 * jinak `fallback`. Povolí jen cesty začínající jedním '/', odmítne '//' a '/\' (protocol-relative).
 */
export function safeReturnTo(raw: string | null | undefined, fallback = ""): string {
  if (!raw) return fallback
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")) return raw
  return fallback
}
