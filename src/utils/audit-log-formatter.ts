import { TimelineEvent, TimelineIconName } from "@/components/timeline"

export interface AuditLogRaw {
  id: string
  tortent: string
  esemeny_tipus: string
  entitas_tipus?: string
  entitas_id?: string
  user_id?: string | null
  ip_cim?: string | null
  user_agent?: string | null
  elozo_ertek?: any
  uj_ertek?: any
  indoklas?: string | null
  reszletek?: string | null
}

export interface FormatAuditOptions {
  userMap?: Record<string, string>
  partnerMap?: Record<string, string>
  dossierMap?: Record<string, string>
  deptMap?: Record<string, string>
  comments?: Array<{
    id?: string
    szoveg: string
    created_at: string
    user_id?: string
  }>
}

export const AUDIT_STATUS_LABELS: Record<string, string> = {
  erkeztetve: "Érkeztetve",
  iktatva: "Iktatva",
  szignalt: "Szignált",
  folyamatban: "Ügyintézés alatt",
  ugyintezes_alatt: "Ügyintézés alatt",
  elintezett: "Elintézett",
  lezart: "Lezárt",
  irattarban: "Irattárban",
  irattarozott: "Irattározott",
  selejtezheto: "Selejtezhető",
  selejtezett: "Selejtezett",
  nem_iktatando: "Nem iktatandó",
  nyitott: "Nyitott",
  aktiv: "Aktív",
  piszkozat: "Piszkozat",
  vazlat: "Vázlat",
  expedialasra_var: "Expediálásra vár",
  kikuldve: "Kiküldve",
  nincs_expedialva: "Nincs expediálva",
  expedialva: "Expediálva",
  sikeres: "Sikeres",
  hibas: "Hibás",
}

export const AUDIT_CLEARANCE_LABELS: Record<string, string> = {
  nyilt: "Nyílt",
  belso: "Belső",
  bizalmas: "Bizalmas",
  szigoruan_bizalmas: "Szigorúan bizalmas",
}

export const AUDIT_DIRECTION_LABELS: Record<string, string> = {
  bejovo: "Bejövő küldemény",
  kimeno: "Kimenő irat",
  belso: "Belső irat",
}

export const AUDIT_CHANNEL_LABELS: Record<string, string> = {
  email: "E-mail",
  eaisybill: "eaisyBill számlaszinkron",
  posta: "Postai küldemény",
  szemelyes: "Személyes átvétel",
  hivatali_kapu: "Hivatali kapu / Cégkapu",
  szkenner: "Szkenner (Batch)",
  rendszer: "Rendszer generálás",
}

export function formatAuditStatusValue(val: unknown): string {
  if (val === null || val === undefined || val === "") return "–"
  const s = String(val)
  return AUDIT_STATUS_LABELS[s] || AUDIT_CLEARANCE_LABELS[s] || AUDIT_DIRECTION_LABELS[s] || AUDIT_CHANNEL_LABELS[s] || s
}

function formatShortDate(val: unknown): string {
  if (!val) return "–"
  const s = String(val)
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit" })
}

/**
 * Központi eaisyDocs Eseménynapló formázó motor.
 * Megszünteti az általános "Ügyirat módosítva" jellegű technikai bejegyzéseket,
 * és tiszta, tömör, magyar nyelvű címet, leírást, szemantikus ikont és színt rendel minden eseményhez.
 */
export function formatAuditLogEvent(log: AuditLogRaw, options?: FormatAuditOptions): TimelineEvent {
  const userMap = options?.userMap || {}
  const partnerMap = options?.partnerMap || {}
  const dossierMap = options?.dossierMap || {}
  const deptMap = options?.deptMap || {}
  const comments = options?.comments || []

  const indoklas = (log.indoklas || "").trim()
  const reszletek = (log.reszletek || "").trim()
  const ujErtek = log.uj_ertek || {}
  const elozoErtek = log.elozo_ertek || {}

  let title = "Ügyirat módosítás"
  let description = indoklas || reszletek || ""
  let icon: TimelineIconName = "edit"
  let color = "text-muted-foreground"
  let details: string | undefined = undefined

  // ──────────────────────────────────────────────────────────────────────────
  // 1. IKTATÁS ÉS ÉRKEZTETÉS
  // ──────────────────────────────────────────────────────────────────────────
  if (log.esemeny_tipus === "iktatva") {
    if (log.entitas_tipus === "irat") {
      title = "Irat beiktatva"
      const targy = ujErtek.targy ? ` (${ujErtek.targy})` : ""
      description = indoklas || `Irat hivatalosan beiktatva az ügyiratra${targy}.`
    } else {
      title = "Ügyirat iktatva"
      const iktatoszam = ujErtek.iktatoszam || ujErtek.ugyszam || (indoklas.match(/([A-Z0-9_\-\/]{8,})/)?.[1]) || ""
      const targy = ujErtek.targy ? ` — ${ujErtek.targy}` : ""
      description = iktatoszam
        ? `Iktatószám kiosztva: ${iktatoszam}${targy}`
        : (indoklas || `Ügyirat sikeresen beiktatva${targy}.`)
    }
    icon = "folder-plus"
    color = "text-primary"
  } else if (log.esemeny_tipus === "erkeztetve") {
    title = "Irat érkeztetve"
    const erkeztetoszam = ujErtek.erkeztetoszam ? `${ujErtek.erkeztetoszam}` : ""
    const targy = ujErtek.targy ? `${ujErtek.targy}` : ""
    if (indoklas) {
      description = indoklas
    } else if (erkeztetoszam && targy) {
      description = `${erkeztetoszam} — ${targy}`
    } else if (erkeztetoszam) {
      description = `Érkeztetőszám kiosztva: ${erkeztetoszam}`
    } else if (targy) {
      description = `Beérkezett küldemény: ${targy}`
    } else {
      description = "Új beérkező küldemény regisztrálva."
    }
    icon = "check-circle"
    color = "text-success"
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. SZIGNÁLÁS ÉS FELELŐSÖK
  // ──────────────────────────────────────────────────────────────────────────
  else if (log.esemeny_tipus === "szignalva") {
    title = "Ügyirat szignálva"
    description = indoklas || reszletek || ujErtek.megjegyzes || "Ügyintéző és felelős kijelölve."
    icon = "users"
    color = "text-warning"
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. HOZZÁFÉRÉSEK ÉS JOGOSULTSÁGOK
  // ──────────────────────────────────────────────────────────────────────────
  else if (log.esemeny_tipus === "hozzaferes_modositas" || indoklas.includes("Explicit hozzáférés")) {
    if (indoklas.includes("visszavonva")) {
      title = "Hozzáférés visszavonva"
      color = "text-warning"
    } else if (indoklas.includes("engedélyezve")) {
      title = "Hozzáférés engedélyezve"
      color = "text-success"
    } else {
      title = "Hozzáférés módosítva"
      color = "text-warning"
    }
    description = indoklas || "Explicit felhasználói hozzáférés módosult."
    icon = "shield"
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. ÉLETCIKLUS ÉS ZÁRÁS
  // ──────────────────────────────────────────────────────────────────────────
  else if (log.esemeny_tipus === "lezarva") {
    title = "Ügyirat lezárva"
    description = indoklas || reszletek || "Az ügyintézés befejeződött, az ügyirat véglegesen lezárva."
    icon = "lock"
    color = "text-success"
  } else if (log.esemeny_tipus === "elintezve" || indoklas.includes("szakmailag elintézve")) {
    title = "Ügyirat elintézve"
    const ikt = ujErtek.iktatoszam ? `${ujErtek.iktatoszam} — ` : ""
    const trg = ujErtek.targy || ""
    description = indoklas || (ikt || trg ? `${ikt}${trg} (elintézett státuszba került)` : "Az ügyintézés befejeződött, az ügyirat elintézett státuszba került.")
    icon = "check-circle"
    color = "text-success"
  } else if (log.esemeny_tipus === "irattarozva") {
    title = "Ügyirat irattározva"
    const ikt = ujErtek.iktatoszam ? `${ujErtek.iktatoszam} — ` : ""
    description =
      indoklas ||
      (ujErtek.megorzesi_ido_vege
        ? `${ikt}Irattári megőrzés vége: ${formatShortDate(ujErtek.megorzesi_ido_vege)}`
        : `${ikt}${ujErtek.targy || "Ügyirat átadva az irattárba."}`)
    icon = "archive"
    color = "text-info"
  } else if (log.esemeny_tipus === "selejtezve") {
    title = "Irat selejtezve"
    const ugyszam = ujErtek.ugyszam || ujErtek.iktatoszam || ""
    const trg = ujErtek.targy || ""
    description =
      indoklas ||
      reszletek ||
      (ugyszam || trg
        ? `${ugyszam ? ugyszam + " — " : ""}${trg} (selejtezve)`
        : "Az irat fizikai / elektronikus megsemmisítése jóváhagyva.")
    icon = "trash-2"
    color = "text-destructive"
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. AUDIT MEGTEKINTÉS ÉS LETÖLTÉS
  // ──────────────────────────────────────────────────────────────────────────
  else if (log.esemeny_tipus === "megtekintve") {
    title = "Dokumentum megtekintve"
    description = indoklas || (ujErtek.fajl ? `Megtekintett fájl: ${ujErtek.fajl}` : "Biztonságos auditált dokumentum-megtekintés.")
    icon = "eye"
    color = "text-muted-foreground"
  } else if (log.esemeny_tipus === "letoltve") {
    title = "Dokumentum letöltve"
    description = indoklas || "Biztonságos dokumentumletöltés rögzítve."
    icon = "download"
    color = "text-muted-foreground"
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. FELADATOK (TASKS)
  // ──────────────────────────────────────────────────────────────────────────
  else if (indoklas.startsWith("Új feladat kiírva:")) {
    title = "Új feladat kiírva"
    description = indoklas.replace(/^Új feladat kiírva:\s*/i, "").trim()
    icon = "list-todo"
    color = "text-amber-500"
  } else if (indoklas.startsWith("Feladat törölve:")) {
    title = "Feladat törölve"
    description = indoklas.replace(/^Feladat törölve:\s*/i, "").trim()
    icon = "trash-2"
    color = "text-muted-foreground"
  } else if (indoklas.includes("Feladat állapota módosítva:") || indoklas.includes("Feladat státusz")) {
    if (indoklas.includes("-> kesz") || indoklas.includes("-> kész") || indoklas.includes("lezárva")) {
      title = "Feladat elvégezve"
      color = "text-success"
      icon = "check-circle"
    } else if (indoklas.includes("-> elutasitva") || indoklas.includes("-> elutasítva")) {
      title = "Feladat visszautasítva"
      color = "text-destructive"
      icon = "alert-circle"
    } else {
      title = "Feladat állapota módosítva"
      color = "text-info"
      icon = "check-circle"
    }
    description = indoklas
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 7. VÁLASZLEVELEK ÉS EXPEDIÁLÁS
  // ──────────────────────────────────────────────────────────────────────────
  else if (
    indoklas.includes("Válaszlevél elküldve e-mailben") ||
    indoklas.includes("Válasz e-mail elküldve") ||
    indoklas.includes("Kimenő irat expedíció e-mailben") ||
    log.esemeny_tipus === "tovabbitva"
  ) {
    title = "Válaszlevél kiküldve (E-mail)"
    icon = "mail"
    color = "text-primary"
    const lines = indoklas.split("\n")
    description = lines[0]
    if (lines.length > 1) {
      details = lines.slice(1).join("\n").trim()
    }
  } else if (indoklas.includes("Postai feladás rögzítve") || indoklas.includes("Kimenő irat postai feladása")) {
    title = "Válaszlevél feladva (Posta)"
    icon = "send"
    color = "text-primary"
    const lines = indoklas.split("\n")
    description = lines[0]
    if (lines.length > 1) {
      details = lines.slice(1).join("\n").trim()
    }
  } else if (indoklas.includes("Kimenő válaszlevél generálva") || indoklas.includes("Kimenő irat generálva")) {
    title = "Kimenő válaszlevél előállítva"
    description = indoklas
    icon = "file-text"
    color = "text-primary"
  } else if (indoklas.includes("Válaszlevél feltöltve") || indoklas.includes("Kimenő irat PDF feltöltve")) {
    title = "Válaszlevél feltöltve"
    description = indoklas
    icon = "file-text"
    color = "text-primary"
  } else if (indoklas.includes("vázlat törölve") || indoklas.includes("piszkozat törölve")) {
    title = "Kimenő piszkozat törölve"
    description = indoklas
      .replace(/^Még ki nem küldött kimenő irat vázlat törölve az ügyiratból:\s*/i, "")
      .replace(/^Kimenő irat piszkozat törölve:\s*/i, "")
      .trim()
    icon = "trash-2"
    color = "text-muted-foreground"
  } else if (indoklas.includes("Központi partner e-mail cím frissítve")) {
    title = "Partner elérhetőség frissítve"
    description = indoklas
    icon = "edit"
    color = "text-info"
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 8. BELSŐ MEGJEGYZÉSEK (COMMENTS)
  // ──────────────────────────────────────────────────────────────────────────
  else if (
    indoklas.toLowerCase().includes("megjegyzés") ||
    (ujErtek.megjegyzes && ujErtek.megjegyzes !== elozoErtek.megjegyzes)
  ) {
    const isEditedNote = indoklas.startsWith("Belső megjegyzés szerkesztve")
    const isDeletedNote = indoklas.startsWith("Belső megjegyzés törölve")
    title = isEditedNote
      ? "Belső megjegyzés szerkesztve"
      : isDeletedNote
        ? "Belső megjegyzés törölve"
        : "Belső megjegyzés rögzítve"
    icon = isDeletedNote ? "trash-2" : "message-square"
    color = isDeletedNote ? "text-muted-foreground" : "text-info"

    if (indoklas.includes(":") && !indoklas.endsWith("Megjegyzés hozzáadva")) {
      description = indoklas.split(":").slice(1).join(":").trim()
    } else if (ujErtek.megjegyzes && ujErtek.megjegyzes !== "Megjegyzés hozzáadva") {
      description = `„${ujErtek.megjegyzes}”`
    } else if (comments.length > 0) {
      const logTime = new Date(log.tortent).getTime()
      const matched = comments.find((c) => {
        const commentTime = new Date(c.created_at).getTime()
        const userMatches = !log.user_id || !c.user_id || log.user_id === c.user_id
        return userMatches && Math.abs(logTime - commentTime) < 60000
      })
      if (matched?.szoveg) {
        description = `„${matched.szoveg}”`
      } else {
        description = "Belső munkatársi megjegyzés került rögzítésre."
      }
    } else {
      description = "Belső munkatársi megjegyzés került rögzítésre."
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 9. FÁJLVERZIÓK ÉS CSATOLMÁNYOK
  // ──────────────────────────────────────────────────────────────────────────
  else if (indoklas.includes("fájlverzió feltöltve") || indoklas.includes("verzió feltöltve")) {
    title = "Új fájlverzió feltöltve"
    description = indoklas
    icon = "upload"
    color = "text-primary"
  } else if (indoklas.includes("fájl csatolva") || indoklas.includes("fájl feltöltve")) {
    title = "Dokumentum csatolva"
    description = indoklas
    icon = "file-text"
    color = "text-primary"
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 10. KÜLSŐ ÉS POLIMORF KAPCSOLATOK
  // ──────────────────────────────────────────────────────────────────────────
  else if (indoklas.includes("kapcsolat hozzáadva") || indoklas.includes("kapcsolat létrehozva")) {
    title = "Külső kapcsolat csatolva"
    description = indoklas
    icon = "link"
    color = "text-info"
  } else if (indoklas.includes("kapcsolat törölve")) {
    title = "Külső kapcsolat eltávolítva"
    description = indoklas
    icon = "trash-2"
    color = "text-muted-foreground"
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 11. KÖLCSÖNZÉS (BORROW)
  // ──────────────────────────────────────────────────────────────────────────
  else if (indoklas.includes("kikölcsönözve") || ujErtek.megjegyzes?.includes("kikölcsönözve")) {
    title = "Irat kikölcsönözve"
    description = ujErtek.megjegyzes || indoklas
    icon = "folder-plus"
    color = "text-warning"
  } else if (indoklas.includes("visszavéve") || ujErtek.megjegyzes?.includes("visszavéve")) {
    title = "Kölcsönzés lezárva"
    description = ujErtek.megjegyzes || indoklas
    icon = "check-circle"
    color = "text-success"
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 12. ÁLLAPOTVÁLTOZÁSOK
  // ──────────────────────────────────────────────────────────────────────────
  else if (
    indoklas.includes("Állapot módosítva") ||
    indoklas.includes("Állapot változás") ||
    indoklas.includes("visszahelyezve ügyintézés alá")
  ) {
    title = "Állapotváltozás"
    description = indoklas
    icon = "edit"
    color = "text-warning"
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 13. EAISYHR INTEGRÁCIÓS BEJEGYZÉSEK
  // ──────────────────────────────────────────────────────────────────────────
  else if (indoklas.includes("eaisyHR") || indoklas.includes("bérpapír") || indoklas.includes("szerződés")) {
    title = "HR irat beiktatva"
    description = indoklas
    icon = "folder-plus"
    color = "text-primary"
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 14. EGYÉB VAGY MEZŐSZINTŰ FRISSÍTÉSEK (elozo_ertek vs uj_ertek elemzése)
  // ──────────────────────────────────────────────────────────────────────────
  else if (indoklas.length > 0) {
    title = "Ügyirat módosítás"
    description = indoklas
    icon = "edit"
    color = "text-info"
  } else {
    const contextRef =
      ujErtek.iktatoszam ||
      ujErtek.erkeztetoszam ||
      ujErtek.ugyszam ||
      (ujErtek.ugyirat_id && dossierMap[ujErtek.ugyirat_id]) ||
      ""
    const targyRef = ujErtek.targy ? `${contextRef ? " — " : ""}${ujErtek.targy}` : ""
    const prefix = contextRef || targyRef ? `${contextRef}${targyRef}: ` : ""

    if (elozoErtek.statusz !== ujErtek.statusz && ujErtek.statusz) {
      title = "Státusz frissítve"
      const fromLabel = formatAuditStatusValue(elozoErtek.statusz)
      const toLabel = formatAuditStatusValue(ujErtek.statusz)
      description = `${prefix}${fromLabel} -> ${toLabel}`
      icon = "edit"
      color = "text-warning"
    } else if (elozoErtek.ugyirat_id !== ujErtek.ugyirat_id && ujErtek.ugyirat_id) {
      title = "Irat ügyirathoz csatolva (beiktatva)"
      const dosszieLabel = dossierMap[ujErtek.ugyirat_id] || ujErtek.iktatoszam || "Ügyirathoz"
      const alszamLabel = ujErtek.alszam ? ` (Alszám: /${ujErtek.alszam})` : ""
      description = `${ujErtek.targy || "Irat"} beiktatva ide: ${dosszieLabel}${alszamLabel}`
      icon = "folder-plus"
      color = "text-primary"
    } else if (elozoErtek.alszam !== ujErtek.alszam && ujErtek.alszam) {
      title = "Irat alszám kiosztva"
      description = `${ujErtek.targy || "Irat"} — Alszám: /${ujErtek.alszam}`
      icon = "folder-plus"
      color = "text-primary"
    } else if (elozoErtek.felelos_user_id !== ujErtek.felelos_user_id) {
      title = "Felelős ügyintéző módosítva"
      const newOwnerName = (ujErtek.felelos_user_id && userMap[ujErtek.felelos_user_id]) || ujErtek.felelos_nev || null
      description = newOwnerName
        ? `${prefix}Új felelős: ${newOwnerName}`
        : `${prefix}Az ügyirat felelős munkatársa módosításra került.`
      icon = "users"
      color = "text-warning"
    } else if (elozoErtek.hatarido !== ujErtek.hatarido) {
      title = "Ügyintézési határidő módosítva"
      description = ujErtek.hatarido
        ? `${prefix}Új határidő: ${formatShortDate(ujErtek.hatarido)}`
        : `${prefix}Ügyintézési határidő törölve.`
      icon = "clock"
      color = "text-warning"
    } else if (elozoErtek.megorzesi_ido_vege !== ujErtek.megorzesi_ido_vege) {
      title = "Irattári megőrzési idő beállítva"
      description = ujErtek.megorzesi_ido_vege
        ? `${prefix}Megőrzés vége: ${formatShortDate(ujErtek.megorzesi_ido_vege)}`
        : `${prefix}Irattári megőrzési határidő frissítve.`
      icon = "archive"
      color = "text-info"
    } else if (elozoErtek.targy !== ujErtek.targy && ujErtek.targy) {
      title = "Tárgy módosítva"
      description = `Új tárgy: ${ujErtek.targy}`
      icon = "edit"
      color = "text-info"
    } else if (
      elozoErtek.kezbesites_statusz !== ujErtek.kezbesites_statusz ||
      elozoErtek.kezbesites_azonosito !== ujErtek.kezbesites_azonosito ||
      elozoErtek.kezbesites_datuma !== ujErtek.kezbesites_datuma
    ) {
      title = "Kézbesítési adatok rögzítve"
      const cimzett = ujErtek.kezbesites_cimzett ? `Címzett: ${ujErtek.kezbesites_cimzett}` : ""
      const azonosito = ujErtek.kezbesites_azonosito ? ` (${ujErtek.kezbesites_azonosito})` : ""
      description = `${prefix}${cimzett || "Kimenő irat kézbesítési állapota frissítve"}${azonosito}`
      icon = "send"
      color = "text-primary"
    } else if (elozoErtek.minosites !== ujErtek.minosites && ujErtek.minosites) {
      title = "Biztonsági minősítés módosítva"
      description = `${prefix}${formatAuditStatusValue(elozoErtek.minosites)} -> ${formatAuditStatusValue(ujErtek.minosites)}`
      icon = "shield"
      color = "text-warning"
    } else if (elozoErtek.szervezeti_egyseg_id !== ujErtek.szervezeti_egyseg_id && ujErtek.szervezeti_egyseg_id) {
      title = "Szervezeti egység módosítva"
      const deptName = deptMap[ujErtek.szervezeti_egyseg_id] || "Új szervezeti egység"
      description = `${prefix}Átsorolva ide: ${deptName}`
      icon = "users"
      color = "text-info"
    } else if (elozoErtek.kuldo_partner_id !== ujErtek.kuldo_partner_id && ujErtek.kuldo_partner_id) {
      title = "Partner hozzárendelve"
      const partnerName = partnerMap[ujErtek.kuldo_partner_id] || "Partner"
      description = `${prefix}Hozzárendelt partner: ${partnerName}`
      icon = "link"
      color = "text-info"
    } else if (elozoErtek.lezarva !== ujErtek.lezarva && ujErtek.lezarva !== undefined) {
      title = ujErtek.lezarva ? "Ügy lezárva" : "Ügy újranyitva"
      description = `${prefix}${ujErtek.lezarva ? "Az ügy lezárt állapotba került." : "Az ügy újra megnyitva."}`
      icon = "lock"
      color = "text-success"
    } else if (elozoErtek.leiras !== ujErtek.leiras && ujErtek.leiras) {
      title = "Irat tartalmi kivonata frissítve"
      description = `${prefix}${String(ujErtek.leiras).slice(0, 120)}`
      icon = "file-text"
      color = "text-info"
    } else if (elozoErtek.erkezes_modja !== ujErtek.erkezes_modja && ujErtek.erkezes_modja) {
      title = "Érkezési csatorna rögzítve"
      description = `${prefix}Csatorna: ${formatAuditStatusValue(ujErtek.erkezes_modja)}`
      icon = "edit"
      color = "text-info"
    } else {
      title = "Irat 메타adatok módosítva".replace("메타adatok", "metaadatok")
      description = prefix ? `${contextRef}${targyRef}` : "Irat vagy ügyirat nyilvántartási mezői frissültek."
      icon = "edit"
      color = "text-muted-foreground"
    }
  }

  // Dátum formázása
  const time = log.tortent
    ? new Date(log.tortent).toLocaleString("hu-HU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : ""

  // Felhasználó név feloldása
  const user =
    (log.user_id ? userMap[log.user_id] : null) ||
    ujErtek.user_email ||
    ujErtek.user_name ||
    (log.user_id ? "Rendszer" : "Rendszer")

  return {
    id: log.id,
    title,
    description,
    time,
    user,
    icon,
    color,
    details,
  }
}
