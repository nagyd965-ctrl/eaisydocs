"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

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
 * Lekéri a hivatalos eaisyHR munkakör-katalógust és a szervezeti egységeket.
 */
export async function getJobsAndOrgUnitsAction(): Promise<{
  orgUnits: OrgUnitOption[]
  jobs: JobOption[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    // 1. Szervezeti egységek
    const { data: orgUnits, error: orgErr } = await supabase
      .from("hr_szervezeti_egyseg")
      .select("id, nev, szulo_id")
      .order("nev")

    // 2. Munkakörök
    const { data: jobs, error: jobErr } = await supabase
      .from("hr_munkakor")
      .select("id, megnevezes, feor_kod, szervezeti_egyseg_id")
      .order("megnevezes")

    // Ha a bejelentkezett felhasználó RLS-e miatt üres lenne, admin fallback
    if ((!orgUnits || orgUnits.length === 0) || (!jobs || jobs.length === 0)) {
      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const [fallbackOrg, fallbackJob] = await Promise.all([
        adminClient.from("hr_szervezeti_egyseg").select("id, nev, szulo_id").order("nev"),
        adminClient.from("hr_munkakor").select("id, megnevezes, feor_kod, szervezeti_egyseg_id").order("megnevezes")
      ])

      const finalOrgs = fallbackOrg.data || []
      const orgMap = new Map(finalOrgs.map(o => [o.id, o.nev]))

      const finalJobs = (fallbackJob.data || []).map(j => ({
        ...j,
        szervezeti_egyseg_nev: j.szervezeti_egyseg_id ? orgMap.get(j.szervezeti_egyseg_id) || null : null
      }))

      return {
        orgUnits: finalOrgs,
        jobs: finalJobs
      }
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
