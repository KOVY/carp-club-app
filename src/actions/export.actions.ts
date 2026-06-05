'use server'
// @ts-nocheck

/**
 * Export Server Actions
 * 
 * Requirements:
 * - 11.4: Export results to HTML format for web publication
 */

import { createClient } from '@/lib/supabase/server'
import { ErrorCodes, ErrorMessages, toErrorResponse } from '@/lib/errors'
import { calculateTymScore, sortLeaderboard, getPoradiCas } from '@/lib/scoring'
import type { 
  ActionResult, 
  LeaderboardEntry,
  TymWithRelations,
  Zavod,
  Tym,
  Ulovek,
  ZlutaKarta,
  Soutez
} from '@/lib/types'

interface ZavodWithSoutez extends Zavod {
  souteze?: Soutez | null
}

/**
 * Generate HTML export of competition results
 * 
 * Requirement 11.4: Export results to HTML format for web publication
 */
export async function generateHtmlExport(
  zavodId: string
): Promise<ActionResult<{ html: string; filename: string }>> {
  try {
    const supabase = await createClient()

    // Get zavod with soutez info
    const { data: zavod, error: zavodError } = await supabase
      .from('zavody')
      .select(`
        *,
        souteze (*)
      `)
      .eq('id', zavodId)
      .single()

    if (zavodError || !zavod) {
      return {
        success: false,
        error: {
          code: ErrorCodes.ZAVOD_NOT_FOUND,
          message: ErrorMessages[ErrorCodes.ZAVOD_NOT_FOUND],
        },
      }
    }

    const zavodData = zavod as ZavodWithSoutez

    // Get all teams with captain info
    const { data: teams, error: teamsError } = await supabase
      .from('tymy')
      .select(`
        *,
        kapitan:profiles!tymy_kapitan_id_fkey(id, jmeno)
      `)
      .eq('zavod_id', zavodId)

    if (teamsError) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
        },
      }
    }

    const teamsData = (teams || []) as TymWithRelations[]

    // Get all confirmed catches
    const { data: ulovky, error: ulovkyError } = await supabase
      .from('ulovky')
      .select('*')
      .eq('zavod_id', zavodId)
      .eq('stav', 'potvrzeno')

    if (ulovkyError) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
        },
      }
    }

    const ulovkyData = (ulovky || []) as Ulovek[]

    // Get yellow cards
    const { data: zluteKarty, error: zluteKartyError } = await supabase
      .from('zlute_karty')
      .select('tym_id')
      .eq('zavod_id', zavodId)

    if (zluteKartyError) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
        },
      }
    }

    // Count yellow cards per team
    const yellowCardCounts = new Map<string, number>()
    const zluteKartyData = (zluteKarty || []) as Pick<ZlutaKarta, 'tym_id'>[]
    for (const karta of zluteKartyData) {
      const count = yellowCardCounts.get(karta.tym_id) || 0
      yellowCardCounts.set(karta.tym_id, count + 1)
    }

    // Build leaderboard entries
    const leaderboardEntries: LeaderboardEntry[] = teamsData.map(tym => {
      const tymUlovky = ulovkyData.filter(u => u.tym_id === tym.id)
      const scoringResult = calculateTymScore(tymUlovky)
      const poradiCas = getPoradiCas(scoringResult.top5Ryby)
      const zluteKartyCount = yellowCardCounts.get(tym.id) || 0

      return {
        tym,
        skore: scoringResult.skore,
        pocetRyb: scoringResult.pocetRyb,
        top5Ryby: scoringResult.top5Ryby,
        zluteKarty: zluteKartyCount,
        poradiCas,
        poradi: 0,
      }
    })

    const sortedLeaderboard = sortLeaderboard(leaderboardEntries)

    // Get top 10 fish
    const top10Fish = [...ulovkyData]
      .sort((a, b) => b.vaha - a.vaha)
      .slice(0, 10)
      .map(fish => {
        const team = teamsData.find(t => t.id === fish.tym_id)
        return { ...fish, tymNazev: team?.nazev || 'Neznámý tým' }
      })

    // Generate HTML
    const html = generateHtmlDocument(zavodData, sortedLeaderboard, top10Fish)

    // Generate filename
    const dateStr = new Date(zavodData.datum_start).toISOString().split('T')[0]
    const filename = `vysledky-${zavodData.nazev.toLowerCase().replace(/\s+/g, '-')}-${dateStr}.html`

    return {
      success: true,
      data: {
        html,
        filename,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  
  if (startDate.toDateString() === endDate.toDateString()) {
    return formatDate(start)
  }
  
  return `${formatDate(start)} - ${formatDate(end)}`
}

function generateHtmlDocument(
  zavod: ZavodWithSoutez,
  leaderboard: LeaderboardEntry[],
  top10Fish: (Ulovek & { tymNazev: string })[]
): string {
  const soutezInfo = zavod.souteze 
    ? `Soutěž ${zavod.souteze.nazev} ${zavod.souteze.rok}` 
    : ''

  const leaderboardRows = leaderboard.map((entry, index) => `
    <tr>
      <td class="rank">${index + 1}.</td>
      <td class="team">${escapeHtml(entry.tym.nazev)}</td>
      <td class="peg">${entry.tym.peg_cislo || '-'}</td>
      <td class="score">${entry.skore.toFixed(2)} kg</td>
      <td class="fish-count">${entry.pocetRyb}</td>
      <td class="yellow-cards">${entry.zluteKarty > 0 ? '🟨'.repeat(entry.zluteKarty) : '-'}</td>
    </tr>
  `).join('')

  const top10Rows = top10Fish.map((fish, index) => `
    <tr>
      <td class="rank">${index + 1}.</td>
      <td class="weight">${fish.vaha.toFixed(2)} kg</td>
      <td class="species">${fish.druh === 'kapr' ? 'Kapr' : 'Amur'}</td>
      <td class="team">${escapeHtml(fish.tymNazev)}</td>
      <td class="time">${new Date(fish.cas).toLocaleString('cs-CZ')}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Výsledky - ${escapeHtml(zavod.nazev)}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    
    .container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 30px;
    }
    
    header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e0e0e0;
    }
    
    h1 {
      font-size: 2rem;
      color: #1a1a1a;
      margin-bottom: 10px;
    }
    
    .subtitle {
      color: #666;
      font-size: 1.1rem;
    }
    
    .meta {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-top: 15px;
      flex-wrap: wrap;
    }
    
    .meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #555;
    }
    
    section {
      margin-bottom: 40px;
    }
    
    h2 {
      font-size: 1.5rem;
      color: #1a1a1a;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #555;
    }
    
    tr:hover {
      background: #f8f9fa;
    }
    
    .rank {
      width: 60px;
      font-weight: 600;
      color: #666;
    }
    
    .score, .weight {
      font-weight: 600;
      color: #2563eb;
    }
    
    .peg {
      text-align: center;
    }
    
    .fish-count, .yellow-cards {
      text-align: center;
    }
    
    .top-3 {
      background: linear-gradient(to right, #fef3c7, transparent);
    }
    
    tr:nth-child(1) .rank { color: #d4af37; }
    tr:nth-child(2) .rank { color: #a8a8a8; }
    tr:nth-child(3) .rank { color: #cd7f32; }
    
    footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      color: #888;
      font-size: 0.9rem;
    }
    
    @media (max-width: 768px) {
      body {
        padding: 10px;
      }
      
      .container {
        padding: 15px;
      }
      
      h1 {
        font-size: 1.5rem;
      }
      
      th, td {
        padding: 8px 10px;
        font-size: 0.9rem;
      }
      
      .meta {
        flex-direction: column;
        gap: 10px;
      }
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🏆 ${escapeHtml(zavod.nazev)}</h1>
      ${soutezInfo ? `<p class="subtitle">${escapeHtml(soutezInfo)}</p>` : ''}
      <div class="meta">
        <span class="meta-item">
          📅 ${formatDateRange(zavod.datum_start, zavod.datum_end)}
        </span>
        ${zavod.misto ? `<span class="meta-item">📍 ${escapeHtml(zavod.misto)}</span>` : ''}
      </div>
    </header>

    <section>
      <h2>🥇 Celkové pořadí</h2>
      <table>
        <thead>
          <tr>
            <th>Pořadí</th>
            <th>Tým</th>
            <th>Peg</th>
            <th>Skóre</th>
            <th>Počet ryb</th>
            <th>Žluté karty</th>
          </tr>
        </thead>
        <tbody>
          ${leaderboardRows}
        </tbody>
      </table>
    </section>

    ${top10Fish.length > 0 ? `
    <section>
      <h2>🐟 Top 10 největších ryb</h2>
      <table>
        <thead>
          <tr>
            <th>Pořadí</th>
            <th>Váha</th>
            <th>Druh</th>
            <th>Tým</th>
            <th>Čas</th>
          </tr>
        </thead>
        <tbody>
          ${top10Rows}
        </tbody>
      </table>
    </section>
    ` : ''}

    <footer>
      <p>Vygenerováno aplikací Carp Club ČR</p>
      <p>${new Date().toLocaleString('cs-CZ')}</p>
    </footer>
  </div>
</body>
</html>`
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, m => map[m])
}
