/**
 * Excel/CSV Parser pro bulk import týmů
 *
 * Podporované formáty:
 *   - .xlsx (Excel)
 *   - .xls (starší Excel)
 *   - .csv (CSV s oddělovačem čárka nebo středník)
 *
 * Očekávaný formát dat (hlavička):
 *   Tým | Jméno | Email | Telefon | Role
 *
 * Příklad:
 *   Rybáři Třeboň | Jan Novák | jan@email.cz | 777111222 | kapitan
 *   Rybáři Třeboň | Petr Svoboda | petr@email.cz | 777333444 | zavodnik
 */

import * as XLSX from 'xlsx'
import Papa from 'papaparse'

export interface ParsedMember {
  tymNazev: string
  jmeno: string
  email: string
  telefon?: string
  role: 'kapitan' | 'zavodnik'
}

export interface ParsedTeam {
  nazev: string
  members: {
    jmeno: string
    email: string
    telefon?: string
    role: 'kapitan' | 'zavodnik'
  }[]
}

export interface ParseResult {
  success: boolean
  teams: ParsedTeam[]
  errors: string[]
  warnings: string[]
  totalMembers: number
}

// Mapování názvů sloupců (české i anglické varianty)
const COLUMN_MAPPINGS = {
  tym: ['tým', 'tym', 'team', 'název týmu', 'nazev tymu'],
  jmeno: ['jméno', 'jmeno', 'name', 'jméno a příjmení', 'jmeno a prijmeni'],
  email: ['email', 'e-mail', 'mail'],
  telefon: ['telefon', 'tel', 'phone', 'mobil'],
  role: ['role', 'pozice', 'position'],
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function findColumnIndex(headers: string[], mappings: string[]): number {
  const normalizedHeaders = headers.map(normalizeHeader)
  for (const mapping of mappings) {
    const idx = normalizedHeaders.indexOf(normalizeHeader(mapping))
    if (idx !== -1) return idx
  }
  return -1
}

function parseRole(roleStr: string | undefined): 'kapitan' | 'zavodnik' {
  if (!roleStr) return 'zavodnik'
  const normalized = normalizeHeader(roleStr)
  if (normalized.includes('kapit') || normalized === 'captain' || normalized === 'leader') {
    return 'kapitan'
  }
  return 'zavodnik'
}

function validateEmail(email: string): boolean {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

/**
 * Parse Excel file (xlsx/xls)
 */
export function parseExcelFile(buffer: ArrayBuffer): ParseResult {
  const errors: string[] = []
  const warnings: string[] = []
  const teamsMap = new Map<string, ParsedTeam>()

  try {
    const workbook = XLSX.read(buffer, { type: 'array' })

    // Použij první list
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return { success: false, teams: [], errors: ['Soubor neobsahuje žádné listy'], warnings: [], totalMembers: 0 }
    }

    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 })

    if (jsonData.length < 2) {
      return { success: false, teams: [], errors: ['Soubor musí obsahovat alespoň hlavičku a jeden řádek dat'], warnings: [], totalMembers: 0 }
    }

    // První řádek = hlavička
    const headers = jsonData[0].map(h => String(h || ''))

    // Najdi indexy sloupců
    const tymIdx = findColumnIndex(headers, COLUMN_MAPPINGS.tym)
    const jmenoIdx = findColumnIndex(headers, COLUMN_MAPPINGS.jmeno)
    const emailIdx = findColumnIndex(headers, COLUMN_MAPPINGS.email)
    const telefonIdx = findColumnIndex(headers, COLUMN_MAPPINGS.telefon)
    const roleIdx = findColumnIndex(headers, COLUMN_MAPPINGS.role)

    // Validace povinných sloupců
    if (tymIdx === -1) {
      errors.push('Chybí sloupec "Tým" (nebo "Team")')
    }
    if (jmenoIdx === -1) {
      errors.push('Chybí sloupec "Jméno" (nebo "Name")')
    }
    if (emailIdx === -1) {
      warnings.push('Chybí sloupec "Email" - budou vytvořeny placeholder účty bez emailu')
    }

    if (errors.length > 0) {
      return { success: false, teams: [], errors, warnings, totalMembers: 0 }
    }

    // Parse dat
    let totalMembers = 0
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i]
      if (!row || row.length === 0) continue

      const tymNazev = String(row[tymIdx] || '').trim()
      const jmeno = String(row[jmenoIdx] || '').trim()
      const email = emailIdx !== -1 ? String(row[emailIdx] || '').trim() : ''
      const telefon = telefonIdx !== -1 ? String(row[telefonIdx] || '').trim() : undefined
      const role = roleIdx !== -1 ? parseRole(String(row[roleIdx] || '')) : 'zavodnik'

      // Validace
      if (!tymNazev) {
        warnings.push(`Řádek ${i + 1}: Chybí název týmu, přeskakuji`)
        continue
      }
      if (!jmeno) {
        warnings.push(`Řádek ${i + 1}: Chybí jméno člena, přeskakuji`)
        continue
      }
      if (email && !validateEmail(email)) {
        warnings.push(`Řádek ${i + 1}: Neplatný email "${email}" pro ${jmeno}`)
      }

      // Přidej do mapy týmů
      if (!teamsMap.has(tymNazev)) {
        teamsMap.set(tymNazev, {
          nazev: tymNazev,
          members: [],
        })
      }

      const team = teamsMap.get(tymNazev)!
      team.members.push({
        jmeno,
        email: email || '',
        telefon: telefon || undefined,
        role,
      })
      totalMembers++
    }

    // Ověř, že každý tým má kapitána
    teamsMap.forEach((team, nazev) => {
      const hasKapitan = team.members.some(m => m.role === 'kapitan')
      if (!hasKapitan && team.members.length > 0) {
        // Nastav prvního člena jako kapitána
        team.members[0].role = 'kapitan'
        warnings.push(`Tým "${nazev}": Žádný kapitán nenalezen, ${team.members[0].jmeno} nastaven jako kapitán`)
      }
    })

    const teams = Array.from(teamsMap.values())

    return {
      success: teams.length > 0,
      teams,
      errors,
      warnings,
      totalMembers,
    }
  } catch (error) {
    return {
      success: false,
      teams: [],
      errors: [`Chyba při čtení souboru: ${error instanceof Error ? error.message : 'Neznámá chyba'}`],
      warnings,
      totalMembers: 0,
    }
  }
}

/**
 * Parse CSV file
 */
export function parseCSVFile(content: string): ParseResult {
  const errors: string[] = []
  const warnings: string[] = []
  const teamsMap = new Map<string, ParsedTeam>()

  try {
    const parsed = Papa.parse<string[]>(content, {
      skipEmptyLines: true,
    })

    if (parsed.errors.length > 0) {
      warnings.push(...parsed.errors.map(e => `CSV parse warning: ${e.message}`))
    }

    const data = parsed.data
    if (data.length < 2) {
      return { success: false, teams: [], errors: ['Soubor musí obsahovat alespoň hlavičku a jeden řádek dat'], warnings, totalMembers: 0 }
    }

    // První řádek = hlavička
    const headers = data[0].map(h => String(h || ''))

    // Najdi indexy sloupců
    const tymIdx = findColumnIndex(headers, COLUMN_MAPPINGS.tym)
    const jmenoIdx = findColumnIndex(headers, COLUMN_MAPPINGS.jmeno)
    const emailIdx = findColumnIndex(headers, COLUMN_MAPPINGS.email)
    const telefonIdx = findColumnIndex(headers, COLUMN_MAPPINGS.telefon)
    const roleIdx = findColumnIndex(headers, COLUMN_MAPPINGS.role)

    // Validace povinných sloupců
    if (tymIdx === -1) {
      errors.push('Chybí sloupec "Tým" (nebo "Team")')
    }
    if (jmenoIdx === -1) {
      errors.push('Chybí sloupec "Jméno" (nebo "Name")')
    }
    if (emailIdx === -1) {
      warnings.push('Chybí sloupec "Email" - budou vytvořeny placeholder účty bez emailu')
    }

    if (errors.length > 0) {
      return { success: false, teams: [], errors, warnings, totalMembers: 0 }
    }

    // Parse dat
    let totalMembers = 0
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      if (!row || row.length === 0) continue

      const tymNazev = String(row[tymIdx] || '').trim()
      const jmeno = String(row[jmenoIdx] || '').trim()
      const email = emailIdx !== -1 ? String(row[emailIdx] || '').trim() : ''
      const telefon = telefonIdx !== -1 ? String(row[telefonIdx] || '').trim() : undefined
      const role = roleIdx !== -1 ? parseRole(String(row[roleIdx] || '')) : 'zavodnik'

      // Validace
      if (!tymNazev) {
        warnings.push(`Řádek ${i + 1}: Chybí název týmu, přeskakuji`)
        continue
      }
      if (!jmeno) {
        warnings.push(`Řádek ${i + 1}: Chybí jméno člena, přeskakuji`)
        continue
      }
      if (email && !validateEmail(email)) {
        warnings.push(`Řádek ${i + 1}: Neplatný email "${email}" pro ${jmeno}`)
      }

      // Přidej do mapy týmů
      if (!teamsMap.has(tymNazev)) {
        teamsMap.set(tymNazev, {
          nazev: tymNazev,
          members: [],
        })
      }

      const team = teamsMap.get(tymNazev)!
      team.members.push({
        jmeno,
        email: email || '',
        telefon: telefon || undefined,
        role,
      })
      totalMembers++
    }

    // Ověř, že každý tým má kapitána
    teamsMap.forEach((team, nazev) => {
      const hasKapitan = team.members.some(m => m.role === 'kapitan')
      if (!hasKapitan && team.members.length > 0) {
        team.members[0].role = 'kapitan'
        warnings.push(`Tým "${nazev}": Žádný kapitán nenalezen, ${team.members[0].jmeno} nastaven jako kapitán`)
      }
    })

    const teams = Array.from(teamsMap.values())

    return {
      success: teams.length > 0,
      teams,
      errors,
      warnings,
      totalMembers,
    }
  } catch (error) {
    return {
      success: false,
      teams: [],
      errors: [`Chyba při čtení CSV: ${error instanceof Error ? error.message : 'Neznámá chyba'}`],
      warnings,
      totalMembers: 0,
    }
  }
}

/**
 * Parse file based on extension
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'csv') {
    const content = await file.text()
    return parseCSVFile(content)
  }

  if (extension === 'xlsx' || extension === 'xls') {
    const buffer = await file.arrayBuffer()
    return parseExcelFile(buffer)
  }

  return {
    success: false,
    teams: [],
    errors: [`Nepodporovaný formát souboru: .${extension}. Podporované formáty: .xlsx, .xls, .csv`],
    warnings: [],
    totalMembers: 0,
  }
}

/**
 * Generate template CSV content
 */
export function generateTemplateCSV(): string {
  return `Tým,Jméno,Email,Telefon,Role
Rybáři Třeboň,Jan Novák,jan@email.cz,777111222,kapitan
Rybáři Třeboň,Petr Svoboda,petr@email.cz,777333444,zavodnik
Rybáři Třeboň,Karel Nový,karel@email.cz,,zavodnik
Kapr Team,Marie Nová,marie@email.cz,777555666,kapitan
Kapr Team,Tomáš Zelený,tomas@email.cz,777777888,zavodnik`
}

/**
 * Download template as CSV
 */
export function downloadTemplate() {
  const content = generateTemplateCSV()
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' }) // BOM for Excel
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'sablona_tymy.csv'
  link.click()
  URL.revokeObjectURL(url)
}
