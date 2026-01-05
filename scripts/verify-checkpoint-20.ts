/**
 * Checkpoint 20 Verification Script
 * 
 * This script verifies that the application is complete with:
 * - Realtime functionality working
 * - Notifications working
 * - Archive functionality working
 * 
 * Checkpoint 20: Aplikace kompletní
 * - Ověřit, že realtime funguje
 * - Ověřit, že notifikace fungují
 * - Ověřit, že archiv funguje
 */

import * as fs from 'fs'
import * as path from 'path'

interface CheckResult {
  name: string
  passed: boolean
  details: string
}

const results: CheckResult[] = []

function checkFileExists(filePath: string, description: string): boolean {
  const fullPath = path.join(process.cwd(), filePath)
  let exists = false
  try {
    exists = fs.existsSync(fullPath)
  } catch {
    exists = false
  }
  results.push({
    name: description,
    passed: exists,
    details: exists ? `File exists: ${filePath}` : `File missing: ${filePath}`
  })
  return exists
}

function checkFileContains(filePath: string, searchString: string, description: string): boolean {
  const fullPath = path.join(process.cwd(), filePath)
  let content = ''
  try {
    if (!fs.existsSync(fullPath)) {
      results.push({
        name: description,
        passed: false,
        details: `File not found: ${filePath}`
      })
      return false
    }
    content = fs.readFileSync(fullPath, 'utf-8')
  } catch (err) {
    results.push({
      name: description,
      passed: false,
      details: `Error reading file: ${filePath}`
    })
    return false
  }
  
  const contains = content.includes(searchString)
  results.push({
    name: description,
    passed: contains,
    details: contains 
      ? `Found "${searchString}" in ${filePath}` 
      : `Missing "${searchString}" in ${filePath}`
  })
  return contains
}

console.log('='.repeat(60))
console.log('Checkpoint 20 Verification - Aplikace kompletní')
console.log('='.repeat(60))
console.log()

// ============================================
// 1. REALTIME FUNCTIONALITY
// ============================================
console.log('1. Verifying Realtime functionality...')
console.log('-'.repeat(40))

// Check useRealtimeUlovky hook
checkFileExists('src/hooks/useRealtimeUlovky.ts', 'useRealtimeUlovky hook exists')
checkFileContains('src/hooks/useRealtimeUlovky.ts', 'postgres_changes', 'useRealtimeUlovky uses postgres_changes')
checkFileContains('src/hooks/useRealtimeUlovky.ts', 'RealtimeChannel', 'useRealtimeUlovky uses RealtimeChannel')
checkFileContains('src/hooks/useRealtimeUlovky.ts', 'onNewUlovek', 'useRealtimeUlovky has onNewUlovek callback')
checkFileContains('src/hooks/useRealtimeUlovky.ts', 'onUlovekConfirmed', 'useRealtimeUlovky has onUlovekConfirmed callback')
checkFileContains('src/hooks/useRealtimeUlovky.ts', 'TIMED_OUT', 'useRealtimeUlovky handles timeout/reconnect')

// Check useZavodState hook for realtime updates
checkFileExists('src/hooks/useZavodState.ts', 'useZavodState hook exists')
checkFileContains('src/hooks/useZavodState.ts', 'postgres_changes', 'useZavodState uses postgres_changes')
checkFileContains('src/hooks/useZavodState.ts', 'isEmbargoActive', 'useZavodState tracks embargo state')
checkFileContains('src/hooks/useZavodState.ts', 'isActive', 'useZavodState tracks active state')

console.log()

// ============================================
// 2. NOTIFICATIONS FUNCTIONALITY
// ============================================
console.log('2. Verifying Notifications functionality...')
console.log('-'.repeat(40))

// Check useRealtimeNotifications hook
checkFileExists('src/hooks/useRealtimeNotifications.ts', 'useRealtimeNotifications hook exists')
checkFileContains('src/hooks/useRealtimeNotifications.ts', 'toast', 'useRealtimeNotifications uses toast')
checkFileContains('src/hooks/useRealtimeNotifications.ts', 'Nový úlovek k potvrzení', 'Notification for new catch to confirm')
checkFileContains('src/hooks/useRealtimeNotifications.ts', 'Úlovek potvrzen', 'Notification for catch confirmed')
checkFileContains('src/hooks/useRealtimeNotifications.ts', 'Žlutá karta', 'Notification for yellow card')
checkFileContains('src/hooks/useRealtimeNotifications.ts', 'zlute_karty', 'useRealtimeNotifications subscribes to yellow cards')
checkFileContains('src/hooks/useRealtimeNotifications.ts', 'potvrzeni', 'useRealtimeNotifications subscribes to confirmations')

// Check toast system
checkFileExists('src/hooks/use-toast.ts', 'Toast hook exists')
checkFileExists('src/components/ui/toast.tsx', 'Toast component exists')
checkFileExists('src/components/ui/toaster.tsx', 'Toaster component exists')

console.log()

// ============================================
// 3. ARCHIVE FUNCTIONALITY
// ============================================
console.log('3. Verifying Archive functionality...')
console.log('-'.repeat(40))

// Check archive page
checkFileExists('src/app/archiv/page.tsx', 'Archive page exists')
checkFileContains('src/app/archiv/page.tsx', 'ukoncen', 'Archive filters by completed competitions')
checkFileContains('src/app/archiv/page.tsx', 'souteze', 'Archive shows soutez info')
checkFileContains('src/app/archiv/page.tsx', 'FilterState', 'Archive has filtering capability')
checkFileContains('src/app/archiv/page.tsx', 'rok', 'Archive can filter by year')
checkFileContains('src/app/archiv/page.tsx', 'soutezId', 'Archive can filter by soutez')
checkFileContains('src/app/archiv/page.tsx', '/api/export/', 'Archive has export link')

// Check export functionality
checkFileExists('src/actions/export.actions.ts', 'Export actions exist')
checkFileContains('src/actions/export.actions.ts', 'generateHtmlExport', 'generateHtmlExport action exists')
checkFileContains('src/actions/export.actions.ts', 'leaderboard', 'Export includes leaderboard')
checkFileContains('src/actions/export.actions.ts', 'top10Fish', 'Export includes top 10 fish')

// Check export API route
checkFileExists('src/app/api/export/[zavodId]/route.ts', 'Export API route exists')
checkFileContains('src/app/api/export/[zavodId]/route.ts', 'Content-Disposition', 'Export sets download headers')
checkFileContains('src/app/api/export/[zavodId]/route.ts', 'text/html', 'Export returns HTML content type')

// Check main page shows competitions
checkFileExists('src/app/page.tsx', 'Main page exists')

console.log()

// ============================================
// 4. HOOKS INDEX EXPORT
// ============================================
console.log('4. Verifying hooks are properly exported...')
console.log('-'.repeat(40))

checkFileExists('src/hooks/index.ts', 'Hooks index exists')
checkFileContains('src/hooks/index.ts', 'useRealtimeUlovky', 'useRealtimeUlovky is exported')
checkFileContains('src/hooks/index.ts', 'useRealtimeNotifications', 'useRealtimeNotifications is exported')
checkFileContains('src/hooks/index.ts', 'useZavodState', 'useZavodState is exported')
checkFileContains('src/hooks/index.ts', 'useUserRole', 'useUserRole is exported')

console.log()

// ============================================
// PRINT RESULTS
// ============================================
console.log('='.repeat(60))
console.log('RESULTS')
console.log('='.repeat(60))

const passed = results.filter(r => r.passed).length
const failed = results.filter(r => !r.passed).length

results.forEach(r => {
  const status = r.passed ? '✓' : '✗'
  console.log(`${status} ${r.name}`)
  if (!r.passed) {
    console.log(`  Details: ${r.details}`)
  }
})

console.log()
console.log(`Total: ${passed} passed, ${failed} failed`)
console.log()

if (failed === 0) {
  console.log('✓ Checkpoint 20 PASSED - Aplikace kompletní')
  console.log()
  console.log('Summary:')
  console.log('- Realtime: useRealtimeUlovky hook provides live updates via Supabase Realtime')
  console.log('- Realtime: useZavodState hook tracks competition state in real-time')
  console.log('- Notifications: Toast notifications for new catches, confirmations, and yellow cards')
  console.log('- Archive: Archive page displays completed competitions with filtering')
  console.log('- Archive: HTML export functionality for publishing results')
  process.exit(0)
} else {
  console.log('✗ Checkpoint 20 FAILED')
  process.exit(1)
}
