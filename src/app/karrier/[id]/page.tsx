import { createClient as createAdminClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  Building2,
  ArrowRight,
  Lock,
} from "lucide-react"
import { ApplicationForm } from "./application-form"
import { RichTextContent } from "@/components/rich-text-content"
import { CareerShareButton } from "@/components/hr/career-share-button"
import {
  WORK_MODE_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  SENIORITY_LABELS,
  formatSalaryBand,
} from "@/utils/hr/career-constants"
import { resolveCareerEmployeeContext } from "@/utils/hr/career-auth"

export const dynamic = "force-dynamic"

export default async function HirdetesReszletekPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ scope?: string }>
}) {
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [resolvedParams, resolvedSearchParams, empCtx] = await Promise.all([
    params,
    searchParams ? searchParams : Promise.resolve({} as { scope?: string }),
    resolveCareerEmployeeContext(),
  ])
  const { id } = resolvedParams

  const { data: hirdetes, error } = await supabaseAdmin
    .from("hr_allashirdetes")
    .select(`
      *,
      hr_munkakor (
        id,
        megnevezes,
        company_id,
        feladatok_es_hataskorok,
        elvart_kompetenciak,
        hr_szervezeti_egyseg:szervezeti_egyseg_id ( nev )
      )
    `)
    .eq("id", id)
    .eq("aktiv", true)
    .single()
    .returns<any>()

  if (error) {
    console.error("Supabase hiba a hirdetes lekeresekor:", error)
  }

  if (!hirdetes || (!hirdetes.publikus && !hirdetes.is_internal)) {
    notFound()
  }

  const munkakor = Array.isArray(hirdetes.hr_munkakor)
    ? hirdetes.hr_munkakor[0]
    : hirdetes.hr_munkakor
  const orgUnit = Array.isArray(munkakor?.hr_szervezeti_egyseg)
    ? munkakor.hr_szervezeti_egyseg[0]
    : munkakor?.hr_szervezeti_egyseg

  const resolvedCompanyId =
    hirdetes.company_id ||
    munkakor?.company_id ||
    (hirdetes.is_internal
      ? empCtx.activeCompanyId || empCtx.employeeCompanyIds[0] || null
      : null)

  // Szigorú jogosultság-ellenőrzés: a látogató valóban az adott cég bejelentkezett dolgozója-e
  const isEmployeeOfCompany = Boolean(
    empCtx.isAuthenticated &&
      resolvedCompanyId &&
      empCtx.employeeCompanyIds.includes(resolvedCompanyId)
  )

  // Ha kizárólag belső hirdetés (is_internal = true és publikus = false),
  // külső látogató ("sima ember") SOHA nem nyithatja meg!
  if (hirdetes.is_internal && !hirdetes.publikus && !isEmployeeOfCompany) {
    notFound()
  }

  const isInternalContext =
    isEmployeeOfCompany &&
    (Boolean(hirdetes.is_internal) || resolvedSearchParams?.scope === "internal")

  // Hirdető cég lekérése
  let company: {
    id: string
    name: string
    address?: string | null
    career_presentation?: any | null
  } | null = null
  if (resolvedCompanyId) {
    const { data: compData } = await supabaseAdmin
      .from("companies")
      .select("id, name, address, career_presentation")
      .eq("id", resolvedCompanyId)
      .maybeSingle()
    if (compData) company = compData
  }

  // További nyitott pozíciók ugyanennél a vállalatnál
  let relatedPostings: any[] = []
  if (resolvedCompanyId) {
    let relQuery = supabaseAdmin
      .from("hr_allashirdetes")
      .select("id, cim, munkavegzes_modja, tapasztalati_szint, helyszin, reszleg_nev, is_internal")
      .eq("company_id", resolvedCompanyId)
      .eq("aktiv", true)
      .neq("id", hirdetes.id)

    if (isInternalContext) {
      relQuery = relQuery.eq("is_internal", true)
    } else {
      relQuery = relQuery.eq("publikus", true).eq("is_internal", false)
    }

    const { data: rel } = await relQuery.limit(3)
    relatedPostings = rel || []
  }

  const companyName = company?.name || "Vállalat"
  const departmentName = hirdetes.reszleg_nev || orgUnit?.nev || "Általános"
  const munkakorNev = munkakor?.megnevezes || hirdetes.cim
  const workModeLabel =
    WORK_MODE_LABELS[hirdetes.munkavegzes_modja || "hibrid"] ||
    hirdetes.munkavegzes_modja ||
    "Hibrid munkavégzés"
  const empTypeLabel =
    EMPLOYMENT_TYPE_LABELS[hirdetes.foglalkoztatas_tipusa || "teljes_munkaido"] ||
    "Teljes munkaidő"
  const seniorityLabel =
    SENIORITY_LABELS[hirdetes.tapasztalati_szint || "medior"] || "Medior"
  const locationLabel = hirdetes.helyszin || company?.address || "Budapest"
  const salaryBand = hirdetes.bersav_publikus
    ? formatSalaryBand(hirdetes.bersav_min, hirdetes.bersav_max)
    : null

  const dateStr = new Date(
    hirdetes.nyitva_tol || hirdetes.created_at
  ).toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const deadlineStr = hirdetes.jelentkezesi_hatarido
    ? new Date(hirdetes.jelentkezesi_hatarido).toLocaleDateString("hu-HU", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── 1. FELSŐ NAVIGÁCIÓS SÁV ── */}
      <div className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-14 py-2 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href={
                resolvedCompanyId
                  ? `/karrier?company=${resolvedCompanyId}${
                      isInternalContext ? "&scope=internal" : ""
                    }`
                  : "/karrier"
              }
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>
                {isInternalContext
                  ? `Vissza a belső hirdetésekhez (${companyName})`
                  : `Vissza a nyitott pozíciókhoz (${companyName})`}
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {isEmployeeOfCompany && (
              <Link
                href="/hr/self-service/career"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-8 px-3 text-xs font-medium"
                )}
              >
                Vissza a belső HR portálra
              </Link>
            )}
            {resolvedCompanyId && (
              <Link
                href={`/karrier?company=${resolvedCompanyId}&view=about`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-8 px-3 text-xs font-medium border-primary/30 text-primary hover:bg-primary/5 hidden sm:inline-flex"
                )}
              >
                Cégünkről — Vállalati Prezentáció ({companyName})
              </Link>
            )}
            <CareerShareButton title={hirdetes.cim} />
          </div>
        </div>
      </div>

      {/* ── 2. POZÍCIÓ FEJLÉC ── */}
      <header className="bg-primary text-primary-foreground py-8 sm:py-10 px-4 border-b border-border/60">
        <div className="max-w-6xl mx-auto space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {hirdetes.is_internal && (
                <Badge
                  variant="outline"
                  className="border-white bg-white text-primary text-xs font-semibold gap-1.5 px-2.5 py-0.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Belső álláspályázat (Munkatársaknak)</span>
                </Badge>
              )}
              <Badge
                variant="outline"
                className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground text-xs font-medium gap-1.5 px-2.5 py-0.5"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{companyName}</span>
              </Badge>
            </div>
            <span className="text-xs text-primary-foreground/80">
              Közzétéve: {dateStr}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            {hirdetes.cim}
          </h1>
        </div>
      </header>

      {/* ── 3. FŐ TARTALOM: LEÍRÁS + JELENTKEZÉSI ŰRLAP ── */}
      <main className="flex-1 w-full max-w-6xl mx-auto py-10 px-4 sm:px-6 grid lg:grid-cols-[1fr_440px] gap-8 items-start">
        {/* Bal oszlop: Strukturált Névjegy + Részletes leírás */}
        <div className="space-y-6">
          {/* Strukturált Pozíció Névjegye (Job Fact Sheet) */}
          <div className="rounded-lg border border-border/70 bg-card p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pozíció paraméterei és feltételei
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Hirdető vállalat</p>
                <p className="text-sm font-semibold text-foreground">{companyName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Szakmai részleg</p>
                <p className="text-sm font-semibold text-foreground">
                  {departmentName}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Munkavégzés módja</p>
                <p className="text-sm font-semibold text-foreground">{workModeLabel}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Tapasztalati szint</p>
                <p className="text-sm font-semibold text-foreground">
                  {seniorityLabel}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Foglalkoztatás</p>
                <p className="text-sm font-semibold text-foreground">{empTypeLabel}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Munkavégzés helye</p>
                <p className="text-sm font-semibold text-foreground">{locationLabel}</p>
              </div>
              {salaryBand && (
                <div className="space-y-1 sm:col-span-3 pt-2 border-t border-border/50">
                  <p className="text-[11px] text-muted-foreground">
                    Meghirdetett bruttó havi bérsáv
                  </p>
                  <p className="text-sm font-semibold text-success tabular-nums">
                    {salaryBand}
                  </p>
                </div>
              )}
            </div>
            {deadlineStr && (
              <div className="pt-3 border-t border-border/50 text-xs text-muted-foreground">
                Jelentkezési határidő:{" "}
                <strong className="text-foreground tabular-nums">{deadlineStr}</strong>
              </div>
            )}
          </div>

          {/* Részletes pozícióleírás */}
          <div className="bg-card p-6 sm:p-8 rounded-lg border border-border/70 space-y-6">
            {hirdetes.rovid_leiras && (
              <p className="text-base text-foreground/90 leading-relaxed font-medium pb-5 border-b border-border/60">
                {hirdetes.rovid_leiras}
              </p>
            )}

            <RichTextContent
              content={hirdetes.reszletes_leiras}
              fallback={
                <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
                  <p>
                    Csatlakozz a(z) <strong>{companyName}</strong> csapatához{" "}
                    <strong>{hirdetes.cim}</strong> pozícióba!
                  </p>
                  {munkakor?.feladatok_es_hataskorok && (
                    <div>
                      <h3 className="font-semibold text-base mb-1">
                        Feladatok és hatáskörök
                      </h3>
                      <p className="text-muted-foreground whitespace-pre-line">
                        {munkakor.feladatok_es_hataskorok}
                      </p>
                    </div>
                  )}
                  {munkakor?.elvart_kompetenciak && (
                    <div>
                      <h3 className="font-semibold text-base mb-1">
                        Elvárt kompetenciák
                      </h3>
                      <p className="text-muted-foreground whitespace-pre-line">
                        {munkakor.elvart_kompetenciak}
                      </p>
                    </div>
                  )}
                </div>
              }
            />
          </div>

          {/* További nyitott pozíciók ugyanennél a cégnél */}
          {relatedPostings.length > 0 && (
            <div className="rounded-lg border border-border/70 bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  {isInternalContext
                    ? `További nyitott belső pozíciók a(z) ${companyName} vállalatnál`
                    : `További nyitott pozíciók a(z) ${companyName} vállalatnál`}
                </h3>
                <Link
                  href={`/karrier?company=${resolvedCompanyId}${
                    isInternalContext ? "&scope=internal" : ""
                  }`}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Összes megtekintése
                </Link>
              </div>
              <div className="divide-y divide-border/60">
                {relatedPostings.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/karrier/${rel.id}${
                      isInternalContext || rel.is_internal
                        ? "?scope=internal"
                        : ""
                    }`}
                    className="group py-3 flex items-center justify-between gap-4 hover:text-primary transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground group-hover:text-primary">
                        {rel.cim}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {WORK_MODE_LABELS[rel.munkavegzes_modja || "hibrid"] ||
                          "Hibrid"}{" "}
                        •{" "}
                        {SENIORITY_LABELS[rel.tapasztalati_szint || "medior"] ||
                          "Medior"}{" "}
                        • {rel.helyszin || locationLabel}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Jobb oszlop: Sticky Jelentkezési Űrlap */}
        <div className="lg:sticky lg:top-20">
          <ApplicationForm
            allashirdetesId={hirdetes.id}
            munkakorId={hirdetes.munkakor_id}
            companyId={resolvedCompanyId}
            companyName={companyName}
            positionTitle={hirdetes.cim}
            isInternalPosting={Boolean(hirdetes.is_internal)}
            initialEmployeeData={
              hirdetes.is_internal && isEmployeeOfCompany
                ? empCtx.employeeData
                : null
            }
          />
        </div>
      </main>

      {/* Lábléc */}
      <footer className="border-t border-border/60 bg-card py-6 px-4 text-center text-xs text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} {companyName} • eaisyHR Karrierportál.
          Minden jog fenntartva.
        </p>
      </footer>
    </div>
  )
}
