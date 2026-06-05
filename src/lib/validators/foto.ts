export const ALLOWED_FOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_FOTO_BYTES = 10 * 1024 * 1024 // 10 MB
export const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
}

export type FotoValidation = { ok: true } | { ok: false; reason: string }

export function validateFotoFile(file: File | null | undefined): FotoValidation {
  if (!file || file.size === 0) return { ok: false, reason: 'Chybí fotka úlovku' }
  if (!(ALLOWED_FOTO_MIME as readonly string[]).includes(file.type)) {
    return { ok: false, reason: 'Nepovolený formát (jen JPEG, PNG, WebP)' }
  }
  if (file.size > MAX_FOTO_BYTES) return { ok: false, reason: 'Fotka je příliš velká (max 10 MB)' }
  return { ok: true }
}
