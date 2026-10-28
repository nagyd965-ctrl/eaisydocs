"use server"

import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { sendNotificationEmail } from "@/utils/mailer"
import { resolveCareerEmployeeContext } from "@/utils/hr/career-auth"

function generateTrackingCode(): string {
  const year = new Date().getFullYear()
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let suffix = ""
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `KAR-${year}-${suffix}`
}

export async function submitApplication(formData: FormData) {
  try {
    const nev = formData.get("nev") as string
    const email = formData.get("email") as string
    const telefon = formData.get("telefon") as string
    const uzenet = formData.get("uzenet") as string
    const linkedinUrl = formData.get("linkedin_url") as string
    const berigenyRaw = formData.get("berigeny") as string
    const kezdesiIdo = formData.get("kezdesi_ido") as string
    const forras = (formData.get("forras") as string) || "karrieroldal"
    const megpalyazottTerulet = formData.get("megpalyazott_terulet") as string
    const allashirdetesId = (formData.get("allashirdetesId") as string) || null
    const munkakorId = (formData.get("munkakorId") as string) || null
    const explicitCompanyId = (formData.get("companyId") as string) || null
    const cvFile = formData.get("cv") as File | null
    const isInternalFlag = formData.get("isInternalEmployee") === "true"

    const empCtx = isInternalFlag
      ? await resolveCareerEmployeeContext()
      : { isAuthenticated: false, employeeCompanyIds: [], employeeData: null }
    const isVerifiedInternalEmployee = Boolean(empCtx.isAuthenticated)
    const hasCvFile = Boolean(cvFile && cvFile.size > 0)

    if (!nev || !email || (!isVerifiedInternalEmployee && !hasCvFile)) {
      return { error: "Hiányzó kötelező mezők (Név, E-mail cím, Önéletrajz)!" }
    }

    // 1. E-mail validáció
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return { error: "Kérjük, érvényes e-mail címet adjon meg!" }
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 2. Fájl méret és típus ellenőrzés + feltöltés (ha van csatolt CV)
    let uploadedCvPath: string | null = null
    if (cvFile && cvFile.size > 0) {
      const MAX_FILE_SIZE = 10 * 1024 * 1024
      if (cvFile.size > MAX_FILE_SIZE) {
        return { error: "A feltöltött önéletrajz mérete nem haladhatja meg a 10 MB-ot!" }
      }

      const allowedExtensions = ["pdf", "docx", "doc"]
      const fileExt = cvFile.name.split(".").pop()?.toLowerCase() || ""
      if (!allowedExtensions.includes(fileExt)) {
        return {
          error:
            "Kérjük, kizárólag PDF vagy Word (.doc, .docx) formátumú önéletrajzot töltsön fel!",
        }
      }

      // PDF fájl esetén mágikus bájtok vizsgálata
      const fileBuffer = Buffer.from(await cvFile.arrayBuffer())
      if (fileExt === "pdf") {
        if (
          fileBuffer.length < 32 ||
          !fileBuffer.subarray(0, 5).toString("utf-8").startsWith("%PDF-")
        ) {
          return { error: "A feltöltött fájl nem valódi PDF állomány!" }
        }
      }

      // 3. Önéletrajz feltöltése biztonságos generált névvel
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const storagePath = `cv/${fileName}`

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from("hr_dokumentumok")
        .upload(storagePath, fileBuffer, {
          contentType:
            cvFile.type ||
            (fileExt === "pdf" ? "application/pdf" : "application/octet-stream"),
          upsert: false,
        })

      if (uploadError) {
        console.error("Storage hiba:", uploadError)
        return {
          error: "Nem sikerült feltölteni az önéletrajzot. Kérjük, próbálja újra később.",
        }
      }
      uploadedCvPath = uploadData.path
    }

    // 3.5. Cégazonosító (company_id) és pozíciónév pontos feloldása
    let targetCompanyId: string | null = explicitCompanyId
    let resolvedMunkakorId: string | null = munkakorId
    let postingTitle: string | null = null

    if (allashirdetesId) {
      const { data: posting } = await supabaseAdmin
        .from("hr_allashirdetes")
        .select("cim, company_id, munkakor_id")
        .eq("id", allashirdetesId)
        .maybeSingle()
      if (posting?.company_id) targetCompanyId = posting.company_id
      if (posting?.munkakor_id && !resolvedMunkakorId) {
        resolvedMunkakorId = posting.munkakor_id
      }
      if (posting?.cim) postingTitle = posting.cim
    }

    if (!targetCompanyId && resolvedMunkakorId) {
      const { data: jobRow } = await supabaseAdmin
        .from("hr_munkakor")
        .select("company_id, megnevezes")
        .eq("id", resolvedMunkakorId)
        .maybeSingle()
      if (jobRow?.company_id) targetCompanyId = jobRow.company_id
      if (!postingTitle && jobRow?.megnevezes) postingTitle = jobRow.megnevezes
    }

    // Ha nyitott jelentkezés (Talent Pool) és még nincs munkakorId, keressünk egy munkakört az adott cégből, ha szükséges
    if (!resolvedMunkakorId && targetCompanyId) {
      const { data: fallbackJob } = await supabaseAdmin
        .from("hr_munkakor")
        .select("id")
        .eq("company_id", targetCompanyId)
        .limit(1)
        .maybeSingle()
      if (fallbackJob?.id) {
        resolvedMunkakorId = fallbackJob.id
      }
    }

    // Vállalat nevének lekérése
    let companyName = "Vállalatunk"
    if (targetCompanyId) {
      const { data: comp } = await supabaseAdmin
        .from("companies")
        .select("name")
        .eq("id", targetCompanyId)
        .maybeSingle()
      if (comp?.name) companyName = comp.name
    }

    const palyazatiKod = generateTrackingCode()
    const berigenyNum =
      berigenyRaw && !isNaN(Number(berigenyRaw)) && Number(berigenyRaw) > 0
        ? Math.round(Number(berigenyRaw))
        : null

    // 4. Adatbázis bejegyzés létrehozása a hr_toborzas táblában
    const { error: dbError } = await supabaseAdmin.from("hr_toborzas").insert({
      allashirdetes_id: allashirdetesId || null,
      megpalyazott_munkakor_id: resolvedMunkakorId || null,
      nev: nev.trim(),
      email: email.trim(),
      telefon: telefon?.trim() || null,
      uzenet: uzenet?.trim() || null,
      linkedin_url: linkedinUrl?.trim() || null,
      berigeny: berigenyNum,
      kezdesi_ido: kezdesiIdo || null,
      forras: isVerifiedInternalEmployee ? "belso_palyazat" : forras || "karrieroldal",
      megpalyazott_terulet: megpalyazottTerulet?.trim() || null,
      palyazati_kod: palyazatiKod,
      cv_storage_path: uploadedCvPath,
      statusz: "uj",
      ...(targetCompanyId ? { company_id: targetCompanyId } : {}),
    })

    if (dbError) {
      console.error("Adatbázis hiba:", dbError)
      return {
        error: "Nem sikerült elmenteni a jelentkezést. Kérjük, próbálja újra később.",
      }
    }

    const positionName =
      postingTitle ||
      (megpalyazottTerulet
        ? `Nyitott jelentkezés (${megpalyazottTerulet})`
        : "Nyitott jelentkezés (Talent Pool)")

    // 5. Audit napló bejegyzés a cél-céghez kötve
    await supabaseAdmin.from("hr_esemeny_naplo").insert({
      modul: "toborzas",
      esemeny_tipus: "uj_jelentkezes",
      leiras: `Új jelentkezés érkezett a karrieroldalról (${companyName} — ${positionName}): ${nev} [${palyazatiKod}]`,
      celpont_id: resolvedMunkakorId,
      entitas_tipus: "hr_munkakor",
      felhasznalo_id: null,
      ...(targetCompanyId ? { company_id: targetCompanyId } : {}),
    })

    // 6. Visszaigazoló e-mail a pályázati azonosítóval és a hirdető céggel
    const emailHtml = `
      <div style="font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #334155;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="background-color: #0f766e; padding: 28px 36px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">Sikeres jelentkezés — ${companyName}</h1>
            <p style="color: #ccfbf1; margin: 6px 0 0 0; font-size: 14px;">Pályázati azonosító: <strong>${palyazatiKod}</strong></p>
          </div>
          <div style="padding: 36px;">
            <h2 style="margin-top: 0; color: #0f172a; font-size: 18px; font-weight: 600;">Kedves ${nev}!</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
              Köszönjük, hogy pályáztál a(z) <strong>${companyName}</strong> által meghirdetett <strong>${positionName}</strong> pozícióra. Pályázatod és önéletrajzod sikeresen megérkezett rendszerünkbe.
            </p>
            <div style="background-color: #f1f5f9; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
              <p style="margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Pályázatkövető azonosító (Reference ID)</p>
              <p style="margin: 0; font-size: 18px; font-weight: 700; color: #0f766e; font-family: monospace;">${palyazatiKod}</p>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #475569;">
                Ezzel az azonosítóval és az e-mail címeddel a karrieroldalon bármikor lekérdezheted a jelentkezésed aktuális státuszát.
              </p>
            </div>
            <p style="font-size: 14px; color: #64748b; margin: 0;">
              HR csapatunk hamarosan áttekinti az anyagodat és felveszi veled a kapcsolatot.
            </p>
          </div>
          <div style="background-color: #f8fafc; padding: 20px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="margin: 0; font-size: 13px; color: #64748b;">
              Üdvözlettel,<br><strong>${companyName} — HR & Toborzási Csapat</strong>
            </p>
          </div>
        </div>
      </div>
    `

    await sendNotificationEmail({
      to: email,
      subject: `Sikeres jelentkezés (${companyName}): ${positionName} [${palyazatiKod}]`,
      html: emailHtml,
      senderName: `${companyName} Karrier`,
    })

    revalidatePath("/hr/recruitment")
    revalidatePath("/hr/self-service/career")

    return {
      success: true,
      palyazatiKod,
      companyName,
      positionName,
    }
  } catch (err: any) {
    console.error("Jelentkezési hiba:", err)
    return { error: "Váratlan hiba történt. Kérjük, próbálja újra később." }
  }
}

/**
 * Jelölt pályázatkövető lekérdezése e-mail cím és pályázati kód (vagy csak e-mail cím) alapján
 */
export async function checkApplicationStatusAction(
  email: string,
  palyazatiKod?: string
) {
  if (!email || !email.trim()) {
    return { error: "Kérjük, adja meg a jelentkezéskor használt e-mail címét!" }
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = supabaseAdmin
    .from("hr_toborzas")
    .select(`
      id,
      nev,
      email,
      statusz,
      palyazati_kod,
      created_at,
      interju_idopont,
      interju_helyszin,
      megpalyazott_terulet,
      company_id,
      hr_allashirdetes ( cim ),
      hr_munkakor ( megnevezes )
    `)
    .ilike("email", email.trim())
    .order("created_at", { ascending: false })

  if (palyazatiKod && palyazatiKod.trim()) {
    query = query.ilike("palyazati_kod", palyazatiKod.trim())
  }

  const { data: rows, error } = await query.limit(5)

  if (error) {
    console.error("Hiba a pályázatstátusz lekérdezésekor:", error)
    return { error: "Hiba történt a lekérdezés során." }
  }

  if (!rows || rows.length === 0) {
    return {
      error:
        "Nem található pályázat a megadott e-mail címmel" +
        (palyazatiKod?.trim() ? " és pályázati azonosítóval." : "."),
    }
  }

  // Cégnevek feloldása
  const companyIds = Array.from(
    new Set(rows.map((r: any) => r.company_id).filter(Boolean))
  )
  const companyMap = new Map<string, string>()
  if (companyIds.length > 0) {
    const { data: comps } = await supabaseAdmin
      .from("companies")
      .select("id, name")
      .in("id", companyIds)
    for (const c of comps || []) {
      companyMap.set(c.id, c.name)
    }
  }

  const applications = rows.map((r: any) => {
    const hirdetes = Array.isArray(r.hr_allashirdetes)
      ? r.hr_allashirdetes[0]
      : r.hr_allashirdetes
    const munkakor = Array.isArray(r.hr_munkakor)
      ? r.hr_munkakor[0]
      : r.hr_munkakor
    return {
      id: r.id,
      nev: r.nev,
      palyazatiKod: r.palyazati_kod || "—",
      statusz: r.statusz || "uj",
      createdAt: r.created_at,
      interjuIdopont: r.interju_idopont,
      interjuHelyszin: r.interju_helyszin,
      companyName: r.company_id
        ? companyMap.get(r.company_id) || "Vállalat"
        : "Vállalat",
      positionTitle:
        hirdetes?.cim ||
        munkakor?.megnevezes ||
        (r.megpalyazott_terulet
          ? `Talent Pool (${r.megpalyazott_terulet})`
          : "Nyitott jelentkezés"),
    }
  })

  return { success: true, applications }
}
