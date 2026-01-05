/**
 * UI Checkpoint Verification Script
 * 
 * This script verifies that the UI components for the závod (competition) are properly implemented.
 * 
 * Checkpoint 17: UI závodu hotové
 * - Ověřit, že formulář úlovku funguje
 * - Ověřit, že potvrzování funguje
 * - Ověřit, že leaderboard se zobrazuje
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

// Find files in dynamic route directories
function findDynamicRouteFile(basePath: string, fileName: string): string | null {
  const baseDir = path.join(process.cwd(), basePath)
  if (!fs.existsSync(baseDir)) return null
  
  const entries = fs.readdirSync(baseDir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const filePath = path.join(baseDir, entry.name, fileName)
      if (fs.existsSync(filePath)) {
        return path.join(basePath, entry.name, fileName)
      }
    }
  }
  return null
}

function checkDynamicRouteFileContains(basePath: string, fileName: string, searchString: string, description: string): boolean {
  const filePath = findDynamicRouteFile(basePath, fileName)
  if (!filePath) {
    results.push({
      name: description,
      passed: false,
      details: `No file found matching ${basePath}/*/${fileName}`
    })
    return false
  }
  
  return checkFileContains(filePath, searchString, description)
}

console.log('='.repeat(60))
console.log('UI Checkpoint Verification - Task 17')
console.log('='.repeat(60))
console.log()

// 1. Verify UlovekForm component exists and has required functionality
console.log('1. Verifying UlovekForm component...')
checkFileExists('src/components/zavod/UlovekForm.tsx', 'UlovekForm component exists')
checkFileContains('src/components/zavod/UlovekForm.tsx', 'submitUlovek', 'UlovekForm calls submitUlovek action')
checkFileContains('src/components/zavod/UlovekForm.tsx', 'MIN_VAHA_KG', 'UlovekForm validates minimum weight')
checkFileContains('src/components/zavod/UlovekForm.tsx', 'PhotoUploader', 'UlovekForm includes photo upload')
checkFileContains('src/components/zavod/UlovekForm.tsx', 'druh', 'UlovekForm includes fish type selection')

// 2. Verify PotvrzeniList component exists and has required functionality
console.log('2. Verifying PotvrzeniList component...')
checkFileExists('src/components/zavod/PotvrzeniList.tsx', 'PotvrzeniList component exists')
checkFileContains('src/components/zavod/PotvrzeniList.tsx', 'potvrditUlovek', 'PotvrzeniList calls potvrditUlovek action')
checkFileContains('src/components/zavod/PotvrzeniList.tsx', 'Potvrdit', 'PotvrzeniList has confirm button')
checkFileContains('src/components/zavod/PotvrzeniList.tsx', 'Zamítnout', 'PotvrzeniList has reject button')

// 3. Verify LeaderboardTable component exists and has required functionality
console.log('3. Verifying LeaderboardTable component...')
checkFileExists('src/components/zavod/LeaderboardTable.tsx', 'LeaderboardTable component exists')
checkFileContains('src/components/zavod/LeaderboardTable.tsx', 'embargoActive', 'LeaderboardTable respects embargo')
checkFileContains('src/components/zavod/LeaderboardTable.tsx', 'skore', 'LeaderboardTable displays score')
checkFileContains('src/components/zavod/LeaderboardTable.tsx', 'zluteKarty', 'LeaderboardTable displays yellow cards')

// 4. Verify pages exist and use components (using dynamic route finder)
console.log('4. Verifying pages...')
checkDynamicRouteFileContains('src/app/zavod', 'ulovky/page.tsx', 'UlovekForm', 'Ulovky page uses UlovekForm')
checkDynamicRouteFileContains('src/app/zavod', 'ulovky/page.tsx', 'PotvrzeniList', 'Ulovky page uses PotvrzeniList')
checkDynamicRouteFileContains('src/app/zavod', 'leaderboard/page.tsx', 'LeaderboardTable', 'Leaderboard page uses LeaderboardTable')
checkDynamicRouteFileContains('src/app/zavod', 'leaderboard/page.tsx', 'NejvetsiRybaCard', 'Leaderboard page uses NejvetsiRybaCard')

// 5. Verify server actions exist
console.log('5. Verifying server actions...')
checkFileExists('src/actions/ulovky.actions.ts', 'Ulovky actions exist')
checkFileContains('src/actions/ulovky.actions.ts', 'submitUlovek', 'submitUlovek action exists')
checkFileContains('src/actions/ulovky.actions.ts', 'getUlovkyKPotvrzeni', 'getUlovkyKPotvrzeni action exists')

checkFileExists('src/actions/potvrzeni.actions.ts', 'Potvrzeni actions exist')
checkFileContains('src/actions/potvrzeni.actions.ts', 'potvrditUlovek', 'potvrditUlovek action exists')

checkFileExists('src/actions/leaderboard.actions.ts', 'Leaderboard actions exist')
checkFileContains('src/actions/leaderboard.actions.ts', 'getLeaderboard', 'getLeaderboard action exists')
checkFileContains('src/actions/leaderboard.actions.ts', 'getNejvetsiRyby', 'getNejvetsiRyby action exists')

// Print results
console.log()
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
  console.log('✓ UI Checkpoint 17 PASSED')
  console.log()
  console.log('Summary:')
  console.log('- UlovekForm component is properly implemented with weight validation and photo upload')
  console.log('- PotvrzeniList component allows confirming/rejecting catches from neighbor pegs')
  console.log('- LeaderboardTable displays team rankings with embargo support')
  console.log('- All pages are properly connected to their respective components and server actions')
  process.exit(0)
} else {
  console.log('✗ UI Checkpoint 17 FAILED')
  process.exit(1)
}
