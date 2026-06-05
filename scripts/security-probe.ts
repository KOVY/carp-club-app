// scripts/security-probe.ts
// Bezpečnostní probe: simuluje útočníka s veřejným ANON klíčem.
// Ověřuje, že citlivá data NEJSOU čitelná. Spouštět PŘED a PO migraci 016.
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const anonClient = createClient(url, anon)

type Result = { name: string; pass: boolean; detail: string }
const results: Result[] = []

function record(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail })
}

async function main() {
  // Probe 1: pozvanky — tokeny a kontakty NESMÍ být čitelné anonymně
  {
    const { data, error } = await anonClient.from('pozvanky').select('token, email, telefon').limit(5)
    const leaked = (data?.length ?? 0) > 0
    record('pozvanky anon SELECT', !leaked, leaked ? `LEAK: ${data!.length} řádků (token/email)` : `OK (${error?.message ?? 'prázdno'})`)
  }
  // Probe 2: profiles — email/telefon NESMÍ být čitelné anonymně
  {
    const { data, error } = await anonClient.from('profiles').select('email, telefon').limit(5)
    const leaked = (data ?? []).some(r => (r as any).email || (r as any).telefon)
    record('profiles anon email/telefon', !leaked, leaked ? `LEAK: PII viditelné` : `OK (${error?.message ?? 'bez PII'})`)
  }
  // Probe 3: system_admins — NESMÍ být čitelné anonymně
  {
    const { data, error } = await anonClient.from('system_admins').select('*').limit(5)
    const leaked = (data?.length ?? 0) > 0
    record('system_admins anon SELECT', !leaked, leaked ? `LEAK: ${data!.length} adminů` : `OK (${error?.message ?? 'prázdno'})`)
  }
  // Probe 4: register_via_invitation — NESMÍ jít volat anonymně
  {
    const { error } = await anonClient.rpc('register_via_invitation' as any, { p_token: '00000000-0000-0000-0000-000000000000' })
    const denied = !!error && /permission|denied|not.*exist|function/i.test(error.message)
    record('register_via_invitation anon EXECUTE', denied, denied ? `OK (odmítnuto: ${error!.message})` : `LEAK: funkce volatelná anonymně`)
  }

  console.log('\n=== SECURITY PROBE ===')
  for (const r of results) console.log(`${r.pass ? '✅ PASS' : '❌ FAIL'}  ${r.name}  — ${r.detail}`)
  const failed = results.filter(r => !r.pass).length
  console.log(`\n${failed === 0 ? '✅ Všechny probe prošly' : `❌ ${failed} probe selhalo`}`)
  process.exit(failed === 0 ? 0 : 1)
}
main()
