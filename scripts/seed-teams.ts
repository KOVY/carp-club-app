/**
 * Seed Script pro týmy Liga A a Liga B
 *
 * Použití:
 *   npx tsx scripts/seed-teams.ts --zavod-id=<UUID_ZAVODU> [--liga=A|B|both]
 *
 * Příklad:
 *   npx tsx scripts/seed-teams.ts --zavod-id=123e4567-e89b-12d3-a456-426614174000
 *   npx tsx scripts/seed-teams.ts --zavod-id=123e4567-e89b-12d3-a456-426614174000 --liga=A
 *
 * Co script udělá:
 *   1. Vytvoří týmy pro specifikovanou ligu (A, B nebo obě)
 *   2. Pro každý tým vytvoří "placeholder" profily (jen jméno, bez emailu)
 *   3. Přiřadí kapitány a závodníky do týmů
 *   4. Nevyžaduje emaily - ty se doplní později v admin UI
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { LIGA_A_TEAMS, LIGA_B_TEAMS, generateSlug, getRandomTeamColor, type TeamData } from './team-data'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const parsed: { zavodId?: string; liga?: 'A' | 'B' | 'both' } = {}

  for (const arg of args) {
    if (arg.startsWith('--zavod-id=')) {
      parsed.zavodId = arg.split('=')[1]
    } else if (arg.startsWith('--liga=')) {
      const liga = arg.split('=')[1].toUpperCase()
      if (liga === 'A' || liga === 'B' || liga === 'BOTH') {
        parsed.liga = liga === 'BOTH' ? 'both' : liga as 'A' | 'B'
      }
    }
  }

  return parsed
}

async function createPlaceholderUser(jmeno: string): Promise<string | null> {
  const slug = generateSlug(jmeno)
  const placeholderEmail = `${slug}-${Date.now()}@placeholder.local`

  try {
    // Vytvoř placeholder uživatele
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: placeholderEmail,
      email_confirm: true,
      user_metadata: {
        jmeno,
        is_placeholder: true,
      },
    })

    if (userError || !user.user) {
      console.error(`  ❌ Failed to create user for ${jmeno}:`, userError?.message)
      return null
    }

    // Vytvoř profil
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.user.id,
        email: placeholderEmail,
        jmeno,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (profileError) {
      console.error(`  ⚠️ Profile creation warning for ${jmeno}:`, profileError.message)
    }

    return user.user.id
  } catch (error) {
    console.error(`  ❌ Error creating user ${jmeno}:`, error)
    return null
  }
}

async function seedTeam(
  team: TeamData,
  zavodId: string,
  teamIndex: number,
  liga: string
): Promise<boolean> {
  console.log(`\n📝 Creating team: ${team.nazev}`)

  try {
    // 1. Vytvoř kapitána
    const kapitanId = await createPlaceholderUser(team.kapitan)
    if (!kapitanId) {
      console.error(`  ❌ Skipping team - could not create captain`)
      return false
    }
    console.log(`  ✅ Captain: ${team.kapitan}`)

    // 2. Vytvoř tým
    const { data: tymData, error: tymError } = await supabase
      .from('tymy')
      .insert({
        zavod_id: zavodId,
        nazev: team.nazev,
        kapitan_id: kapitanId,
        barva: getRandomTeamColor(teamIndex),
      })
      .select('id')
      .single()

    if (tymError || !tymData) {
      console.error(`  ❌ Failed to create team:`, tymError?.message)
      return false
    }

    const tymId = tymData.id
    console.log(`  ✅ Team created: ${tymId}`)

    // 3. Přidej kapitána do týmu
    const { error: kapitanTymError } = await supabase
      .from('clenove_tymu')
      .insert({
        tym_id: tymId,
        user_id: kapitanId,
        role: 'kapitan',
      })

    if (kapitanTymError) {
      console.error(`  ⚠️ Warning: could not add captain to team:`, kapitanTymError.message)
    }

    // 4. Přidej roli kapitána v závodě
    const { error: kapitanRoleError } = await supabase
      .from('zavod_role')
      .upsert({
        zavod_id: zavodId,
        user_id: kapitanId,
        role: 'kapitan',
      }, { onConflict: 'zavod_id,user_id' })

    if (kapitanRoleError) {
      console.error(`  ⚠️ Warning: could not assign captain role:`, kapitanRoleError.message)
    }

    // 5. Vytvoř závodníky
    for (const zavodnik of team.zavodnici) {
      const zavodnikId = await createPlaceholderUser(zavodnik)
      if (!zavodnikId) {
        console.error(`  ⚠️ Skipping member: ${zavodnik}`)
        continue
      }

      // Přidej do týmu
      const { error: memberError } = await supabase
        .from('clenove_tymu')
        .insert({
          tym_id: tymId,
          user_id: zavodnikId,
          role: 'zavodnik',
        })

      if (memberError) {
        console.error(`  ⚠️ Warning: could not add ${zavodnik} to team:`, memberError.message)
      }

      // Přidej roli v závodě
      const { error: roleError } = await supabase
        .from('zavod_role')
        .upsert({
          zavod_id: zavodId,
          user_id: zavodnikId,
          role: 'zavodnik',
        }, { onConflict: 'zavod_id,user_id' })

      if (roleError) {
        console.error(`  ⚠️ Warning: could not assign role for ${zavodnik}:`, roleError.message)
      }

      console.log(`  ✅ Member: ${zavodnik}`)
    }

    console.log(`  ✅ Team ${team.nazev} seeded successfully with ${team.zavodnici.length + 1} members`)
    return true
  } catch (error) {
    console.error(`  ❌ Error seeding team ${team.nazev}:`, error)
    return false
  }
}

async function main() {
  const args = parseArgs()

  if (!args.zavodId) {
    console.error('❌ Missing --zavod-id argument')
    console.log('\nUsage:')
    console.log('  npx tsx scripts/seed-teams.ts --zavod-id=<UUID_ZAVODU> [--liga=A|B|both]')
    console.log('\nExample:')
    console.log('  npx tsx scripts/seed-teams.ts --zavod-id=123e4567-e89b-12d3-a456-426614174000')
    process.exit(1)
  }

  const liga = args.liga || 'both'

  console.log('🐟 Carp Club - Team Seeder')
  console.log('='.repeat(50))
  console.log(`📍 Závod ID: ${args.zavodId}`)
  console.log(`📋 Liga: ${liga === 'both' ? 'A + B' : liga}`)

  // Ověř, že závod existuje
  const { data: zavod, error: zavodError } = await supabase
    .from('zavody')
    .select('id, nazev')
    .eq('id', args.zavodId)
    .single()

  if (zavodError || !zavod) {
    console.error(`❌ Závod s ID ${args.zavodId} nenalezen`)
    process.exit(1)
  }

  console.log(`✅ Závod nalezen: ${zavod.nazev}`)

  // Seedy týmy
  let teamsToSeed: { team: TeamData; liga: string }[] = []

  if (liga === 'A' || liga === 'both') {
    teamsToSeed = teamsToSeed.concat(LIGA_A_TEAMS.map(t => ({ team: t, liga: 'A' })))
  }

  if (liga === 'B' || liga === 'both') {
    teamsToSeed = teamsToSeed.concat(LIGA_B_TEAMS.map(t => ({ team: t, liga: 'B' })))
  }

  console.log(`\n🏁 Seeding ${teamsToSeed.length} teams...`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < teamsToSeed.length; i++) {
    const { team, liga: teamLiga } = teamsToSeed[i]
    const success = await seedTeam(team, args.zavodId, i, teamLiga)
    if (success) {
      successCount++
    } else {
      errorCount++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`✅ Seeding complete!`)
  console.log(`   - Success: ${successCount} teams`)
  console.log(`   - Errors: ${errorCount} teams`)
  console.log('')
  console.log('📌 Next steps:')
  console.log('   1. Otevřete admin portal: /admin')
  console.log('   2. Vyberte závod a klikněte na "Týmy"')
  console.log('   3. Pro každého člena doplňte email')
  console.log('   4. Systém automaticky pošle pozvánky s magic linkem')
}

main().catch(console.error)
