/**
 * Data týmů pro Liga A a Liga B
 * Formát: { nazev: string, kapitan: string, zavodnici: string[] }
 * Pro Ligu B: první člen = kapitán
 */

export interface TeamData {
  nazev: string
  kapitan: string
  zavodnici: string[]
}

export const LIGA_A_TEAMS: TeamData[] = [
  { nazev: "HumpálRothVachta", kapitan: "Marian Grdina", zavodnici: ["Jiří Kolář"] },
  { nazev: "TomanBoucníkKonštantToman", kapitan: "Václav Humpál", zavodnici: ["Václav Roth", "Karel Vachta"] },
  { nazev: "PoláčekZelený", kapitan: "Petr Poláček", zavodnici: ["Filip Zelený"] },
  { nazev: "PolákPalkovičTóth", kapitan: "Peter Polák", zavodnici: ["Richard Palkovič", "Richard Tóth"] },
  { nazev: "VostrejšBartoňAdámek", kapitan: "Jiří Vostrejš", zavodnici: ["Vlastimil Bartoň", "Pavel Adámek"] },
  { nazev: "KazdaJechHanušKuca", kapitan: "Martin Kazda", zavodnici: ["Ondřej Jech", "Pavel Hanuš", "Roman Kuca"] },
  { nazev: "KoudelkaStránskýKukla", kapitan: "Antonín Koudelka", zavodnici: ["Jan Stránský", "Jiří Kukla"] },
  { nazev: "PodoubskýBuneš", kapitan: "Vít Podoubský", zavodnici: ["Miroslav Buneš"] },
  { nazev: "VorčákVinklárekNosek", kapitan: "Ondřej Vorčák", zavodnici: ["Martin Vinklárek", "Jakub Nosek"] },
  { nazev: "HolušaTvrdoňKovalčík", kapitan: "Filip Holuša", zavodnici: ["Hynek Tvrdoň", "Jan Kovalčík"] },
  { nazev: "KučeraSembdnerSuchánek", kapitan: "Jiří Kučera", zavodnici: ["Michal Sembdner", "Tomáš Suchánek"] },
  { nazev: "DrmolaDrmolaPečiva", kapitan: "Petr Drmola", zavodnici: ["Pavel Drmola", "Pavel Pečiva"] },
  { nazev: "ŠtveráčekVovesVečeřa", kapitan: "Jaroslav Štveráček", zavodnici: ["Martin Voves", "Tomáš Večeřa"] },
  { nazev: "MišovicDaruŠvejda", kapitan: "Jakub Mišovic", zavodnici: ["Zdeněk Daru", "Jaroslav Švejda"] },
  { nazev: "HussHorníček", kapitan: "Jaroslav Huss", zavodnici: ["Jakub Horníček"] },
  { nazev: "DoleželCila", kapitan: "Tomáš Doležel", zavodnici: ["Jindřich Cila"] },
  { nazev: "Felice FabbriZítek", kapitan: "Federico Felice Fabbri", zavodnici: ["Martin Zítek"] },
  { nazev: "ŠafářOškeraBroulík", kapitan: "Pavel Šafář", zavodnici: ["Daniel Oškera", "Michal Broulík"] },
  { nazev: "PudilŠamšulaHalvaSkořepa", kapitan: "Jan Skořepa", zavodnici: ["Petr Pudil", "Dominik Šamšula", "Martin Halva"] },
]

// Pro Ligu B - první člen je kapitán
export const LIGA_B_TEAMS: TeamData[] = [
  { nazev: "Kovacic-JurmanStopa", kapitan: "Alan Kovacic-Jurman", zavodnici: ["Miroslav Stopa"] },
  { nazev: "HubBartušek", kapitan: "Roman Hub", zavodnici: ["Pavel Bartušek"] },
  { nazev: "SoukupZuklín", kapitan: "Michal Soukup", zavodnici: ["František Zuklín"] },
  { nazev: "Hořejší", kapitan: "Dominik Hořejší", zavodnici: [] },
  { nazev: "AdámekZabloudil", kapitan: "Vladimír Adámek", zavodnici: ["Stanislav Zabloudil"] },
  { nazev: "PokornýSzebestaFrýbertPoprštein", kapitan: "Michal Pokorný", zavodnici: ["Václav Szebesta", "Luděk Frýbert", "Tomáš Poprštein"] },
  { nazev: "MaříkMaříkPodroužekDvořáková", kapitan: "Petr Mařík", zavodnici: ["Václav Podroužek", "Marta Dvořáková"] },
  { nazev: "KopejtkaKlíma", kapitan: "Tomáš Kopejtka", zavodnici: ["Pavel Klíma"] },
  { nazev: "SuchánekJavůrek", kapitan: "Vladimír Suchánek", zavodnici: ["Martin Javůrek"] },
  { nazev: "MikšovskýKubeček", kapitan: "Marek Mikšovský", zavodnici: ["Lukáš Kubeček"] },
  { nazev: "KlímaBaranyaiVystrčil", kapitan: "Radek Klíma", zavodnici: ["Tibor Baranyai", "Libor Vystrčil"] },
  { nazev: "PostupaPostupaChadima", kapitan: "Jan Postupa", zavodnici: ["Radek Postupa", "Petr Chadima"] },
  { nazev: "MikšovicKovaňič", kapitan: "Radek Mikšovic", zavodnici: ["Martin Kovaňič"] },
  { nazev: "KupčíkČechPokorný", kapitan: "Albert Kupčík", zavodnici: ["Jakub Čech", "Pavel Pokorný"] },
  { nazev: "DaňoDaňoDaňo", kapitan: "Petr Daňo", zavodnici: ["Filip Daňo", "Miloš Daňo"] },
  { nazev: "KrákoraLaštovkaNýč", kapitan: "Miroslav Krákora", zavodnici: ["Ondřej Laštovka", "Zdeněk Nýč"] },
  { nazev: "KubovýKubovýVegrichtUdržal", kapitan: "Vladimír Kubový", zavodnici: ["Dominik Kubový", "Martin Vegricht", "Martin Udržal"] },
  { nazev: "SlekovičSlekovičMálek", kapitan: "David Slekovič", zavodnici: ["Marek Slekovič", "Michal Málek"] },
  { nazev: "ŠtorkValaKadeřábekVala", kapitan: "Dominik Štork", zavodnici: ["Filip Vala", "Michal Kadeřábek", "Michal Vala"] },
  { nazev: "DuchovičLovász", kapitan: "Miroslav Duchovič", zavodnici: ["Jan Lovász"] },
]

// Utility function to generate slug from name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Generate random team color
export function getRandomTeamColor(index: number): string {
  const colors = [
    '#2563eb', // blue
    '#dc2626', // red
    '#16a34a', // green
    '#ca8a04', // yellow
    '#9333ea', // purple
    '#ea580c', // orange
    '#0891b2', // cyan
    '#be185d', // pink
    '#65a30d', // lime
    '#7c3aed', // violet
    '#0d9488', // teal
    '#c026d3', // fuchsia
  ]
  return colors[index % colors.length]
}
