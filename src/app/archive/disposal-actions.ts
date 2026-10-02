"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { sendNotificationEmail, buildHtmlEmail } from "@/utils/mailer"
import { getBaseUrl } from "@/utils/url"
import { getClientInfo } from "@/utils/client-info"
import { generateDisposalProtocolPdf, DisposalProtocolItem } from "@/utils/disposal-protocol-pdf"
import { isFourEyesDisposalRequired } from "@/utils/system-settings"

// 1. Felterjesztés Selejtezésre (Iratkezelő csinálja)
export async function proposeDisposal(ugyiratIds: string[], note?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }
  if (!ugyiratIds || ugyiratIds.length === 0) {
    return { error: "Nincs kiválasztva felterjesztendő ügyirat." }
  }

  // Ellenőrizzük, hogy csak irattárban lévő (irattározott vagy lezárt) ügyiratot lehessen felterjeszteni
  const { data: dossiersToPropose } = await supabase
    .from("ugyirat")
    .select("id, iktatoszam, statusz, megorzesi_ido_vege")
    .in("id", ugyiratIds)

  if (!dossiersToPropose || dossiersToPropose.length === 0) {
    return { error: "Nem találhatók a kiválasztott ügyiratok." }
  }

  const notInArchive = dossiersToPropose.filter((d) => !["irattarban", "lezart"].includes(d.statusz))
  if (notInArchive.length > 0) {
    return {
      error: `Csak irattárban lévő ügyiratot lehet selejtezésre felterjeszteni! Nem megfelelő: ${notInArchive.map((d) => d.iktatoszam).join(", ")}`,
    }
  }

  // Létrehozunk egy új Selejtezési Csomagot
  const { data: csomag, error: csomagError } = await supabase
    .from("selejtezes_csomag")
    .insert({
      javaslattevo_user_id: user.id,
      statusz: "jovahagyasra_var",
    })
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
      await supabase.from("esemeny_naplo").insert({
        entitas_tipus: "ugyirat",
        entitas_id: id,
        esemeny_tipus: "modositva",
        user_id: user.id,
        indoklas: note ? `Selejtezésre felterjesztve: ${note}` : "Selejtezésre felterjesztve a hatályos megőrzési idő lejárta alapján.",
        ip_cim: ip,
        user_agent: userAgent,
      })
    }
  }

  // Értesítés a vezetőknek a selejtezési felterjesztésről
  try {
    const { data: szabaly } = await supabase
      .from("ertesitesi_szabaly")
      .select("aktiv")
      .eq("esemeny_tipus", "allapotvaltozas")
      .eq("kinek", "vezeto")
      .single()

    if (szabaly?.aktiv) {
      const { data: vezetok } = await supabase
        .from("felhasznalo_profil")
        .select("id")
        .or("docs_szerepkor.in.(admin,vezeto,rendszergazda),szerepkor.in.(admin,vezeto,rendszergazda)")

      if (vezetok && vezetok.length > 0) {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceRoleKey) {
          const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
          const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            { auth: { autoRefreshToken: false, persistSession: false } }
          )

          for (const vezeto of vezetok) {
            const { data: adminData } = await supabaseAdmin.auth.admin.getUserById(vezeto.id)
            const userEmail = adminData?.user?.email

            if (userEmail) {
              await sendNotificationEmail({
                to: userEmail,
                subject: "Új iratselejtezési javaslat jóváhagyásra vár",
                html: buildHtmlEmail(
                  "Iratselejtezési jóváhagyás szükséges",
                  `Egy munkatárs felterjesztett <b>${ugyiratIds.length} db</b> ügyiratot végleges selejtezésre. Kérlek, lépj be az Irattár felületre, vizsgáld felül az iratokat, és a "Négy Szem Elve" alapján hagyd jóvá a megsemmisítésüket és a jegyzőkönyv kiállítását.`,
                  [],
                  "Irattár megnyitása",
                  `${getBaseUrl()}/archive`
                ),
              })
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Hiba az értesítő e-mail küldésekor:", err)
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
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }
  if (!approverName || approverName.trim() === "") {
    return { error: "A jóváhagyó nevének megadása kötelező!" }
  }

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

  // 1. Jogosultság ellenőrzése: Kizárólag Vezető vagy Adminisztrátor hagyhat jóvá selejtezést
  const { data: approverProfile } = await dbAdmin
    .from("felhasznalo_profil")
    .select("docs_szerepkor, szerepkor, nev")
    .eq("id", user.id)
    .single()

  const approverRole = approverProfile?.docs_szerepkor || approverProfile?.szerepkor || "ugyintezo"
  if (!["admin", "vezeto", "rendszergazda"].includes(approverRole)) {
    return { 
      error: "A selejtezési jegyzéket kizárólag Vezető vagy Rendszergazda hagyhatja jóvá! Ügyintéző szerepkörrel a jóváhagyás nem engedélyezett." 
    }
  }

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
      await supabase.from("esemeny_naplo").insert({
        entitas_tipus: "ugyirat",
        entitas_id: item.id,
        esemeny_tipus: "selejtezve",
        user_id: user.id,
        indoklas: disposalLogIndoklas,
        ip_cim: ip,
        user_agent: userAgent,
      })
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

      await supabase.from("esemeny_naplo").insert({
        entitas_tipus: "ugyirat",
        entitas_id: item.id,
        esemeny_tipus: "irattarozva",
        user_id: user.id,
        indoklas: archiveLogIndoklas,
        ip_cim: ip,
        user_agent: userAgent,
      })
    }
  }

  // 3. Hivatalos PDF Jegyzőkönyv előállítása
  const now = new Date()
  const year = now.getFullYear()
  const batchSuffix = csomagId ? csomagId.slice(0, 6).toUpperCase() : String(now.getTime()).slice(-4)
  const protocolNumber = `SELEJT-${year}/${batchSuffix}`
  const formattedDate = now.toLocaleDateString("hu-HU")

  const pdfBytes = await generateDisposalProtocolPdf({
    protocolNumber,
    date: formattedDate,
    organizationName: "eaisyDocs Elektronikus Iratkezelő Rendszer",
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

  const { data, error } = await storageClient.storage
    .from("irat_files")
    .createSignedUrl(storagePath, 3600) // 1 órás érvényesség

  if (error || !data?.signedUrl) {
    console.error("Hiba az aláírt URL létrehozásakor:", error)
    return { error: "Nem sikerült legenerálni a letöltési hivatkozást." }
  }

  return { success: true, signedUrl: data.signedUrl }
}
