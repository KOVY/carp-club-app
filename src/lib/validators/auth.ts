export type Validation = { ok: true } | { ok: false; reason: string }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email: string): Validation {
  if (!email || !EMAIL_RE.test(email)) return { ok: false, reason: 'Neplatný email' }
  return { ok: true }
}
export function validatePassword(password: string): Validation {
  if (!password || password.length < 8) return { ok: false, reason: 'Heslo musí mít alespoň 8 znaků' }
  return { ok: true }
}
export function validateJmeno(jmeno: string): Validation {
  if (!jmeno || jmeno.trim().length < 2) return { ok: false, reason: 'Zadej jméno' }
  return { ok: true }
}
