"use server"

import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer } from "@/utils/company-server"

export interface OrgUnitOption {
  id: string
  nev: string
  szulo_id?: string | null
}

export interface JobOption {
  id: string
  megnevezes: string
  feor_kod?: string | null
  szervezeti_egyseg_id?: string | null
  szervezeti_egyseg_nev?: string | null
}

/**
 * Lekéri az aktív vállalat hivatalos eaisyHR munkakör-katalógusát és szervezeti egységeit.
 */
export async function getJobsAndOrgUnitsAction(): Promise<{
  orgUnits: OrgUnitOption[]
  jobs: JobOption[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { orgUnits: [], jobs: [], error: "Bejelentkezés szükséges." }
    }

    const activeCompanyId = await getActiveCompanyIdServer()
    if (!activeCompanyId) {
      return { orgUnits: [], jobs: [] }
    }

    // 1. Szervezeti egységek (aktív cégre szűrve)
    const { data: orgUnits, error: orgErr } = await supabase
      .from("hr_szervezeti_egyseg")
      .select("id, nev, szulo_id")
      .eq("company_id", activeCompanyId)
      .order("nev")

    if (orgErr) {
      throw new Error(orgErr.message)
    }

    // 2. Munkakörök (aktív cégre szűrve)
    const { data: jobs, error: jobErr } = await supabase
      .from("hr_munkakor")
      .select("id, megnevezes, feor_kod, szervezeti_egyseg_id")
      .eq("company_id", activeCompanyId)
      .order("megnevezes")

    if (jobErr) {
      throw new Error(jobErr.message)
    }

    const orgMap = new Map((orgUnits || []).map(o => [o.id, o.nev]))
    const enrichedJobs: JobOption[] = (jobs || []).map(j => ({
      ...j,
      szervezeti_egyseg_nev: j.szervezeti_egyseg_id ? orgMap.get(j.szervezeti_egyseg_id) || null : null
    }))

    return {
      orgUnits: orgUnits || [],
      jobs: enrichedJobs
    }
  } catch (err: any) {
    console.error("Hiba munkakörök és szervezeti egységek lekérésekor:", err)
    return {
      orgUnits: [],
      jobs: [],
      error: err.message
    }
  }
}
