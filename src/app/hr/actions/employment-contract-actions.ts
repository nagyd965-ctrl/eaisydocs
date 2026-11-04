"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { resolveCompanyDetailsServer, getActiveCompanyIdServer } from "@/utils/company-server"
import {
  type EmploymentContractPdfData,
  DEFAULT_COMPANY_DETAILS,
} from "@/utils/hr/employment-contract-constants"
import { generateEmploymentContractPdfBuffer } from "@/utils/hr/employment-contract-pdf-generator"
import { executeHrDocumentFiling } from "@/utils/hr-filing-bridge"
import { checkHrWriteAccess, requireHrAuthServer } from "@/utils/hr/hr-auth-guard"
import { isUserAuthorizedForHrView } from "@/utils/hr/company-role-resolver"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function verifyEmploymentContractAccess(
  adminClient: ReturnType<typeof getAdminClient>,
  target: {
    dolgozoId?: string | null
    onboardingId?: string | null
    documentId?: string | null
  },
  options: { requireWrite?: boolean } = {}
) {
  const auth = await requireHrAuthServer(
    ["onboarding", "employees", "payroll", "organization", "admin"],
    null
  )
  if (!auth.user) {
    return { ok: false, error: "Nincs bejelentkezve!", auth, activeCompanyId: null as string | null }
  }
  if (!auth.authorized) {
    return {
      ok: false,
      error: "Nincs jogosultságod a munkaszerződés műveletekhez!",
      auth,
      activeCompanyId: null as string | null,
    }
  }
  if (options.requireWrite && !checkHrWriteAccess(auth, ["admin", "onboarding"])) {
    return {
      ok: false,
      error: "Csak olvasási jogosultságod van, a munkaszerződés módosítása nem engedélyezett!",
      auth,
      activeCompanyId: null as string | null,
    }
  }

  const activeCompanyId = auth.activeCompanyId || (await getActiveCompanyIdServer())

  if (activeCompanyId) {
    if (target.dolgozoId) {
      const [{ data: member }, { data: adatlap }] = await Promise.all([
        adminClient
          .from("company_members")
          .select("user_id")
          .eq("company_id", activeCompanyId)
          .eq("user_id", target.dolgozoId)
          .maybeSingle(),
        adminClient
          .from("hr_dolgozo_adatlap")
          .select("company_id")
          .eq("id", target.dolgozoId)
          .maybeSingle(),
      ])
      if (!member && adatlap?.company_id !== activeCompanyId) {
        return {
          ok: false,
          error: "A megadott munkavállaló nem tartozik az aktív vállalathoz.",
          auth,
          activeCompanyId,
        }
      }
    }

    if (target.onboardingId) {
      const { data: ob } = await adminClient
        .from("hr_onboarding")
        .select("company_id")
        .eq("id", target.onboardingId)
        .maybeSingle()
      if (!ob || (ob.company_id && ob.company_id !== activeCompanyId)) {
        return {
          ok: false,
          error: "A beléptetési folyamat nem tartozik az aktív vállalathoz.",
          auth,
          activeCompanyId,
        }
      }
    }

    if (target.documentId) {
      const { data: doc } = await adminClient
        .from("hr_dokumentum")
        .select("company_id")
        .eq("id", target.documentId)
        .maybeSingle()
      if (!doc || (doc.company_id && doc.company_id !== activeCompanyId)) {
        return {
          ok: false,
          error: "A dokumentum nem tartozik az aktív vállalathoz.",
          auth,
          activeCompanyId,
        }
      }
    }
  }

  return { ok: true, auth, activeCompanyId }
}

export interface GetEmploymentContractParams {
  dolgozoId?: string | null
  onboardingId?: string | null
}

export async function getEmploymentContractRecord({ dolgozoId, onboardingId }: GetEmploymentContractParams) {
  try {
    const adminClient = getAdminClient()
    const access = await verifyEmploymentContractAccess(adminClient, { dolgozoId, onboardingId })
    if (!access.ok) {
      return { data: null, existingDocument: null, mt46Document: null, error: access.error }
    }

    const supabase = await createClient()
    const activeCompanyId = access.activeCompanyId

    let query = supabase.from("hr_munkaszerzodes").select("*")
    if (activeCompanyId) {
      query = query.eq("company_id", activeCompanyId)
    }
    if (dolgozoId) {
      query = query.eq("dolgozo_id", dolgozoId)
    } else if (onboardingId) {
      query = query.eq("onboarding_id", onboardingId)
    } else {
      return { data: null, existingDocument: null }
    }

    const { data: record, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle()

    if (error) {
      console.error("Error fetching hr_munkaszerzodes:", error)
      return { data: null, existingDocument: null, error: error.message }
    }

    let existingDocument = null
    if (record?.dokumentum_id) {
      const { data: doc } = await supabase
        .from("hr_dokumentum")
        .select("*")
        .eq("id", record.dokumentum_id)
        .maybeSingle()

      if (doc?.url) {
        const { data: sData } = await supabase.storage.from("irat_files").createSignedUrl(doc.url, 3600)
        let alairtSignedUrl = null
        if (doc.alairt_fajl_url) {
          const { data: aData } = await supabase.storage.from("irat_files").createSignedUrl(doc.alairt_fajl_url, 3600)
          alairtSignedUrl = aData?.signedUrl || doc.alairt_fajl_url
        }

        existingDocument = {
          ...doc,
          url: sData?.signedUrl || doc.url,
          originalStoragePath: doc.url,
          alairt_fajl_url: alairtSignedUrl || doc.alairt_fajl_url,
          displayUrl: alairtSignedUrl || sData?.signedUrl || doc.url,
        }
      }
    }

    let mt46Document: any = null
    let mtQuery = adminClient.from("hr_dokumentum").select("*").ilike("nev", "%Mt. 46%")
    if (activeCompanyId) {
      mtQuery = mtQuery.eq("company_id", activeCompanyId)
    }
    if (dolgozoId) {
      mtQuery = mtQuery.eq("dolgozo_id", dolgozoId)
    } else if (onboardingId) {
      mtQuery = mtQuery.ilike("url", `%${onboardingId}%`)
    }
    const { data: mtList } = await mtQuery.order("created_at", { ascending: false }).limit(1)
    if (mtList && mtList.length > 0) {
      const mtDoc = mtList[0]
      let mUrl = mtDoc.url
      if (mtDoc.url && !mtDoc.url.startsWith("http")) {
        const { data: s } = await adminClient.storage.from("irat_files").createSignedUrl(mtDoc.url, 3600)
        if (s?.signedUrl) mUrl = s.signedUrl
      }
      mt46Document = { ...mtDoc, displayUrl: mUrl, url: mUrl }
    }

    // Dolgozói alapadatok és titkos adatok automatikus feloldása és összefésülése
    let resolvedDolgozoId = dolgozoId
    if (!resolvedDolgozoId && onboardingId) {
      const { data: ob } = await adminClient
        .from("hr_onboarding")
        .select("dolgozo_id")
        .eq("id", onboardingId)
        .maybeSingle()
      if (ob?.dolgozo_id) resolvedDolgozoId = ob.dolgozo_id
    }

    const canAccessPayrollOrOnboarding =
      access.auth.isCompanyAdmin ||
      isUserAuthorizedForHrView(
        access.auth.hrRole,
        ["admin", "payroll", "onboarding"],
        access.auth.hrModules
      )

    let adatlapData: any = null
    let secretData: any = null
    if (resolvedDolgozoId) {
      const { data: aData } = await adminClient
        .from("hr_dolgozo_adatlap")
        .select(`
          *,
          felhasznalo_profil (
            nev,
            pozicio,
            hr_szervezeti_egyseg ( nev )
          ),
          hr_jogviszony (
            company_id,
            tipus,
            belepes_datuma,
            kilepes_datuma,
            hr_beosztas (
              ervenyes_ig,
              hr_munkakor ( megnevezes, feor_kod )
            )
          )
        `)
        .eq("id", resolvedDolgozoId)
        .maybeSingle()
      adatlapData = aData

      if (canAccessPayrollOrOnboarding) {
        try {
          const { data: sData } = await supabase.rpc("get_decrypted_hr_data", {
            p_dolgozo_id: resolvedDolgozoId,
          })
          secretData = sData
        } catch (secErr) {
          console.warn("Nem sikerült a titkos HR adatok dekódolása a szerződéshez:", secErr)
        }
      }
    }

    // Aktív munkakör kinyerése (cég-szűrt jogviszonyból)
    let activeMunkakorMegnevezes = ""
    const jogviszonyList = Array.isArray(adatlapData?.hr_jogviszony)
      ? adatlapData.hr_jogviszony.filter(
          (j: any) => !activeCompanyId || !j.company_id || j.company_id === activeCompanyId
        )
      : []

    if (jogviszonyList.length > 0) {
      const activeJog = jogviszonyList.find((j: any) => !j.kilepes_datuma) || jogviszonyList[0]
      const beosztasok = activeJog?.hr_beosztas || []
      const activeBeosztas =
        beosztasok.find((b: any) => !b.ervenyes_ig || new Date(b.ervenyes_ig) >= new Date()) || beosztasok[0]
      if (activeBeosztas?.hr_munkakor?.megnevezes) {
        activeMunkakorMegnevezes = activeBeosztas.hr_munkakor.megnevezes
        if (activeBeosztas.hr_munkakor.feor_kod) {
          activeMunkakorMegnevezes += ` (FEOR: ${activeBeosztas.hr_munkakor.feor_kod})`
        }
      }
    }

    const reszlegNev =
      (Array.isArray(adatlapData?.felhasznalo_profil?.hr_szervezeti_egyseg)
        ? adatlapData?.felhasznalo_profil?.hr_szervezeti_egyseg[0]?.nev
        : (adatlapData?.felhasznalo_profil?.hr_szervezeti_egyseg as any)?.nev) || null

    // Összefésüljük a szerződést a dolgozó ismert adataival
    const mergedData =
      record || resolvedDolgozoId
        ? {
            ...(record || {}),
            munkakor:
              record?.munkakor || activeMunkakorMegnevezes || adatlapData?.felhasznalo_profil?.pozicio || null,
            reszleg: record?.reszleg || reszlegNev,
            kezdes_datuma:
              record?.kezdes_datuma ||
              jogviszonyList[0]?.belepes_datuma ||
              new Date().toISOString().split("T")[0],
            szerzodes_tipusa:
              record?.szerzodes_tipusa ||
              (adatlapData?.szerzodes_tipusa === "határozott" ? "hatarozott" : "hatarozatlan"),
            alapber: canAccessPayrollOrOnboarding
              ? Number(
                  record?.alapber || (secretData?.brutto_ber ? Number(secretData.brutto_ber) : null) || 650000
                )
              : 0,

            // Munkavállaló személyes azonosító adatai automatikus kitöltéssel
            szuletesi_hely: record?.szuletesi_hely || adatlapData?.szuletesi_hely || "Budapest",
            szuletesi_datum:
              record?.szuletesi_datum || adatlapData?.szuletesi_datum || adatlapData?.szuletesi_ido || null,
            anyja_neve: record?.anyja_neve || adatlapData?.anyja_neve || null,
            lakcim: record?.lakcim || adatlapData?.lakcim || null,
            adoazonosito_jel: canAccessPayrollOrOnboarding
              ? record?.adoazonosito_jel || secretData?.adoazonosito || null
              : null,
            taj_szam: canAccessPayrollOrOnboarding
              ? record?.taj_szam || secretData?.taj_szam || null
              : null,
            bankszamlaszam: canAccessPayrollOrOnboarding
              ? record?.bankszamlaszam || secretData?.bankszamla || null
              : null,
          }
        : null

    return { data: mergedData, existingDocument, mt46Document }
  } catch (err: any) {
    console.error("getEmploymentContractRecord exception:", err)
    return { data: null, existingDocument: null, mt46Document: null, error: err.message }
  }
}

export interface GenerateEmploymentContractActionParams {
  onboardingId?: string | null
  dolgozoId?: string | null
  employeeName: string
  munkakor: string
  reszleg?: string | null
  kezdesDatuma: string
  szerzodesTipusa?: "hatarozatlan" | "hatarozott"
  hatarozottLejarat?: string | null
  munkaidoTipus?: "teljes" | "reszmunkaido"
  napiMunkaidoOra?: number
  probaidoHonap?: number
  alapber: number
  munkavegzesHelye?: string
  tavmunkaMegallapodas?: boolean
  szuletesiHely?: string | null
  szuletesiDatum?: string | null
  anyjaNeve?: string | null
  lakcim?: string | null
  adoazonositoJel?: string | null
  tajSzam?: string | null
  bankszamlaszam?: string | null
}

export async function generateAndFileEmploymentContractAction(params: GenerateEmploymentContractActionParams) {
  try {
    const adminClient = getAdminClient()
    const access = await verifyEmploymentContractAccess(
      adminClient,
      {
        dolgozoId: params.dolgozoId,
        onboardingId: params.onboardingId,
      },
      { requireWrite: true }
    )
    if (!access.ok || !access.auth.user) {
      return { error: access.error || "Nincs jogosultságod!" }
    }
    const user = access.auth.user
    const activeCompanyId = access.activeCompanyId

    const now = new Date()
    const contractNumber = `MSZ-${now.getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`

    // 1. PDF Buffer előállítása
    const cegAdatok = await resolveCompanyDetailsServer(activeCompanyId, adminClient)
    const pdfData: EmploymentContractPdfData = {
      contractNumber,
      employeeName: params.employeeName,
      szuletesiHely: params.szuletesiHely,
      szuletesiDatum: params.szuletesiDatum,
      anyjaNeve: params.anyjaNeve,
      lakcim: params.lakcim,
      adoazonositoJel: params.adoazonositoJel,
      tajSzam: params.tajSzam,
      bankszamlaszam: params.bankszamlaszam,
      munkakor: params.munkakor,
      reszleg: params.reszleg || "Központi",
      kezdesDatuma: params.kezdesDatuma,
      szerzodesTipusa: params.szerzodesTipusa || "hatarozatlan",
      hatarozottLejarat: params.hatarozottLejarat,
      munkaidoTipus: params.munkaidoTipus || "teljes",
      napiMunkaidoOra: Number(params.napiMunkaidoOra || 8),
      probaidoHonap: Number(params.probaidoHonap ?? 3),
      alapber: Number(params.alapber || 500000),
      munkavegzesHelye: params.munkavegzesHelye || "A Munkáltató mindenkori székhelye és telephelyei",
      tavmunkaMegallapodas: Boolean(params.tavmunkaMegallapodas),
      cegAdatok,
      isDraft: !params.dolgozoId,
    }

    const { buffer, fileName } = await generateEmploymentContractPdfBuffer(pdfData)

    // 2. Feltöltés Supabase Storage-ba
    const storagePath = `hr/contracts/${params.dolgozoId || params.onboardingId || "onboarding"}/${fileName}`
    const { error: uploadErr } = await adminClient.storage
      .from("irat_files")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr)
      return { error: `Nem sikerült feltölteni a dokumentumot: ${uploadErr.message}` }
    }

    // 3. Mentés a hr_dokumentum táblába
    const docName = `Munkaszerződés - ${params.employeeName} (${params.kezdesDatuma})`
    const { data: newDoc, error: docErr } = await adminClient
      .from("hr_dokumentum")
      .insert({
        dolgozo_id: params.dolgozoId || null,
        nev: docName,
        kategoria: "Munkaszerződés",
        url: storagePath,
        alairas_statusz: "vazlat",
        company_id: activeCompanyId,
      })
      .select()
      .single()

    if (docErr || !newDoc) {
      console.error("hr_dokumentum insert error:", docErr)
      return { error: `Dokumentum mentési hiba: ${docErr?.message}` }
    }

    let filingResult = null
    let isFiled = false

    // 4. Ha a munkavállaló már aktív (van dolgozoId), azonnal beiktatjuk a személyi dossziéba
    if (params.dolgozoId) {
      try {
        filingResult = await executeHrDocumentFiling(adminClient, {
          documentId: newDoc.id,
          employeeId: params.dolgozoId,
          customTargy: docName,
          currentUserId: user.id,
        })
        isFiled = Boolean(filingResult.success && filingResult.iktatoszam)
      } catch (fErr) {
        console.error("Azonnali iktatási hiba:", fErr)
      }
    }

    // 5. Mentés a hr_munkaszerzodes táblába
    const { data: contractRecord, error: contractErr } = await adminClient
      .from("hr_munkaszerzodes")
      .insert({
        dolgozo_id: params.dolgozoId || null,
        onboarding_id: params.onboardingId || null,
        szerzodes_szam: contractNumber,
        munkakor: params.munkakor,
        kezdes_datuma: params.kezdesDatuma,
        szerzodes_tipusa: params.szerzodesTipusa || "hatarozatlan",
        hatarozott_lejarat: params.hatarozottLejarat || null,
        munkaido_tipus: params.munkaidoTipus || "teljes",
        napi_munkaido_ora: Number(params.napiMunkaidoOra || 8),
        probaido_honap: Number(params.probaidoHonap ?? 3),
        alapber: Number(params.alapber || 500000),
        munkavegzes_helye: params.munkavegzesHelye || "A Munkáltató mindenkori székhelye és telephelyei",
        tavmunka_megallapodas: Boolean(params.tavmunkaMegallapodas),
        szuletesi_hely: params.szuletesiHely || null,
        szuletesi_datum: params.szuletesiDatum || null,
        anyja_neve: params.anyjaNeve || null,
        lakcim: params.lakcim || null,
        adoazonosito_jel: params.adoazonositoJel || null,
        taj_szam: params.tajSzam || null,
        bankszamlaszam: params.bankszamlaszam || null,
        reszleg: params.reszleg || null,
        dokumentum_id: newDoc.id,
        company_id: activeCompanyId,
      })
      .select()
      .single()

    if (contractErr) {
      console.error("hr_munkaszerzodes insert error:", contractErr)
    }

    // 5b. Ha meglévő dolgozóról van szó (dolgozoId megadva), szinkronizáljuk a szerződés és titkos adatokat az adatlapjára és a titkos tárolóba
    const canModifySecretPayrollData =
      access.auth.isCompanyAdmin ||
      isUserAuthorizedForHrView(
        access.auth.hrRole,
        ["admin", "payroll", "onboarding"],
        access.auth.hrModules
      )

    if (params.dolgozoId) {
      try {
        let adatlapUpd = adminClient
          .from("hr_dolgozo_adatlap")
          .update({
            lakcim: params.lakcim || undefined,
            szuletesi_hely: params.szuletesiHely || undefined,
            szuletesi_datum: params.szuletesiDatum || undefined,
            anyja_neve: params.anyjaNeve || undefined,
          })
          .eq("id", params.dolgozoId)
        if (activeCompanyId) {
          adatlapUpd = adatlapUpd.eq("company_id", activeCompanyId)
        }
        await adatlapUpd

        if (params.kezdesDatuma) {
          let jogUpd = adminClient
            .from("hr_jogviszony")
            .update({ belepes_datuma: params.kezdesDatuma })
            .eq("dolgozo_id", params.dolgozoId)
          if (activeCompanyId) {
            jogUpd = jogUpd.eq("company_id", activeCompanyId)
          }
          await jogUpd
        }

        if (canModifySecretPayrollData) {
          const taj = params.tajSzam || ""
          const ado = params.adoazonositoJel || ""
          const bank = params.bankszamlaszam || ""
          const brutto = params.alapber ? String(params.alapber) : ""
          const bruttoNum = Number(params.alapber || 0)
          const netto = bruttoNum > 0 ? String(Math.round(bruttoNum * 0.665)) : ""
          const toByteaHex = (str: string) => "\\x" + Buffer.from(str, "utf-8").toString("hex")

          if (taj || ado || bank || brutto) {
            await adminClient.from("hr_dolgozo_titkos_adat").upsert({
              dolgozo_id: params.dolgozoId,
              taj_szam_titkositott: taj ? toByteaHex(taj) : null,
              adoazonosito_titkositott: ado ? toByteaHex(ado) : null,
              bankszamla_titkositott: bank ? toByteaHex(bank) : null,
              brutto_ber_titkositott: brutto ? toByteaHex(brutto) : null,
              netto_ber_titkositott: netto ? toByteaHex(netto) : null,
            })
          }
        }
      } catch (syncErr) {
        console.error("Hiba a szerződés adatlap szinkronizációjakor:", syncErr)
      }
    }

    // 6. Ha van onboarding feladat a munkaszerződésre, automatikusan készre állítjuk és frissítjük az onboarding rekordot!
    if (params.onboardingId) {
      try {
        let obUpd = adminClient
          .from("hr_onboarding")
          .update({
            munkakor: params.munkakor,
            reszleg: params.reszleg || null,
            belepes_datuma: params.kezdesDatuma,
          })
          .eq("id", params.onboardingId)
        if (activeCompanyId) {
          obUpd = obUpd.eq("company_id", activeCompanyId)
        }
        await obUpd

        const { data: tasks } = await adminClient
          .from("hr_onboarding_feladat")
          .select("id, cim, statusz")
          .eq("onboarding_id", params.onboardingId)

        const contractTask = (tasks || []).find(
          (t: any) =>
            (t.cim || "").toLowerCase().includes("munkaszerződés") ||
            (t.cim || "").toLowerCase().includes("szerződés")
        )

        if (contractTask && contractTask.statusz !== "done") {
          await adminClient
            .from("hr_onboarding_feladat")
            .update({ statusz: "done" })
            .eq("id", contractTask.id)
        }
      } catch (tErr) {
        console.error("Hiba az onboarding feladat lezárásakor:", tErr)
      }
    }

    // 7. Audit naplózás
    await adminClient.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      esemeny_tipus: "adat_letrehozas",
      entitas_tipus: "hr_munkaszerzodes",
      entitas_id: contractRecord?.id || newDoc.id,
      company_id: activeCompanyId,
      megjegyzes: `Munkaszerződés generálva: ${params.employeeName} (${params.munkakor})`,
    })

    const { data: sData } = await adminClient.storage.from("irat_files").createSignedUrl(storagePath, 3600)

    revalidatePath("/hr/onboarding")
    if (params.dolgozoId) {
      revalidatePath(`/hr/employee/${params.dolgozoId}`)
    }

    return {
      success: true,
      contract: contractRecord,
      document: {
        ...newDoc,
        url: sData?.signedUrl || storagePath,
        iktatoszam: filingResult?.iktatoszam || null,
      },
      isFiled,
    }
  } catch (err: any) {
    console.error("generateAndFileEmploymentContractAction error:", err)
    return { error: err.message || "Váratlan hiba történt a munkaszerződés készítésekor." }
  }
}

export async function fileExistingEmploymentContractDocument({
  documentId,
  dolgozoId,
  employeeName,
}: {
  documentId: string
  dolgozoId: string
  employeeName: string
}) {
  try {
    const adminClient = getAdminClient()
    const access = await verifyEmploymentContractAccess(adminClient, { documentId, dolgozoId }, { requireWrite: true })
    if (!access.ok || !access.auth.user) {
      return { error: access.error || "Nincs jogosultságod!" }
    }

    const { data: doc, error: docErr } = await adminClient
      .from("hr_dokumentum")
      .select("id, nev, iktatoszam")
      .eq("id", documentId)
      .single()

    if (docErr || !doc) return { error: "Dokumentum nem található!" }
    if (doc.iktatoszam) return { error: "A dokumentum már be van iktatva!", iktatoszam: doc.iktatoszam }

    await adminClient
      .from("hr_dokumentum")
      .update({ dolgozo_id: dolgozoId })
      .eq("id", documentId)

    const result = await executeHrDocumentFiling(adminClient, {
      documentId,
      employeeId: dolgozoId,
      customTargy: doc.nev || `Munkaszerződés - ${employeeName}`,
      currentUserId: access.auth.user.id,
    })

    if (!result.success) {
      return { error: result.error || "Hiba az iktatás során." }
    }

    await adminClient
      .from("hr_munkaszerzodes")
      .update({ dolgozo_id: dolgozoId })
      .eq("dokumentum_id", documentId)

    revalidatePath("/hr/onboarding")
    revalidatePath(`/hr/employee/${dolgozoId}`)

    return { success: true, iktatoszam: result.iktatoszam }
  } catch (err: any) {
    console.error("fileExistingEmploymentContractDocument error:", err)
    return { error: err.message }
  }
}

/**
 * Mt. 46. § Munkáltatói Írásbeli Tájékoztató generálása és mentése
 */
export async function generateMt46NoticeAction(params: GenerateEmploymentContractActionParams) {
  try {
    const adminClient = getAdminClient()
    const access = await verifyEmploymentContractAccess(
      adminClient,
      {
        dolgozoId: params.dolgozoId,
        onboardingId: params.onboardingId,
      },
      { requireWrite: true }
    )
    if (!access.ok || !access.auth.user) {
      return { error: access.error || "Nincs jogosultságod!" }
    }
    const user = access.auth.user
    const activeCompanyId = access.activeCompanyId

    const { generateMt46NoticePdfBuffer } = await import("@/utils/hr/mt46-notice-generator")
    const cegAdatok = await resolveCompanyDetailsServer(activeCompanyId, adminClient)

    const pdfData: EmploymentContractPdfData = {
      contractNumber: "Mt. 46 Tájékoztató",
      employeeName: params.employeeName,
      szuletesiHely: params.szuletesiHely,
      szuletesiDatum: params.szuletesiDatum,
      anyjaNeve: params.anyjaNeve,
      lakcim: params.lakcim,
      adoazonositoJel: params.adoazonositoJel,
      tajSzam: params.tajSzam,
      bankszamlaszam: params.bankszamlaszam,
      munkakor: params.munkakor,
      reszleg: params.reszleg || "Központi",
      kezdesDatuma: params.kezdesDatuma,
      szerzodesTipusa: params.szerzodesTipusa || "hatarozatlan",
      hatarozottLejarat: params.hatarozottLejarat,
      munkaidoTipus: params.munkaidoTipus || "teljes",
      napiMunkaidoOra: Number(params.napiMunkaidoOra || 8),
      probaidoHonap: Number(params.probaidoHonap ?? 3),
      alapber: Number(params.alapber || 500000),
      munkavegzesHelye: params.munkavegzesHelye || "A Munkáltató mindenkori székhelye és telephelyei",
      tavmunkaMegallapodas: Boolean(params.tavmunkaMegallapodas),
      cegAdatok,
      isDraft: !params.dolgozoId,
    }

    const buffer = await generateMt46NoticePdfBuffer(pdfData)
    const timestamp = Date.now()
    const storagePath = `hr/contracts/${params.dolgozoId || params.onboardingId || "onboarding"}/mt46_tajekoztato_${timestamp}.pdf`

    const { error: uploadErr } = await adminClient.storage
      .from("irat_files")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadErr) {
      console.error("Storage upload error (Mt. 46):", uploadErr)
      return { error: `Nem sikerült feltölteni a tájékoztatót: ${uploadErr.message}` }
    }

    const docName = `Munkáltatói Tájékoztató (Mt. 46. §) - ${params.employeeName}`
    const { data: newDoc, error: docErr } = await adminClient
      .from("hr_dokumentum")
      .insert({
        dolgozo_id: params.dolgozoId || null,
        nev: docName,
        kategoria: "Tájékoztató",
        url: storagePath,
        company_id: activeCompanyId,
      })
      .select()
      .single()

    if (docErr || !newDoc) {
      return { error: "Nem sikerült menteni a tájékoztató dokumentumot az adatbázisba." }
    }

    let viewUrl = storagePath
    const { data: signed } = await adminClient.storage.from("irat_files").createSignedUrl(storagePath, 3600)
    if (signed?.signedUrl) viewUrl = signed.signedUrl

    // Ha van dolgozoId, azonnal iktatjuk
    let iktatoszam = null
    if (params.dolgozoId) {
      const filingRes = await executeHrDocumentFiling(adminClient, {
        documentId: newDoc.id,
        employeeId: params.dolgozoId,
        customTargy: docName,
        currentUserId: user.id,
      })
      if (filingRes.success && filingRes.iktatoszam) {
        iktatoszam = filingRes.iktatoszam
      }
    }

    revalidatePath("/hr/onboarding")
    if (params.dolgozoId) revalidatePath(`/hr/employee/${params.dolgozoId}`)

    return {
      success: true,
      documentId: newDoc.id,
      url: viewUrl,
      displayUrl: viewUrl,
      iktatoszam,
    }
  } catch (err: any) {
    console.error("generateMt46NoticeAction error:", err)
    return { error: err.message || "Hiba történt a tájékoztató generálása során." }
  }
}
