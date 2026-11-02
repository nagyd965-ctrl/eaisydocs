"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { sendNotificationEmail, buildHtmlEmail } from "@/utils/mailer"
import { getBaseUrl } from "@/utils/url"
import { getClientInfo } from "@/utils/client-info"
import { generateDisposalProtocolPdf, DisposalProtocolItem } from "@/utils/disposal-protocol-pdf"
import { isFourEyesDisposalRequired } from "@/utils/system-settings"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { requireDocsAuthServer } from "@/utils/docs-auth-guard"

// 1. Felterjesztés Selejtezésre (Iratkezelő csinálja)
export async function proposeDisposal(ugyiratIds: string[], note?: string) {
  const auth = await requireDocsAuthServer(["admin", "rendszergazda", "iktato", "vezeto", "ugyintezo"])
  if (!auth.authorized || !auth.user) {
    return { error: auth.error || "Nincs jogosultságod selejtezési javaslat felterjesztéséhez." }
  }
  const user = auth.user

  if (!ugyiratIds || ugyiratIds.length === 0) {
    return { error: "Nincs kiválasztva felterjesztendő ügyirat." }
  }

  const supabase = await createClient()
  const activeCompanyId = auth.activeCompanyId || (await getActiveCompanyIdServer())

  // Ellenőrizzük, hogy csak az aktív céghez tartozó, irattárban lévő és lejárt megőrzési idejű ügyiratot lehessen felterjeszteni
  const { data: dossiersToPropose } = await supabase
    .from("ugyirat")
    .select("id, company_id, iktatoszam, statusz, megorzesi_ido_vege")
    .in("id", ugyiratIds)

  if (!dossiersToPropose || dossiersToPropose.length === 0) {
    return { error: "Nem találhatók a kiválasztott ügyiratok." }
  }

  if (activeCompanyId) {
    const foreignDossiers = dossiersToPropose.filter((d) => d.company_id && d.company_id !== activeCompanyId)
    if (foreignDossiers.length > 0) {
      return { error: "A kiválasztott ügyiratok nem mindegyike tartozik az aktív vállalathoz." }
    }
  }

  const notInArchive = dossiersToPropose.filter((d) => !["irattarban", "lezart"].includes(d.statusz))
  if (notInArchive.length > 0) {
    return {
      error: `Csak irattárban lévő ügyiratot lehet selejtezésre felterjeszteni! Nem megfelelő: ${notInArchive.map((d) => d.iktatoszam).join(", ")}`,
    }
  }

  const todayIso = new Date().toISOString().split("T")[0]
  const notExpired = dossiersToPropose.filter(
    (d) => d.megorzesi_ido_vege && d.megorzesi_ido_vege > todayIso
  )
  if (notExpired.length > 0) {
    return {
      error: `Csak lejárt megőrzési idejű ügyirat terjeszthető fel selejtezésre! Még nem járt le: ${notExpired.map((d) => `${d.iktatoszam} (${d.megorzesi_ido_vege})`).join(", ")}`,
    }
  }

  // Létrehozunk egy új Selejtezési Csomagot az aktív céghez
  const csomagPayload: Record<string, any> = {
    javaslattevo_user_id: user.id,
    statusz: "jovahagyasra_var",
  }
  if (activeCompanyId) {
    csomagPayload.company_id = activeCompanyId
  }

  const { data: csomag, error: csomagError } = await supabase
    .from("selejtezes_csomag")
    .insert(csomagPayload)
    .select("id")
    .single()

  if (csomagError || !csomag) {
    console.error("Hiba a selejtezési csomag létrehozásakor:", csomagError)
  }

  const { ip, userAgent } = await getClientInfo()

  for (const id of ugyiratIds) {
    // Ha van csomag, kapcsoljuk össze a tétellel
    if (csomag) {
      await supabase.from("selejtezes_tetel").insert({
        csomag_id: csomag.id,
        ugyirat_id: id,
      })
    }

    // Státusz váltás selejtezhetőre (Jóváhagyásra vár)
    const { error: updateError } = await supabase
      .from("ugyirat")
      .update({ statusz: "selejtezheto" })
      .eq("id", id)

    if (!updateError) {
      const naploPayload: Record<string, any> = {
        entitas_tipus: "ugyirat",
        entitas_id: id,
        esemeny_tipus: "modositva",
        user_id: user.id,
        indoklas: note ? `Selejtezésre felterjesztve: ${note}` : "Selejtezésre felterjesztve a hatályos megőrzési idő lejárta alapján.",
        ip_cim: ip,
        user_agent: userAgent,
      }
      if (activeCompanyId) {
        naploPayload.company_id = activeCompanyId
      }
      await supabase.from("esemeny_naplo").insert(naploPayload)
    }
  }

  // Értesítés a vezetőknek a selejtezési felterjesztésről
  try {
    const { data: vezetok } = await supabase
      .from("felhasznalo_profil")
      .select("id")
      .or("docs_szerepkor.in.(admin,vezeto,rendszergazda),szerepkor.in.(admin,vezeto,rendszergazda)")

    if (vezetok && vezetok.length > 0) {
      const { dispatchDocsNotification } = await import("@/utils/docs-notification-dispatcher")
      await dispatchDocsNotification({
        esemenyTipus: "allapotvaltozas",
        kinek: "vezeto",
        companyId: activeCompanyId,
        recipientUserIds: vezetok.map((v: any) => v.id),
        inAppTitle: "Új iratselejtezési javaslat jóváhagyásra vár",
        inAppBody: `${ugyiratIds.length} db ügyiratot terjesztettek fel végleges selejtezésre.`,
        linkPath: "/archive",
        emailSubject: "Új iratselejtezési javaslat jóváhagyásra vár",
        emailHeading: "Iratselejtezési jóváhagyás szükséges",
        emailIntroHtml: `Egy munkatárs felterjesztett <b>${ugyiratIds.length} db</b> ügyiratot végleges selejtezésre. Kérlek, lépj be az Irattár felületre, vizsgáld felül az iratokat, és a "Négy Szem Elve" alapján hagyd jóvá a megsemmisítésüket és a jegyzőkönyv kiállítását.`,
        emailCtaLabel: "Irattár megnyitása",
        smsBody: `eaisyDocs: ${ugyiratIds.length} db ügyirat selejtezési jóváhagyásra vár az Irattárban.`,
        defaultChannels: ["in_app", "email"],
      })
    }
  } catch (err) {
    console.error("Hiba az értesítő küldésekor:", err)
  }

  revalidatePath("/archive")
  return { success: true, csomagId: csomag?.id }
}

// 2. Jóváhagyás és Hivatalos Jegyzőkönyv generálás (Vezető csinálja)
export async function approveDisposal(
  ugyiratIds: string[],
  approverName: string,
  csomagId?: string
) {
  const supabase = await createClient()
  if (!approverName || approverName.trim() === "") {
    return { error: "A jóváhagyó nevének megadása kötelező!" }
  }

  const activeCompanyId = await getActiveCompanyIdServer()
  const auth = await requireDocsAuthServer(["admin", "vezeto", "rendszergazda"], activeCompanyId)
  if (!auth.authorized || !auth.user) {
    return {
      error:
        auth.error ||
        "A selejtezési jegyzéket kizárólag Vezető vagy Rendszergazda hagyhatja jóvá! Ügyintéző szerepkörrel a jóváhagyás nem engedélyezett.",
    }
  }
  const user = auth.user

  // Admin kliens az RLS akadályok és megbízható csomagfrissítés kezelésére
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  let dbAdmin = supabase
  if (serviceRoleKey) {
    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
    dbAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }

  const approverProfile = { nev: auth.nev }

  let finalProposerName = "Iratkezelő"

  // 2. Négy szem elve ellenőrzése: A felterjesztő munkatárs alapesetben nem hagyhatja jóvá a saját javaslatát
  const fourEyesRequired = await isFourEyesDisposalRequired()
  const proposerUserIds = new Set<string>()

  // A) Csomagok felterjesztőinek kigyűjtése
  const { data: kapcsoltTetelek } = await dbAdmin
    .from("selejtezes_tetel")
    .select("ugyirat_id, csomag_id, csomag:csomag_id ( id, javaslattevo_user_id )")
    .in("ugyirat_id", ugyiratIds)

  if (kapcsoltTetelek && kapcsoltTetelek.length > 0) {
    for (const t of kapcsoltTetelek) {
      const csomag = Array.isArray(t.csomag) ? t.csomag[0] : t.csomag
      if (csomag?.javaslattevo_user_id) {
        proposerUserIds.add(csomag.javaslattevo_user_id)
      }
    }
  }

  if (csomagId) {
    const { data: directCsomag } = await dbAdmin
      .from("selejtezes_csomag")
      .select("javaslattevo_user_id")
      .eq("id", csomagId)
      .maybeSingle()
    if (directCsomag?.javaslattevo_user_id) {
      proposerUserIds.add(directCsomag.javaslattevo_user_id)
    }
  }

  // B) Eseménynapló ellenőrzése egyetlen kötegelt lekérdezéssel
  const { data: events } = await dbAdmin
    .from("esemeny_naplo")
    .select("entitas_id, user_id")
    .in("entitas_id", ugyiratIds)
    .eq("esemeny_tipus", "modositva")
    .ilike("indoklas", "%Selejtezésre felterjesztve%")
    .order("tortent", { ascending: false })

  if (events && events.length > 0) {
    for (const ev of events) {
      if (ev.user_id) {
        proposerUserIds.add(ev.user_id)
      }
    }
  }

  const isSelfApproval = Boolean(user.id && proposerUserIds.has(user.id))

  // Szigorú elutasítás, ha a szigorú négyszem-elv be van kapcsolva és az aktuális jóváhagyó megegyezik a felterjesztővel
  if (isSelfApproval && fourEyesRequired) {
    return {
      error: "A szigorú négyszem-elv alapján a selejtezési javaslatot felterjesztő munkatárs nem hagyhatja jóvá a saját javaslatát! A jóváhagyást egy másik vezetőnek vagy adminisztrátornak kell elvégeznie (vagy a Rendszergazda beállításokban engedélyezhető az egyfelhasználós mód).",
    }
  }

  // Felterjesztő nevének megállapítása a hivatalos PDF jegyzőkönyvhöz
  const firstProposerId = Array.from(proposerUserIds)[0]
  if (firstProposerId) {
    const { data: profile } = await dbAdmin
      .from("felhasznalo_profil")
      .select("nev")
      .eq("id", firstProposerId)
      .maybeSingle()
    if (profile?.nev) {
      finalProposerName = profile.nev
    }
  } else if (isSelfApproval && approverProfile?.nev) {
    finalProposerName = approverProfile.nev
  }

  // 2. Ügyiratok adatainak kigyűjtése a tételes jegyzőkönyvhöz
  const { data: dossierDetails } = await supabase
    .from("ugyirat")
    .select(`
      id,
      company_id,
      iktatoszam,
      statusz,
      megorzesi_ido_vege,
      ugy_id,
      ugy:ugy_id ( id, targy ),
      irattari_terv:irattari_tetel_id ( tetelszam, megnevezes, megorzesi_ido_ev, selejtezheto ),
      irat ( id )
    `)
    .in("id", ugyiratIds)

  if (!dossierDetails || dossierDetails.length === 0) {
    return { error: "Nem találhatók a kiválasztott ügyiratok." }
  }

  if (activeCompanyId) {
    const foreignDossiers = dossierDetails.filter((d) => d.company_id && d.company_id !== activeCompanyId)
    if (foreignDossiers.length > 0) {
      return { error: "A kiválasztott ügyiratok nem mindegyike tartozik az aktív vállalathoz." }
    }
  }

  // Párhuzamos jóváhagyás elleni védelem: ellenőrizzük a státuszokat
  const alreadyDisposed = dossierDetails.filter((d) => d.statusz === "selejtezett" || (d.ugy as any)?.statusz === "selejtezett")
  if (alreadyDisposed.length > 0) {
    return {
      error: `A kiválasztott ügyiratok közül az alábbiakat már jóváhagyták és selejtezték: ${alreadyDisposed.map(d => d.iktatoszam).join(", ")}`
    }
  }

  const notPending = dossierDetails.filter(d => d.statusz !== "selejtezheto")
  if (notPending.length > 0) {
    return {
      error: `Csak jóváhagyásra felterjesztett (selejtezhető státuszú) ügyiratokat lehet jóváhagyni! Nem megfelelő: ${notPending.map(d => d.iktatoszam).join(", ")}`
    }
  }

  const protocolItems: DisposalProtocolItem[] = []
  const disposedIktatoszamok: string[] = []
  const { ip, userAgent } = await getClientInfo()

  for (const item of dossierDetails) {
    const ugy = Array.isArray(item.ugy) ? (item.ugy as any)[0] : item.ugy
    const irattariTerv = Array.isArray(item.irattari_terv) ? (item.irattari_terv as any)[0] : item.irattari_terv
    const iratok = Array.isArray(item.irat) ? item.irat : []

    const isSelejtezheto = irattariTerv?.selejtezheto !== false // Ha nincs megadva, default true

    protocolItems.push({
      iktatoszam: item.iktatoszam,
      targy: ugy?.targy || "Ismeretlen tárgy",
      tetelszam: irattariTerv?.tetelszam || "-",
      tetelMegnevezes: irattariTerv?.megnevezes || "-",
      megorzesiEv: irattariTerv?.megorzesi_ido_ev || 5,
      megorzesiIdoVege: item.megorzesi_ido_vege || "-",
      iratDarab: iratok.length,
      selejtezheto: isSelejtezheto,
    })

    disposedIktatoszamok.push(item.iktatoszam)

    if (isSelejtezheto) {
      // Tényleges selejtezés és fájlmegsemmisítés
      if (iratok.length > 0) {
        const iratIds = iratok.map((i: any) => i.id)
        const { data: fajlok } = await supabase
          .from("irat_fajl")
          .select("storage_path")
          .in("irat_id", iratIds)
          .not("storage_path", "is", null)

        if (fajlok && fajlok.length > 0) {
          const pathsToDelete = fajlok.map((f) => f.storage_path)
          await dbAdmin.storage.from("irat_files").remove(pathsToDelete)
          await dbAdmin.storage.from("iratok").remove(pathsToDelete)
        }
      }

      // Ügy státuszának átállítása "selejtezett"-re
      if (item.ugy_id) {
        await dbAdmin.from("ugy").update({ statusz: "selejtezett" }).eq("id", item.ugy_id)
      }

      // Ügyirat státuszának átállítása "selejtezett"-re
      await dbAdmin.from("ugyirat").update({ statusz: "selejtezett" }).eq("id", item.id)

      const disposalLogIndoklas = isSelfApproval && !fourEyesRequired
        ? `A megőrzési idő lejárt. Az ügyiratot leselejteztük, a fizikai és digitális fájlokat véglegesen megsemmisítettük a rendszerből (Egyfelhasználós jóváhagyás - a négyszem-elv feloldva a rendszerbeállítások alapján). Jóváhagyta: ${approverName}`
        : `A megőrzési idő lejárt. Az ügyiratot leselejteztük, a fizikai és digitális fájlokat véglegesen megsemmisítettük a rendszerből. Jóváhagyta: ${approverName}`

      // Eseménynapló bejegyzés
      const logPayload: Record<string, any> = {
        entitas_tipus: "ugyirat",
        entitas_id: item.id,
        esemeny_tipus: "selejtezve",
        user_id: user.id,
        indoklas: disposalLogIndoklas,
        ip_cim: ip,
        user_agent: userAgent,
      }
      if (activeCompanyId) {
        logPayload.company_id = activeCompanyId
      }
      await supabase.from("esemeny_naplo").insert(logPayload)
    } else {
      // Maradandó értékű irat: Levéltári átadás (fájlok megőrződnek!)
      if (item.ugy_id) {
        await dbAdmin.from("ugy").update({ statusz: "irattarozott" }).eq("id", item.ugy_id)
      }

      // Ügyirat státuszának visszaállítása "irattarban"-ra (hogy lekerüljön a jóváhagyandó listáról)
      await dbAdmin.from("ugyirat").update({ statusz: "irattarban" }).eq("id", item.id)

      const archiveLogIndoklas = isSelfApproval && !fourEyesRequired
        ? `A megőrzési idő lejárt. Maradandó értékű irattári tétel miatt levéltári átadásra átadva és rögzítve (Egyfelhasználós jóváhagyás - a négyszem-elv feloldva a rendszerbeállítások alapján). Jóváhagyta: ${approverName}`
        : `A megőrzési idő lejárt. Maradandó értékű irattári tétel miatt levéltári átadásra átadva és rögzítve. Jóváhagyta: ${approverName}`

      const archiveLogPayload: Record<string, any> = {
        entitas_tipus: "ugyirat",
        entitas_id: item.id,
        esemeny_tipus: "irattarozva",
        user_id: user.id,
        indoklas: archiveLogIndoklas,
        ip_cim: ip,
        user_agent: userAgent,
      }
      if (activeCompanyId) {
        archiveLogPayload.company_id = activeCompanyId
      }
      await supabase.from("esemeny_naplo").insert(archiveLogPayload)
    }
  }

  // 3. Hivatalos PDF Jegyzőkönyv előállítása
  const now = new Date()
  const year = now.getFullYear()
  const batchSuffix = csomagId ? csomagId.slice(0, 6).toUpperCase() : String(now.getTime()).slice(-4)
  const protocolNumber = `SELEJT-${year}/${batchSuffix}`
  const formattedDate = now.toLocaleDateString("hu-HU")

  // Az aktív cég valódi neve (a rendszer-név alá kerül a PDF fejlécében)
  const { resolveCompanyDetailsServer } = await import("@/utils/company-server")
  const companyDetails = await resolveCompanyDetailsServer()

  const pdfBytes = await generateDisposalProtocolPdf({
    protocolNumber,
    date: formattedDate,
    organizationName: "eaisyDocs Elektronikus Iratkezelő Rendszer",
    companyName: companyDetails.nev || undefined,
    proposerName: finalProposerName,
    approverName: approverName.trim(),
    items: protocolItems,
    isSingleUserApproval: isSelfApproval && !fourEyesRequired,
  })

  // 4. PDF feltöltése a Supabase Storage-ba tartós megőrzésre
  const storagePath = `selejtezes/jegyzokonyv_${protocolNumber.replace(/\//g, "-")}_${Date.now()}.pdf`
  try {
    await dbAdmin.storage
      .from("irat_files")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      })
  } catch (storageErr) {
    console.error("Hiba a selejtezési jegyzőkönyv tárolásakor:", storageErr)
  }

  // 5. Kapcsolódó selejtezes_csomag rekord(ok) beazonosítása és precíz kezelése
  const csomagIdsToUpdate = new Set<string>()
  if (csomagId) csomagIdsToUpdate.add(csomagId)

  if (kapcsoltTetelek) {
    kapcsoltTetelek.forEach((t: any) => {
      if (t.csomag_id) csomagIdsToUpdate.add(t.csomag_id)
    })
  }

  let targetApprovedCsomagId: string | null = null

  if (csomagIdsToUpdate.size > 0) {
    const { data: allItems } = await dbAdmin
      .from("selejtezes_tetel")
      .select("id, csomag_id, ugyirat_id")
      .in("csomag_id", Array.from(csomagIdsToUpdate))

    // Ellenőrizzük, van-e olyan csomag, amelynek pontosan MINDEN tétele jóváhagyásra került
    for (const cId of csomagIdsToUpdate) {
      const itemsOfThisCsomag = allItems?.filter((i) => i.csomag_id === cId) || []
      const allApproved =
        itemsOfThisCsomag.length > 0 &&
        itemsOfThisCsomag.every((i) => ugyiratIds.includes(i.ugyirat_id)) &&
        itemsOfThisCsomag.length === ugyiratIds.length

      if (allApproved) {
        // A teljes csomag egyezik a jóváhagyott tételekkel
        targetApprovedCsomagId = cId
        await dbAdmin
          .from("selejtezes_csomag")
          .update({
            statusz: "jovahagyva",
            jovahagyo_user_id: user.id,
            jovahagyva_at: now.toISOString(),
            jegyzokonyv_path: storagePath,
          })
          .eq("id", cId)
        break
      }
    }

    // Ha részleges jóváhagyás történt (egy csomagból csak néhány tétel lett kiválasztva):
    if (!targetApprovedCsomagId) {
      const { data: newApprovedCsomag } = await dbAdmin
        .from("selejtezes_csomag")
        .insert({
          javaslattevo_user_id: firstProposerId || user.id,
          jovahagyo_user_id: user.id,
          statusz: "jovahagyva",
          jovahagyva_at: now.toISOString(),
          jegyzokonyv_path: storagePath,
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        })
        .select("id")
        .single()

      if (newApprovedCsomag) {
        targetApprovedCsomagId = newApprovedCsomag.id

        // Csak a jóváhagyott tételeket mozgatjuk át ebbe a lezárt csomagba
        for (const uId of ugyiratIds) {
          const existingItem = allItems?.find((i) => i.ugyirat_id === uId)
          if (existingItem) {
            await dbAdmin
              .from("selejtezes_tetel")
              .update({ csomag_id: newApprovedCsomag.id })
              .eq("id", existingItem.id)
          } else {
            await dbAdmin
              .from("selejtezes_tetel")
              .insert({ csomag_id: newApprovedCsomag.id, ugyirat_id: uId })
          }
        }
      }
    }
  } else {
    // Ha nem volt korábbi csomag, létrehozunk egy új jóváhagyott csomagot
    const { data: newCsomag } = await dbAdmin
      .from("selejtezes_csomag")
      .insert({
        javaslattevo_user_id: firstProposerId || user.id,
        jovahagyo_user_id: user.id,
        statusz: "jovahagyva",
        jovahagyva_at: now.toISOString(),
        jegyzokonyv_path: storagePath,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      })
      .select("id")
      .single()

    if (newCsomag) {
      for (const id of ugyiratIds) {
        await dbAdmin.from("selejtezes_tetel").insert({
          csomag_id: newCsomag.id,
          ugyirat_id: id,
        })
      }
    }
  }

  revalidatePath("/archive")

  const pdfBase64 = Buffer.from(pdfBytes).toString("base64")

  return {
    success: true,
    disposedItems: disposedIktatoszamok,
    proposer: finalProposerName,
    protocolNumber,
    storagePath,
    pdfBase64,
  }
}

// 3. Jegyzőkönyv Letöltési URL lekérése (Storage-ból)
export async function getDisposalProtocolDownloadUrl(storagePath: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  const normalizedPath = (storagePath || "").trim()
  if (!normalizedPath.startsWith("selejtezes/") || normalizedPath.includes("..")) {
    return { error: "Érvénytelen jegyzőkönyv elérési útvonal." }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  let storageClient = supabase
  if (serviceRoleKey) {
    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
    storageClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }

  // Ellenőrizzük, hogy az útvonal valóban egy létező selejtezési csomaghoz tartozik-e,
  // és a felhasználónak van-e jogosultsága a csomag vállalatához
  const { data: csomag } = await storageClient
    .from("selejtezes_csomag")
    .select("id, company_id")
    .eq("jegyzokonyv_path", normalizedPath)
    .limit(1)
    .maybeSingle()

  if (!csomag) {
    return { error: "A kért selejtezési jegyzőkönyv nem található." }
  }

  const auth = await requireDocsAuthServer(undefined, csomag.company_id || null)
  if (!auth.authorized) {
    return { error: auth.error || "Nincs jogosultságod a selejtezési jegyzőkönyv letöltéséhez." }
  }

  const { data, error } = await storageClient.storage
    .from("irat_files")
    .createSignedUrl(normalizedPath, 300) // 5 perces rövid érvényesség

  if (error || !data?.signedUrl) {
    console.error("Hiba az aláírt URL létrehozásakor:", error)
    return { error: "Nem sikerült legenerálni a letöltési hivatkozást." }
  }

  // Audit naplózás a selejtezési jegyzőkönyv letöltéséről
  const { ip, userAgent } = await getClientInfo()
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "selejtezes_csomag",
    entitas_id: csomag.id,
    esemeny_tipus: "letoltve",
    user_id: user.id,
    company_id: csomag.company_id || auth.activeCompanyId || null,
    indoklas: `Selejtezési jegyzőkönyv letöltve: ${normalizedPath}`,
    ip_cim: ip,
    user_agent: userAgent,
  })

  return { success: true, signedUrl: data.signedUrl }
}
