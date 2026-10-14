"use server"

import { createClient } from "@/utils/supabase/server"
import { createEaisyBillClient } from "@/utils/supabase/eaisybill"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { buildHtmlEmail, sendNotificationEmail } from "@/utils/mailer"
import { revalidatePath } from "next/cache"
import { getActiveCompanyIdServer, getActiveCompanyServer } from "@/utils/company-server"
import { getBaseUrl } from "@/utils/url"
import crypto from "crypto"

export interface EaisyBooksEmployeeItem {
  id: string
  name: string
  firstName: string
  lastName: string
  birthName?: string | null
  birthPlace?: string | null
  birthDate?: string | null
  mothersName?: string | null
  gender?: string | null
  nationality?: string | null
  idCardNumber?: string | null
  tajNumber?: string | null
  taxId?: string | null
  bankAccount?: string | null
  address?: any
  email: string
  phone: string
  status: "already_imported" | "importable"
  existingUserId?: string
  maskedTaj: string
  maskedTaxId: string
  // Foglalkoztatási adatok (employments)
  jobTitle: string
  feorCode: string
  department?: string | null
  startDate: string
  weeklyHours: number
  employmentType: string
  baseSalary?: number | null
}

export interface GetEaisyBooksEmployeesResult {
  success: boolean
  companyName?: string
  eaisybillCompanyId?: string
  employees?: EaisyBooksEmployeeItem[]
  error?: string
}

export interface ImportEaisyBooksEmployeeInput {
  id: string // eaisyBooks employee UUID
  name: string
  email: string // akár a HR által megadott/módosított email
  phone?: string
  jobTitle?: string
  feorCode?: string
  department?: string
  startDate?: string
  weeklyHours?: number
  employmentType?: string
  baseSalary?: number | null
  tajNumber?: string | null
  taxId?: string | null
  bankAccount?: string | null
  idCardNumber?: string | null
  birthName?: string | null
  birthPlace?: string | null
  birthDate?: string | null
  mothersName?: string | null
  nationality?: string | null
  address?: any
}

export interface ImportEaisyBooksEmployeesResult {
  success: boolean
  importedCount?: number
  invitedCount?: number
  error?: string
}

function maskIdentifier(val: string | null | undefined, visibleCount = 3): string {
  if (!val) return "—"
  const clean = val.replace(/\s+/g, "")
  if (clean.length <= visibleCount) return clean
  return clean.slice(0, visibleCount) + "*".repeat(Math.max(3, clean.length - visibleCount))
}

const toByteaHex = (str: string) => "\\x" + Buffer.from(str, "utf-8").toString("hex")

/**
 * Lekéri az aktív céghez tartozó foglalkoztatottakat az eaisyBooks bérszámfejtésből,
 * és összeveti az eaisyHR meglévő állományával.
 */
export async function getEaisyBooksPayrollEmployeesAction(
  targetCompanyId?: string
): Promise<GetEaisyBooksEmployeesResult> {
  try {
    const docsClient = await createClient()
    const { data: { user } } = await docsClient.auth.getUser()

    if (!user) {
      return { success: false, error: "Nincs bejelentkezett felhasználó." }
    }

    // 1. Cég meghatározása
    let activeCompany = null
    if (targetCompanyId) {
      const { data } = await docsClient.from("companies").select("*").eq("id", targetCompanyId).maybeSingle()
      activeCompany = data
    } else {
      activeCompany = await getActiveCompanyServer()
    }

    if (!activeCompany) {
      return { success: false, error: "Nincs kiválasztott aktív vállalat." }
    }

    const billClient = createEaisyBillClient()

    // 2. eaisyBill Company ID feloldása
    let eaisybillCompanyId = activeCompany.eaisybill_company_id

    if (!eaisybillCompanyId) {
      // Megpróbáljuk adószám alapján feloldani az eaisyBooks adatbázisban
      const cleanTax = activeCompany.tax_number?.replace(/[-\s]/g, "")
      if (cleanTax && cleanTax.length >= 8) {
        const { data: matchedComp } = await billClient
          .from("companies")
          .select("id")
          .ilike("tax_number", `${cleanTax.slice(0, 8)}%`)
          .maybeSingle()

        if (matchedComp?.id) {
          eaisybillCompanyId = matchedComp.id
          // Elmentjük a kapcsolatot
          const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
          await adminClient
            .from("companies")
            .update({ eaisybill_company_id: matchedComp.id })
            .eq("id", activeCompany.id)
        }
      }
    }

    if (!eaisybillCompanyId) {
      return {
        success: false,
        companyName: activeCompany.name,
        error: "A cég még nincs összekapcsolva eaisyBooks / eaisyBill vállalattal. Kérjük, először ellenőrizd az adószámot a Cégbeállításokban!",
      }
    }

    // 3. Dolgozók lekérése az eaisyBooks bérszámfejtésből (accounty_employees)
    const { data: billEmployees, error: empErr } = await billClient
      .from("accounty_employees")
      .select(`
        id,
        company_id,
        first_name,
        last_name,
        birth_name,
        birth_place,
        birth_date,
        mothers_name,
        gender,
        nationality,
        taj_number,
        tax_id,
        id_card_number,
        address,
        temp_address,
        email,
        phone,
        bank_account,
        iban,
        status,
        avatar_url
      `)
      .eq("company_id", eaisybillCompanyId)
      .order("last_name", { ascending: true })

    if (empErr) {
      console.error("[eaisyBooks] Hiba a foglalkoztatottak lekérésekor:", empErr)
      return { success: false, error: "Nem sikerült lekérni a dolgozókat: " + empErr.message }
    }

    if (!billEmployees || billEmployees.length === 0) {
      return {
        success: true,
        companyName: activeCompany.name,
        eaisybillCompanyId,
        employees: [],
      }
    }

    // 4. Foglalkoztatási jogviszonyok lekérése (accounty_employments)
    const empIds = billEmployees.map((e) => e.id)
    const { data: billEmployments } = await billClient
      .from("accounty_employments")
      .select(`
        id,
        employee_id,
        job_code,
        job_title,
        feor_code,
        employment_type,
        start_date,
        end_date,
        weekly_hours,
        base_salary,
        salary_type,
        department
      `)
      .eq("company_id", eaisybillCompanyId)
      .in("employee_id", empIds)

    const employmentsByEmployeeId = new Map<string, any>()
    billEmployments?.forEach((empl) => {
      // Ha több van, a legutóbbit vagy az aktívat vesszük
      employmentsByEmployeeId.set(empl.employee_id, empl)
    })

    // 5. eaisyHR helyi tagok és profilok lekérése (Deduplikációhoz)
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: localMembers } = await supabaseAdmin
      .from("company_members")
      .select("user_id")
      .eq("company_id", activeCompany.id)

    const localMemberUserIds = new Set((localMembers || []).map((m) => m.user_id))
    const safeMemberIds = Array.from(localMemberUserIds)

    const { data: localProfiles } = await supabaseAdmin
      .from("felhasznalo_profil")
      .select("id, nev, email, eaisybill_employee_id, eaisybill_user_id")
      .in("id", safeMemberIds.length > 0 ? safeMemberIds : ["00000000-0000-0000-0000-000000000000"])

    const { data: localAdatlaps } = await supabaseAdmin
      .from("hr_dolgozo_adatlap")
      .select("id, eaisybill_employee_id")
      .eq("company_id", activeCompany.id)

    const importedEmployeeIds = new Set<string>()
    const existingEmails = new Map<string, string>()

    localProfiles?.forEach((p) => {
      if (p.eaisybill_employee_id) importedEmployeeIds.add(p.eaisybill_employee_id)
      if (p.email) existingEmails.set(p.email.toLowerCase(), p.id)
    })

    localAdatlaps?.forEach((a) => {
      if (a.eaisybill_employee_id) importedEmployeeIds.add(a.eaisybill_employee_id)
    })

    // 6. Eredmény lista összeállítása
    const resultList: EaisyBooksEmployeeItem[] = billEmployees.map((be) => {
      const fullName = `${be.last_name || ""} ${be.first_name || ""}`.trim()
      const empl = employmentsByEmployeeId.get(be.id)
      const cleanEmail = be.email ? be.email.trim().toLowerCase() : ""

      let status: "already_imported" | "importable" = "importable"
      let existingUserId: string | undefined = undefined

      if (importedEmployeeIds.has(be.id)) {
        status = "already_imported"
      } else if (cleanEmail && existingEmails.has(cleanEmail)) {
        status = "already_imported"
        existingUserId = existingEmails.get(cleanEmail)
      }

      return {
        id: be.id,
        name: fullName || "Névtelen dolgozó",
        firstName: be.first_name || "",
        lastName: be.last_name || "",
        birthName: be.birth_name,
        birthPlace: be.birth_place,
        birthDate: be.birth_date,
        mothersName: be.mothers_name,
        gender: be.gender,
        nationality: be.nationality || "Magyar",
        idCardNumber: be.id_card_number,
        tajNumber: be.taj_number,
        taxId: be.tax_id,
        bankAccount: be.bank_account,
        address: be.address,
        email: be.email || "",
        phone: be.phone || "",
        status,
        existingUserId,
        maskedTaj: maskIdentifier(be.taj_number, 5),
        maskedTaxId: maskIdentifier(be.tax_id, 4),
        jobTitle: empl?.job_title || "Munkatárs",
        feorCode: empl?.feor_code || "",
        department: empl?.department || null,
        startDate: empl?.start_date || new Date().toISOString().split("T")[0],
        weeklyHours: Number(empl?.weekly_hours) || 40,
        employmentType: empl?.employment_type || "munkaviszony",
        baseSalary: empl?.base_salary ? Number(empl.base_salary) : null,
      }
    })

    return {
      success: true,
      companyName: activeCompany.name,
      eaisybillCompanyId,
      employees: resultList,
    }
  } catch (err: any) {
    console.error("[eaisyBooks] Bérszámfejtés dolgozók lekérdezési hiba:", err)
    return { success: false, error: err.message || "Nem sikerült lekérni az eaisyBooks dolgozókat." }
  }
}

/**
 * Kiválasztott eaisyBooks bérszámfejtési foglalkoztatottak kötegelt importálása az eaisyHR-be.
 */
export async function importEaisyBooksPayrollEmployeesAction(input: {
  targetCompanyId: string
  selectedEmployees: ImportEaisyBooksEmployeeInput[]
  sendInviteEmail: boolean
}): Promise<ImportEaisyBooksEmployeesResult> {
  try {
    const { targetCompanyId, selectedEmployees, sendInviteEmail } = input

    if (!targetCompanyId || !selectedEmployees || selectedEmployees.length === 0) {
      return { success: false, error: "Nincs kijelölt importálandó foglalkoztatott." }
    }

    const docsClient = await createClient()
    const { data: { user } } = await docsClient.auth.getUser()
    if (!user) {
      return { success: false, error: "Nincs bejelentkezett felhasználó." }
    }

    const { data: company } = await docsClient
      .from("companies")
      .select("id, name")
      .eq("id", targetCompanyId)
      .single()

    if (!company) {
      return { success: false, error: "A megadott cég nem található." }
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const appUrl = getBaseUrl()
    const redirectUrl = `${appUrl}/auth/callback?next=/auth/set-password`

    let importedCount = 0
    let invitedCount = 0

    // Összes meglévő auth felhasználó lekérése e-mail alapú feloldáshoz
    const { data: existingUserList } = await supabaseAdmin.auth.admin.listUsers()
    const emailToAuthUserMap = new Map(
      (existingUserList?.users || []).map((u) => [u.email?.toLowerCase(), u])
    )

    for (const emp of selectedEmployees) {
      try {
        const rawEmail = emp.email?.trim()
        const isRealEmail = rawEmail && rawEmail.includes("@") && !rawEmail.endsWith("@internal.eaisyhr.hu")
        
        // Ha nincs valódi e-mail, belső placeholder címet generálunk
        const emailToUse = isRealEmail
          ? rawEmail.toLowerCase()
          : `${emp.name.toLowerCase().replace(/[^a-z0-9]/g, ".") || "dolgozo"}.${emp.id.slice(0, 6)}@internal.eaisyhr.hu`

        let finalUserId: string | null = null
        let isExistingUser = false

        // 1. Felhasználói fiók ellenőrzése / létrehozása
        const matchedAuthUser = emailToAuthUserMap.get(emailToUse)
        if (matchedAuthUser) {
          finalUserId = matchedAuthUser.id
          isExistingUser = true
        } else {
          const tempPassword = crypto.randomBytes(16).toString("hex") + "A1!"
          const { data: newAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: emailToUse,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              nev: emp.name,
              source: "eaisybooks_payroll_import",
            },
          })

          if (authError || !newAuth.user) {
            console.error(`[eaisyBooks] Auth létrehozási hiba (${emp.name}):`, authError?.message)
            continue
          }
          finalUserId = newAuth.user.id
          emailToAuthUserMap.set(emailToUse, newAuth.user)
        }

        // Kis várakozás a profil triggerhez
        await new Promise((res) => setTimeout(res, 200))

        // 2. felhasznalo_profil frissítése
        const { data: existingProf } = await supabaseAdmin
          .from("felhasznalo_profil")
          .select("hr_szerepkor, elerheto_modulok")
          .eq("id", finalUserId)
          .single()

        const currentModules = Array.isArray(existingProf?.elerheto_modulok)
          ? existingProf.elerheto_modulok
          : []
        const updatedModules = Array.from(new Set([...currentModules, "hr"]))

        await supabaseAdmin
          .from("felhasznalo_profil")
          .update({
            nev: emp.name,
            email: emailToUse,
            telefon: emp.phone || null,
            hr_szerepkor: existingProf?.hr_szerepkor || "munkavallalo",
            elerheto_modulok: updatedModules,
            eaisybill_employee_id: emp.id,
            sync_source: "eaisybill",
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", finalUserId)

        // 3. company_members hozzárendelés az aktív céghez
        await supabaseAdmin
          .from("company_members")
          .upsert(
            {
              company_id: targetCompanyId,
              user_id: finalUserId,
              role: "member",
              hr_szerepkor: existingProf?.hr_szerepkor || "munkavallalo",
            },
            { onConflict: "company_id,user_id" }
          )

        // 4. hr_dolgozo_adatlap rögzítése
        const addressObj = emp.address || {}
        const formattedAddress = typeof addressObj === "object"
          ? [addressObj.zip, addressObj.city, addressObj.street].filter(Boolean).join(", ")
          : typeof addressObj === "string" ? addressObj : null

        const { error: adatlapErr } = await supabaseAdmin
          .from("hr_dolgozo_adatlap")
          .upsert(
            {
              id: finalUserId,
              company_id: targetCompanyId,
              szuletesi_datum: emp.birthDate || null,
              szuletesi_ido: emp.birthDate || null,
              anyja_neve: emp.mothersName || null,
              telefonszam: emp.phone || null,
              szerzodes_tipusa: emp.employmentType === "megbizas" ? "megbízási" : "határozatlan",
              lakcim: formattedAddress,
              eaisybill_employee_id: emp.id,
            },
            { onConflict: "id" }
          )

        if (adatlapErr) {
          console.error(`[eaisyBooks] Hiba adatlap rögzítésekor (${emp.name}):`, adatlapErr)
          continue
        }

        // 5. hr_dolgozo_titkos_adat rögzítése titkosítva
        const taj = emp.tajNumber || ""
        const taxId = emp.taxId || ""
        const bank = emp.bankAccount || ""
        const brutto = emp.baseSalary ? String(emp.baseSalary) : ""
        const bruttoNum = Number(emp.baseSalary || 0)
        const netto = bruttoNum > 0 ? String(Math.round(bruttoNum * 0.665)) : ""

        if (taj || taxId || bank || brutto) {
          const { error: secretErr } = await supabaseAdmin
            .from("hr_dolgozo_titkos_adat")
            .upsert(
              {
                dolgozo_id: finalUserId,
                taj_szam_titkositott: taj ? toByteaHex(taj) : null,
                adoazonosito_titkositott: taxId ? toByteaHex(taxId) : null,
                bankszamla_titkositott: bank ? toByteaHex(bank) : null,
                brutto_ber_titkositott: brutto ? toByteaHex(brutto) : null,
                netto_ber_titkositott: netto ? toByteaHex(netto) : null,
                company_id: targetCompanyId,
              },
              { onConflict: "dolgozo_id" }
            )
          if (secretErr) {
            console.error(`[eaisyBooks] Titkos adat mentési hiba (${emp.name}):`, secretErr)
          }
        }

        // 6. Munkakör feloldása vagy automatikus létrehozása (hr_munkakor)
        let munkakorId: string | null = null
        if (emp.jobTitle && emp.jobTitle.trim()) {
          const cleanJobTitle = emp.jobTitle.trim()
          const { data: existingJob } = await supabaseAdmin
            .from("hr_munkakor")
            .select("id")
            .eq("company_id", targetCompanyId)
            .ilike("megnevezes", cleanJobTitle)
            .maybeSingle()

          if (existingJob?.id) {
            munkakorId = existingJob.id
          } else {
            const { data: newJob, error: jobErr } = await supabaseAdmin
              .from("hr_munkakor")
              .insert({
                company_id: targetCompanyId,
                megnevezes: cleanJobTitle,
                feor_kod: emp.feorCode ? emp.feorCode.trim() : null,
              })
              .select("id")
              .single()

            if (newJob?.id) {
              munkakorId = newJob.id
            } else if (jobErr) {
              console.error(`[eaisyBooks] Munkakor létrehozási hiba (${cleanJobTitle}):`, jobErr)
            }
          }
        }

        // 7. Jogviszony és Beosztás rögzítése
        const { data: existingJogv } = await supabaseAdmin
          .from("hr_jogviszony")
          .select("id")
          .eq("dolgozo_id", finalUserId)
          .eq("company_id", targetCompanyId)
          .maybeSingle()

        let jogviszonyId = existingJogv?.id
        if (!jogviszonyId) {
          const { data: newJogv, error: jogvErr } = await supabaseAdmin
            .from("hr_jogviszony")
            .insert({
              dolgozo_id: finalUserId,
              company_id: targetCompanyId,
              belepes_datuma: emp.startDate || new Date().toISOString().split("T")[0],
              tipus: emp.employmentType === "megbizas" ? "megbizasi" : "teljes_munkaido",
            })
            .select("id")
            .single()

          if (jogvErr) {
            console.error(`[eaisyBooks] Jogviszony hiba (${emp.name}):`, jogvErr)
          } else {
            jogviszonyId = newJogv?.id
          }
        }

        if (jogviszonyId && munkakorId) {
          const weekly = Number(emp.weeklyHours) || 40
          const fte = Math.round((weekly / 40) * 100) / 100
          const { error: beosztasErr } = await supabaseAdmin
            .from("hr_beosztas")
            .insert({
              jogviszony_id: jogviszonyId,
              munkakor_id: munkakorId,
              company_id: targetCompanyId,
              ervenyes_tol: emp.startDate || new Date().toISOString().split("T")[0],
              munkaviszony_tipusa: emp.employmentType === "megbizas" ? "megbízási" : "teljes_munkaido",
              munkaido_fte: fte,
              fte: fte,
            })
          if (beosztasErr) {
            console.error(`[eaisyBooks] Beosztás hiba (${emp.name}):`, beosztasErr)
          }
        }

        importedCount++

        // 8. Meghívó e-mail küldése Brevo-n keresztül (ha be van kapcsolva és valódi e-mail cím)
        if (sendInviteEmail && isRealEmail) {
          try {
            const { data: linkData } = isExistingUser
              ? await supabaseAdmin.auth.admin.generateLink({
                  type: "recovery",
                  email: emailToUse,
                  options: {
                    redirectTo: redirectUrl,
                  },
                })
              : await supabaseAdmin.auth.admin.generateLink({
                  type: "invite",
                  email: emailToUse,
                  options: {
                    data: { name: emp.name, source: "eaisybooks_payroll_import" },
                    redirectTo: redirectUrl,
                  },
                })

            const tokenHash = linkData?.properties?.hashed_token
            const verificationType = linkData?.properties?.verification_type || (isExistingUser ? "recovery" : "invite")
            const inviteUrl = tokenHash
              ? `${appUrl}/auth/callback?token_hash=${tokenHash}&type=${verificationType}&next=/auth/set-password`
              : linkData?.properties?.action_link

            if (inviteUrl) {
              const emailHtml = buildHtmlEmail(
                "Meghívás az eaisyHR rendszerébe",
                `Kedves <strong>${emp.name}</strong>!<br/><br/>A(z) <strong>${company.name}</strong> vállalathoz kapcsolódóan létrehoztuk a munkavállalói fiókodat az eaisyHR rendszerben (<a href="${appUrl}">${appUrl}</a>). Az alábbi gombra kattintva beállíthatod a jelszavadat a dolgozói önkiszolgáló portálhoz.`,
                [
                  { label: "Munkáltató", value: company.name },
                  { label: "Munkakör", value: emp.jobTitle || "Munkatárs" },
                  { label: "E-mail cím", value: emailToUse },
                ],
                "Fiók aktiválása és jelszó beállítása",
                inviteUrl
              )

              await sendNotificationEmail({
                to: emailToUse,
                subject: `Meghívás az eaisyHR rendszerébe – ${company.name}`,
                html: emailHtml,
                senderName: "eaisyHR Rendszer",
              })
              invitedCount++
            }
          } catch (emailErr) {
            console.error(`[eaisyBooks] Hiba az aktivációs e-mail küldésekor (${emailToUse}):`, emailErr)
          }
        }

        // 9. Audit naplózás
        await supabaseAdmin.from("hr_esemeny_naplo").insert({
          entitas_tipus: "hr_dolgozo_adatlap",
          entitas_id: finalUserId,
          esemeny_tipus: "dolgozo_letrehozva",
          leiras: `Foglalkoztatott sikeresen importálva eaisyBooks bérszámfejtésből: ${emp.name}`,
          company_id: targetCompanyId,
          user_id: user.id,
        })
      } catch (itemErr: any) {
        console.error(`[eaisyBooks] Hiba dolgozó importálásakor (${emp.name}):`, itemErr)
      }
    }

    revalidatePath("/hr/admin")
    revalidatePath("/hr/settings")
    revalidatePath("/hr/organization")

    return {
      success: true,
      importedCount,
      invitedCount,
    }
  } catch (err: any) {
    console.error("[eaisyBooks] Importálási hiba:", err)
    return { success: false, error: err.message || "Nem sikerült az importálás." }
  }
}
