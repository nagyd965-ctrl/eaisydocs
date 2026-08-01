import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/server"
import { PersonalDataCard } from "@/components/hr/personal-data-card"
import { RecentDocumentsCard } from "@/components/hr/recent-documents-card"
import { JobDescriptionAcknowledgment } from "@/components/hr/job-description-acknowledgment"
import { redirect } from "next/navigation"
import { CalendarDays, Stethoscope, Briefcase, UserCircle } from "lucide-react"

export default async function SelfServiceProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [adatlapRes, jogviszonyRes, orvosiRes] = await Promise.all([
    supabase
      .from("hr_dolgozo_adatlap")
      .select("*, felhasznalo_profil(nev, hr_szerepkor)")
      .eq("id", user.id)
      .single(),
    supabase
      .from("hr_jogviszony")
      .select("*, hr_beosztas(*, hr_munkakor(*))")
      .eq("dolgozo_id", user.id)
      .is("kilepes_datuma", null)
      .single(),
    supabase
      .from("hr_orvosi_vizsgalat")
      .select("ervenyesseg_datuma")
      .eq("dolgozo_id", user.id)
      .order("ervenyesseg_datuma", { ascending: false })
      .limit(1)
      .maybeSingle()
  ])

  const adatlap = adatlapRes.data
  const jogviszonyInfo = jogviszonyRes.data
  const orvosi = orvosiRes.data

  const activeMunkakor = jogviszonyInfo?.hr_beosztas?.[0]?.hr_munkakor
  const munkakorMegnevezes = activeMunkakor?.megnevezes || null
  const belepesDatuma = jogviszonyInfo?.belepes_datuma || null
  const orvosiErvenyesseg = orvosi?.ervenyesseg_datuma || null
  const nev = adatlap?.felhasznalo_profil?.nev || "Dolgozó"
  const szerepkor = adatlap?.felhasznalo_profil?.hr_szerepkor || null

  // Monogram generálás
  const initials = nev
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  // Orvosi lejárat figyelmeztetés (30 napon belül)
  let orvosiWarning = false
  if (orvosiErvenyesseg) {
    const diff = new Date(orvosiErvenyesseg).getTime() - new Date().getTime()
    orvosiWarning = diff < 30 * 24 * 60 * 60 * 1000
  }

  let needsAcknowledgment = false;
  if (activeMunkakor) {
    const { data: nyugtazas } = await supabase
      .from("hr_munkakor_nyugtazas")
      .select("id")
      .eq("user_id", user.id)
      .eq("munkakor_id", activeMunkakor.id)
      .single()
    if (!nyugtazas) needsAcknowledgment = true;
  }

  const { data: dokumentumok } = await supabase
    .from("hr_dokumentum")
    .select("*")
    .eq("dolgozo_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5)

  const szerepkorLabel: Record<string, string> = {
    hr_munkatars: "HR Munkatárs",
    hr_vezeto: "HR Vezető",
    vezeto: "Vezető",
    admin: "Adminisztrátor",
    dolgozo: "Dolgozó",
  }

  return (
    <div className="space-y-6 pb-10">

      {/* Fejléc */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Profilom</h1>
        <p className="text-muted-foreground mt-1">
          Személyes adatok, munkakör és dokumentumok.
        </p>
      </div>

      {/* Munkaköri leírás elfogadás figyelmeztetés */}
      {needsAcknowledgment && activeMunkakor && (
        <JobDescriptionAcknowledgment munkakor={activeMunkakor} />
      )}

      {/* Profil hero kártya */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            {/* Bal: Avatar + Név */}
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="text-xl font-semibold text-primary-foreground tabular-nums">
                  {initials}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold">{nev}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {munkakorMegnevezes || "Munkakör nincs beállítva"}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Aktív
                  </span>
                  {szerepkor && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border border-primary/40 text-primary">
                      {szerepkorLabel[szerepkor] ?? szerepkor}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Jobb: Info chipek */}
            <div className="flex flex-wrap gap-3">
              {belepesDatuma && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/40 text-sm">
                  <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Belépés</p>
                    <p className="font-medium text-xs">
                      {new Date(belepesDatuma).toLocaleDateString("hu-HU", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              )}
              {orvosiErvenyesseg && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                  orvosiWarning
                    ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20"
                    : "border bg-muted/40"
                }`}>
                  <Stethoscope className={`w-4 h-4 shrink-0 ${orvosiWarning ? "text-amber-500" : "text-primary"}`} />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Orvosi</p>
                    <p className={`font-medium text-xs ${orvosiWarning ? "text-amber-600 dark:text-amber-400" : ""}`}>
                      {new Date(orvosiErvenyesseg).toLocaleDateString("hu-HU", { year: "numeric", month: "short", day: "numeric" })}
                      {orvosiWarning && " ⚠️"}
                    </p>
                  </div>
                </div>
              )}
              {munkakorMegnevezes && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/40 text-sm">
                  <Briefcase className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Munkakör</p>
                    <p className="font-medium text-xs">{munkakorMegnevezes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Adatkártyák: Alapadatok + Különleges Adatok */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Alapadatok */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <UserCircle className="w-4 h-4 text-primary" />
              Alapadatok
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <div className="py-3 border-b border-border">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Munkakör</p>
              <p className="font-medium text-sm mt-1">
                {munkakorMegnevezes || <span className="text-muted-foreground italic">Nincs beállítva</span>}
              </p>
            </div>
            <div className="py-3 border-b border-border">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Belépés Dátuma</p>
              <p className="font-medium text-sm mt-1">
                {belepesDatuma && !isNaN(new Date(belepesDatuma).getTime())
                  ? new Date(belepesDatuma).toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })
                  : <span className="text-muted-foreground italic">Nincs megadva</span>}
              </p>
            </div>
            <div className="py-3">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Orvosi Érvényesség</p>
              <p className={`font-medium text-sm mt-1 ${orvosiWarning ? "text-amber-600 dark:text-amber-400" : ""}`}>
                {orvosiErvenyesseg && !isNaN(new Date(orvosiErvenyesseg).getTime())
                  ? <>
                      {new Date(orvosiErvenyesseg).toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })}
                      {orvosiWarning && <span className="ml-2 text-[11px] font-semibold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">Hamarosan lejár</span>}
                    </>
                  : <span className="text-muted-foreground italic">Nincs megadva</span>}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Különleges Adatok – változtatás nélkül */}
        <PersonalDataCard />
      </div>

      {/* Legutóbbi Dokumentumaim */}
      <RecentDocumentsCard documents={dokumentumok || []} />

    </div>
  )
}
