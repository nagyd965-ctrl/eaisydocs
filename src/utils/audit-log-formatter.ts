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
  comments?: Array<{
    id?: string
    szoveg: string
    created_at: string
    user_id?: string
  }>
}

/**
 * Központi eaisyDocs Eseménynapló formázó motor.
 * Megszünteti az általános "Ügyirat módosítva" jellegű technikai bejegyzéseket,
 * és tiszta, tömör, magyar nyelvű címet, leírást, szemantikus ikont és színt rendel minden eseményhez.
 */
export function formatAuditLogEvent(log: AuditLogRaw, options?: FormatAuditOptions): TimelineEvent {
  const userMap = options?.userMap || {}
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
      description = indoklas || "Irat hivatalosan beiktatva az ügyiratra."
    } else {
      title = "Ügyirat iktatva"
      const iktatoszam = ujErtek.iktatoszam || ujErtek.ugyszam || (indoklas.match(/([A-Z0-9_\-\/]{8,})/)?.[1]) || ""
      description = iktatoszam ? `Iktatószám kiosztva: ${iktatoszam}` : (indoklas || "Ügyirat sikeresen beiktatva.")
    }
    icon = "folder-plus"
    color = "text-primary"
  } else if (log.esemeny_tipus === "erkeztetve") {
    title = "Irat érkeztetve"
    description = indoklas || (ujErtek.erkeztetoszam ? `Érkeztetőszám kiosztva: ${ujErtek.erkeztetoszam}` : "Új beérkező küldemény regisztrálva.")
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
    description = indoklas || "Az ügyintézés befejeződött, az ügyirat elintézett státuszba került."
    icon = "check-circle"
    color = "text-success"
  } else if (log.esemeny_tipus === "irattarozva") {
    title = "Ügyirat irattározva"
    description = indoklas || (ujErtek.megorzesi_ido_vege ? `Irattári megőrzés vége: ${ujErtek.megorzesi_ido_vege}` : "Ügyirat átadva az irattárba.")
    icon = "archive"
    color = "text-info"
  } else if (log.esemeny_tipus === "selejtezve") {
    title = "Irat selejtezve"
    description = indoklas || reszletek || "Az irat fizikai / elektronikus megsemmisítése jóváhagyva."
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
  else if (indoklas.toLowerCase().includes("megjegyzés") || ujErtek.megjegyzes) {
    title = "Belső megjegyzés rögzítve"
    icon = "message-square"
    color = "text-info"

    // Ha az indoklásban már benne van a szöveg
    if (indoklas.includes(":") && !indoklas.endsWith("Megjegyzés hozzáadva")) {
      description = indoklas.split(":").slice(1).join(":").trim()
    } else if (ujErtek.megjegyzes && ujErtek.megjegyzes !== "Megjegyzés hozzáadva") {
      description = `„${ujErtek.megjegyzes}”`
    } else if (comments.length > 0) {
      // Megpróbáljuk megkeresni az adatbázisban tárolt megjegyzések között az időbélyeg és user alapján
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
  // 14. EGYÉB VAGY AUTOMATIKUS RENDSZERTRIGGER FRISSÍTÉSEK
  // ──────────────────────────────────────────────────────────────────────────
  else if (indoklas.length > 0) {
    title = "Ügyirat módosítás"
    description = indoklas
    icon = "edit"
    color = "text-info"
  } else {
    // Üres indoklás (DB trigger vagy háttérfolyamat) esetén megvizsgáljuk az elozo és uj ertekeket
    if (elozoErtek.statusz && ujErtek.statusz && elozoErtek.statusz !== ujErtek.statusz) {
      title = "Státusz frissítve"
      description = `Állapot változás: ${elozoErtek.statusz} ➔ ${ujErtek.statusz}`
      icon = "edit"
      color = "text-warning"
    } else if (elozoErtek.felelos_user_id !== ujErtek.felelos_user_id) {
      title = "Felelős kijelölve / módosítva"
      description = "Az ügyirat felelős munkatársa módosításra került."
      icon = "users"
      color = "text-warning"
    } else if (elozoErtek.hatarido !== ujErtek.hatarido) {
      title = "Határidő módosítva"
      description = ujErtek.hatarido ? `Új határidő: ${ujErtek.hatarido}` : "Ügyintézési határidő törölve."
      icon = "clock"
      color = "text-warning"
    } else if (elozoErtek.targy !== ujErtek.targy && ujErtek.targy) {
      title = "Ügyirat tárgya módosítva"
      description = `Új tárgy: ${ujErtek.targy}`
      icon = "edit"
      color = "text-info"
    } else {
      title = "Nyilvántartási adatok frissítve"
      description = "Rendszeradatok vagy kapcsolódó metaadatok szinkronizálása."
      icon = "refresh-cw"
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
