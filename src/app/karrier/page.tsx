import { Suspense } from "react"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import {
  CareerPortalClient,
  CareerCompanyItem,
  CareerPostingItem,
} from "@/components/hr/career-portal-client"
import { resolveCareerEmployeeContext } from "@/utils/hr/career-auth"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Karrier és Nyitott Pozíciók | eaisyHR",
}

export default async function KarrierPage({
  searchParams,
}: {
  searchParams?: Promise<{ company?: string; scope?: string }>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [empCtx, { data: rawCompanies }, { data: rawPostings }] =
    await Promise.all([
      resolveCareerEmployeeContext(),
      supabaseAdmin
        .from("companies")
        .select("id, name, address, logo_url, career_presentation")
        .order("name"),
      supabaseAdmin
        .from("hr_allashirdetes")
        .select(`
          id,
          cim,
          munkakor_id,
          rovid_leiras,
          nyitva_tol,
          jelentkezesi_hatarido,
          company_id,
          munkavegzes_modja,
          helyszin,
          foglalkoztatas_tipusa,
          tapasztalati_szint,
          reszleg_nev,
          bersav_min,
          bersav_max,
          bersav_publikus,
          publikus,
          is_internal,
          hr_munkakor (
            id,
            megnevezes,
            company_id,
            hr_szervezeti_egyseg:szervezeti_egyseg_id ( nev )
          )
        `)
        .eq("aktiv", true)
        .order("created_at", { ascending: false }),
    ])

  const companies: CareerCompanyItem[] = (rawCompanies || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    address: c.address || null,
    logo_url: c.logo_url || null,
    career_presentation: c.career_presentation || null,
  }))

  const companyMap = new Map<string, CareerCompanyItem>()
  for (const c of companies) {
    companyMap.set(c.id, c)
  }

  const employeeCompanySet = new Set(empCtx.employeeCompanyIds)

  const postings: CareerPostingItem[] = []

  for (const p of (rawPostings as any[]) || []) {
    const munkakor = Array.isArray(p.hr_munkakor)
      ? p.hr_munkakor[0]
      : p.hr_munkakor
    const orgUnit = Array.isArray(munkakor?.hr_szervezeti_egyseg)
      ? munkakor.hr_szervezeti_egyseg[0]
      : munkakor?.hr_szervezeti_egyseg

    const isInternal = Boolean(p.is_internal)
    const isPublic = Boolean(p.publikus)

    const resolvedCompanyId =
      p.company_id ||
      munkakor?.company_id ||
      (isInternal
        ? empCtx.activeCompanyId || empCtx.employeeCompanyIds[0] || null
        : companies[0]?.id || null)

    // Szigorú biztonsági szűrés szerveroldalon:
    // 1. Belső hirdetést (is_internal = true) KIZÁRÓLAG az adott cég igazolt, bejelentkezett dolgozója kaphat meg.
    // 2. Külső látogató ("sima ember") csak publikus, nem belső hirdetést láthat.
    if (isInternal) {
      if (
        !empCtx.isAuthenticated ||
        !resolvedCompanyId ||
        !employeeCompanySet.has(resolvedCompanyId)
      ) {
        continue
      }
    } else if (!isPublic) {
      continue
    }

    const comp = resolvedCompanyId ? companyMap.get(resolvedCompanyId) : null

    postings.push({
      id: p.id,
      cim: p.cim,
      munkakor_id: p.munkakor_id,
      rovid_leiras: p.rovid_leiras || null,
      nyitva_tol: p.nyitva_tol || null,
      jelentkezesi_hatarido: p.jelentkezesi_hatarido || null,
      company_id: resolvedCompanyId,
      company_name: comp?.name || "Vállalat",
      company_address: comp?.address || null,
      department: p.reszleg_nev || orgUnit?.nev || "Általános",
      munkakor_nev: munkakor?.megnevezes || p.cim,
      munkavegzes_modja: p.munkavegzes_modja || "hibrid",
      helyszin: p.helyszin || comp?.address || "Budapest",
      foglalkoztatas_tipusa: p.foglalkoztatas_tipusa || "teljes_munkaido",
      tapasztalati_szint: p.tapasztalati_szint || "medior",
      bersav_min: p.bersav_min || null,
      bersav_max: p.bersav_max || null,
      bersav_publikus: !!p.bersav_publikus,
      is_internal: isInternal,
      publikus: isPublic,
    })
  }

  const isInternalRequested = resolvedSearchParams?.scope === "internal"
  const initialCompanyId =
    resolvedSearchParams?.company ||
    (isInternalRequested
      ? empCtx.activeCompanyId || empCtx.employeeCompanyIds[0] || null
      : null)

  const initialScope: "internal" | "public" =
    isInternalRequested && empCtx.employeeCompanyIds.length > 0
      ? "internal"
      : "public"

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CareerPortalClient
        postings={postings}
        companies={companies}
        initialCompanyId={initialCompanyId}
        initialScope={initialScope}
        employeeCompanyIds={empCtx.employeeCompanyIds}
        employeeData={empCtx.employeeData}
      />
    </Suspense>
  )
}
