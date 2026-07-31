import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserCircle } from "lucide-react"
import { createClient } from "@/utils/supabase/server"
import { PersonalDataCard } from "@/components/hr/personal-data-card"
import { RecentDocumentsCard } from "@/components/hr/recent-documents-card"
import { JobDescriptionAcknowledgment } from "@/components/hr/job-description-acknowledgment"
import { redirect } from "next/navigation"

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

  const jogviszonyInfo = jogviszonyRes.data
  const orvosi = orvosiRes.data

  const activeMunkakor = jogviszonyInfo?.hr_beosztas?.[0]?.hr_munkakor
  const munkakorMegnevezes = activeMunkakor?.megnevezes || "Nincs beállítva"
  const belepesDatuma = jogviszonyInfo?.belepes_datuma || null
  const orvosiErvenyesseg = orvosi?.ervenyesseg_datuma || null

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Profilom</h1>
          <p className="text-muted-foreground mt-1">
            Személyes adatok, munkakör és dokumentumok.
          </p>
        </div>
      </div>

      {needsAcknowledgment && activeMunkakor && (
        <JobDescriptionAcknowledgment munkakor={activeMunkakor} />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Személyes Adatok */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-primary" /> Alapadatok
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Munkakör</p>
                <p className="font-medium text-sm mt-1">{munkakorMegnevezes}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Belépés Dátuma</p>
                <p className="font-medium text-sm mt-1">{belepesDatuma ? new Date(belepesDatuma).toLocaleDateString("hu-HU") : "Nincs megadva"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Orvosi Érvényesség</p>
                <p className="font-medium text-sm mt-1">{orvosiErvenyesseg ? new Date(orvosiErvenyesseg).toLocaleDateString("hu-HU") : "Nincs megadva"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Titkos Adatok Kártya */}
        <PersonalDataCard />
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        {/* Legutóbbi Dokumentumaim */}
        <RecentDocumentsCard documents={dokumentumok || []} />
      </div>
      
    </div>
  )
}
