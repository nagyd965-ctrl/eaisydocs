import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { getActiveCompanyIdServer } from "@/utils/company-server"

export interface CareerEmployeeData {
  nev: string
  email: string
  telefon: string
  munkakor: string
}

export interface CareerEmployeeContext {
  isAuthenticated: boolean
  userId: string | null
  activeCompanyId: string | null
  employeeCompanyIds: string[]
  employeeData: CareerEmployeeData | null
}

/**
 * Szerveroldali ellenőrzés a Karrierportálhoz (/karrier és /karrier/[id]):
 * Megállapítja, hogy a látogató bejelentkezett munkatárs-e, mely vállalat(ok)nál
 * dolgozik ténylegesen, és visszaadja az előtöltéshez szükséges dolgozói adatokat.
 * Külső (nem bejelentkezett) látogatók esetén employeeCompanyIds = [].
 */
export async function resolveCareerEmployeeContext(): Promise<CareerEmployeeContext> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        isAuthenticated: false,
        userId: null,
        activeCompanyId: null,
        employeeCompanyIds: [],
        employeeData: null,
      }
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const [
      activeCompanyId,
      { data: memberships },
      { data: adatlap },
      { data: jogviszony },
      { data: profile },
    ] = await Promise.all([
      getActiveCompanyIdServer(),
      supabaseAdmin
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id),
      supabaseAdmin
        .from("hr_dolgozo_adatlap")
        .select("*, hr_munkakor(id, megnevezes, company_id)")
        .eq("id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("hr_jogviszony")
        .select("company_id, hr_beosztas(hr_munkakor(id, megnevezes, company_id))")
        .eq("dolgozo_id", user.id)
        .is("kilepes_datuma", null)
        .maybeSingle(),
      supabaseAdmin
        .from("felhasznalo_profil")
        .select("*")
        .eq("id", user.id)
        .maybeSingle(),
    ])

    const companyIdSet = new Set<string>()

    for (const m of memberships || []) {
      if (m.company_id) companyIdSet.add(m.company_id)
    }

    const adatlapMk = Array.isArray((adatlap as any)?.hr_munkakor)
      ? (adatlap as any)?.hr_munkakor[0]
      : (adatlap as any)?.hr_munkakor

    if ((adatlap as any)?.company_id) {
      companyIdSet.add((adatlap as any).company_id)
    }
    if (adatlapMk?.company_id) {
      companyIdSet.add(adatlapMk.company_id)
    }

    if ((jogviszony as any)?.company_id) {
      companyIdSet.add((jogviszony as any).company_id)
    }
    const beosztasArr = Array.isArray((jogviszony as any)?.hr_beosztas)
      ? (jogviszony as any)?.hr_beosztas
      : (jogviszony as any)?.hr_beosztas
      ? [(jogviszony as any).hr_beosztas]
      : []
    const jogviszonyMk = Array.isArray(beosztasArr[0]?.hr_munkakor)
      ? beosztasArr[0]?.hr_munkakor[0]
      : beosztasArr[0]?.hr_munkakor
    if (jogviszonyMk?.company_id) {
      companyIdSet.add(jogviszonyMk.company_id)
    }

    if ((profile as any)?.company_id) {
      companyIdSet.add((profile as any).company_id)
    }

    // Ha a felhasználónak van dolgozói adatlapja vagy belső profilja és aktív cégválasztása
    if (activeCompanyId && (adatlap || profile?.hr_szerepkor || profile?.szerepkor === "rendszergazda")) {
      companyIdSet.add(activeCompanyId)
    }

    const employeeCompanyIds = Array.from(companyIdSet)

    const nev =
      (profile as any)?.nev ||
      (adatlap as any)?.nev ||
      user.user_metadata?.full_name ||
      user.email ||
      ""
    const email =
      (profile as any)?.email ||
      (adatlap as any)?.email ||
      user.email ||
      ""
    const telefon =
      (adatlap as any)?.telefonszam ||
      (adatlap as any)?.telefon ||
      (profile as any)?.telefonszam ||
      (profile as any)?.telefon ||
      user.phone ||
      ""
    const munkakor =
      adatlapMk?.megnevezes ||
      jogviszonyMk?.megnevezes ||
      "Belső munkatárs"

    return {
      isAuthenticated: employeeCompanyIds.length > 0,
      userId: user.id,
      activeCompanyId: activeCompanyId || employeeCompanyIds[0] || null,
      employeeCompanyIds,
      employeeData:
        employeeCompanyIds.length > 0
          ? {
              nev,
              email,
              telefon,
              munkakor,
            }
          : null,
    }
  } catch (err) {
    console.error("Hiba a karrier dolgozói kontextus feloldásakor:", err)
    return {
      isAuthenticated: false,
      userId: null,
      activeCompanyId: null,
      employeeCompanyIds: [],
      employeeData: null,
    }
  }
}
