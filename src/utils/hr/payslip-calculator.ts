/**
 * Bérjegyzék és Munkaügyi Bérkalkulátor (Mt. 155. §)
 * 
 * Magyar jogszabályok szerinti törvényes levonási motor:
 * - SZJA előleg: 15% (2026. évi 25 év alattiak kedvezményével, családi és egyéb kedvezményekkel)
 * - TB járulék: 18,5% (családi járulékkedvezmény érvényesítésével)
 * - Munkáltatói szociális hozzájárulási adó (SZOCHO): 13%
 * - Távolléti díj és betegszabadság (Mt. 146. § - 70%)
 */

export interface PayslipCalculationInput {
  bruttoAlapber: number
  tervezettMunkanap: number
  ledolgozottMunkanap: number
  ledolgozottMunkaora?: number
  szabadsagNap?: number
  betegszabadsagNap?: number
  tuloraOra?: number
  bonuszJutalom?: number
  cafeteriaBrutto?: number
  kedvezmeny25EvAlatti?: boolean
  csaladiKedvezmenyOsszeg?: number
  egyebAdokedvezmeny?: number
  letiltasLevonas?: number
}

export interface PayslipCalculationResult {
  bruttoAlapber: number
  tervezettMunkanap: number
  ledolgozottMunkanap: number
  ledolgozottMunkaora: number
  alapberReszlet: number
  szabadsagNap: number
  szabadsagDij: number
  betegszabadsagNap: number
  betegszabadsagDij: number
  tuloraOra: number
  tuloraOsszeg: number
  bonuszJutalom: number
  cafeteriaBrutto: number
  bruttoOsszesen: number

  // Kedvezmények
  kedvezmeny25EvAlatti: boolean
  csaladiKedvezmenyOsszeg: number
  egyebAdokedvezmeny: number
  kedvezmenyekOsszesen: number

  // Levonások
  szjaAlap: number
  szjaLevonas: number
  tbJarulekAlap: number
  tbJarulekLevonas: number
  letiltasEgyebLevonas: number
  levonasokOsszesen: number

  // Nettó és munkáltatói teher
  nettoKifizetendo: number
  szochoMunkaltatoi: number
}

// 2026-os maximális 25 év alatti SZJA-mentes havi keret (HUF)
export const MAX_UNDER_25_MONTHLY_TAX_BASE = 576601

export function calculatePayslipDetails(input: PayslipCalculationInput): PayslipCalculationResult {
  const bruttoAlapber = Math.max(0, input.bruttoAlapber || 0)
  const tervezettMunkanap = Math.max(1, input.tervezettMunkanap || 20)
  const ledolgozottMunkanap = Math.max(0, input.ledolgozottMunkanap ?? tervezettMunkanap)
  const ledolgozottMunkaora = input.ledolgozottMunkaora ?? ledolgozottMunkanap * 8
  const szabadsagNap = Math.max(0, input.szabadsagNap || 0)
  const betegszabadsagNap = Math.max(0, input.betegszabadsagNap || 0)
  const tuloraOra = Math.max(0, input.tuloraOra || 0)
  const bonuszJutalom = Math.max(0, input.bonuszJutalom || 0)
  const cafeteriaBrutto = Math.max(0, input.cafeteriaBrutto || 0)
  const kedvezmeny25EvAlatti = Boolean(input.kedvezmeny25EvAlatti)
  const csaladiKedvezmenyOsszeg = Math.max(0, input.csaladiKedvezmenyOsszeg || 0)
  const egyebAdokedvezmeny = Math.max(0, input.egyebAdokedvezmeny || 0)
  const letiltasLevonas = Math.max(0, input.letiltasLevonas || 0)

  // 1. Napi és órabér alapok
  const napiBer = bruttoAlapber / tervezettMunkanap
  const oraber = napiBer / 8

  // Ha a teljes havi munkaidő le van fedve sima munkával
  let alapberReszlet = 0
  let szabadsagDij = 0

  if (ledolgozottMunkanap === tervezettMunkanap && szabadsagNap === 0 && betegszabadsagNap === 0) {
    alapberReszlet = bruttoAlapber
  } else {
    alapberReszlet = Math.round(napiBer * ledolgozottMunkanap)
    szabadsagDij = Math.round(napiBer * szabadsagNap)
    if (ledolgozottMunkanap + szabadsagNap === tervezettMunkanap && betegszabadsagNap === 0) {
      // Kerekítési rés kiküszöbölése
      szabadsagDij = bruttoAlapber - alapberReszlet
    }
  }

  // Betegszabadság díj: Mt. 146. § (4) - 70%-os távolléti díj
  const betegszabadsagDij = Math.round(napiBer * betegszabadsagNap * 0.70)

  // Túlóra pótlék (50%-os bérpótlék + alap óradíj = 150%)
  const tuloraOsszeg = Math.round(tuloraOra * oraber * 1.5)

  // Összes bruttó jövedelem
  const bruttoOsszesen = alapberReszlet + szabadsagDij + betegszabadsagDij + tuloraOsszeg + bonuszJutalom + cafeteriaBrutto

  // 2. SZJA és TB adóalap
  // A cafeteria bér adózása itt az egyszerűsített készpénzes/SZÉP kártya bruttó elszámolást követi
  const szjaAlap = bruttoOsszesen
  const tbJarulekAlap = bruttoOsszesen

  // 3. SZJA számítás (15%)
  let nominalisSzja = Math.round(szjaAlap * 0.15)
  let under25TaxSavings = 0

  if (kedvezmeny25EvAlatti) {
    const taxFreeBase = Math.min(szjaAlap, MAX_UNDER_25_MONTHLY_TAX_BASE)
    under25TaxSavings = Math.round(taxFreeBase * 0.15)
    nominalisSzja = Math.max(0, nominalisSzja - under25TaxSavings)
  }

  // Személyi és egyéb kedvezmények levonása
  let fizetendoSzja = nominalisSzja
  if (egyebAdokedvezmeny > 0) {
    fizetendoSzja = Math.max(0, fizetendoSzja - egyebAdokedvezmeny)
  }

  // Családi kedvezmény érvényesítése
  let felhasznaltCsaladiSzja = 0
  let maradekCsaladiKedvezmeny = 0

  if (csaladiKedvezmenyOsszeg > 0) {
    felhasznaltCsaladiSzja = Math.min(fizetendoSzja, csaladiKedvezmenyOsszeg)
    fizetendoSzja -= felhasznaltCsaladiSzja
    maradekCsaladiKedvezmeny = csaladiKedvezmenyOsszeg - felhasznaltCsaladiSzja
  }

  const szjaLevonas = Math.round(fizetendoSzja)

  // 4. TB járulék számítás (18,5%)
  const nominalisTb = Math.round(tbJarulekAlap * 0.185)
  // Családi járulékkedvezmény: ha maradt még családi kedvezmény, az levonható a TB járulékból
  const felhasznaltCsaladiTb = Math.min(nominalisTb, maradekCsaladiKedvezmeny)
  const tbJarulekLevonas = Math.round(Math.max(0, nominalisTb - felhasznaltCsaladiTb))

  // Kedvezmények összesen
  const kedvezmenyekOsszesen = under25TaxSavings + egyebAdokedvezmeny + felhasznaltCsaladiSzja + felhasznaltCsaladiTb

  // 5. Egyéb levonások és Nettó
  const letiltasEgyebLevonas = Math.round(letiltasLevonas)
  const levonasokOsszesen = szjaLevonas + tbJarulekLevonas + letiltasEgyebLevonas
  const nettoKifizetendo = Math.max(0, bruttoOsszesen - levonasokOsszesen)

  // 6. Munkáltatói teher: SZOCHO (13%)
  const szochoMunkaltatoi = Math.round(bruttoOsszesen * 0.13)

  return {
    bruttoAlapber,
    tervezettMunkanap,
    ledolgozottMunkanap,
    ledolgozottMunkaora,
    alapberReszlet,
    szabadsagNap,
    szabadsagDij,
    betegszabadsagNap,
    betegszabadsagDij,
    tuloraOra,
    tuloraOsszeg,
    bonuszJutalom,
    cafeteriaBrutto,
    bruttoOsszesen,

    kedvezmeny25EvAlatti,
    csaladiKedvezmenyOsszeg,
    egyebAdokedvezmeny,
    kedvezmenyekOsszesen,

    szjaAlap,
    szjaLevonas,
    tbJarulekAlap,
    tbJarulekLevonas,
    letiltasEgyebLevonas,
    levonasokOsszesen,

    nettoKifizetendo,
    szochoMunkaltatoi
  }
}

/**
 * Pénznem formázó segédfüggvény (pl. "600 000 Ft")
 */
export function formatHufCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "0 Ft"
  return `${Math.round(amount).toLocaleString("hu-HU").replace(/\u00A0/g, " ")} Ft`
}

/**
 * Digitális átvételi nyugtázás feldolgozó
 */
export interface AcknowledgeReceiptInput {
  currentStatus: string
  dolgozoId: string
  ipAddress?: string
  userAgent?: string
  acknowledgedAt?: Date
}

export interface AcknowledgeReceiptOutput {
  statusz: "atveve"
  atvetelDatuma: string
  isAcknowledged: boolean
  auditLogText: string
}

export function acknowledgePayslipReceipt(input: AcknowledgeReceiptInput): AcknowledgeReceiptOutput {
  const atDate = input.acknowledgedAt || new Date()
  const isoStr = atDate.toISOString()

  return {
    statusz: "atveve",
    atvetelDatuma: isoStr,
    isAcknowledged: true,
    auditLogText: `Elektronikusan átvéve és nyugtázva a munkavállaló által (Mt. 155. §). Időbélyeg: ${isoStr}, IP: ${input.ipAddress || "ismeretlen"}`
  }
}

export const MONTH_NAMES_HU = [
  "Január", "Február", "Március", "Április", "Május", "Június",
  "Július", "Augusztus", "Szeptember", "Október", "November", "December"
]

export function getMonthNameHu(monthNumber: number): string {
  return MONTH_NAMES_HU[monthNumber - 1] || `${monthNumber}. hónap`
}
