import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/server"
import { PersonalDataCard } from "@/components/hr/personal-data-card"
import { JobDescriptionAcknowledgment } from "@/components/hr/job-description-acknowledgment"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
import { redirect } from "next/navigation"
import { 
  CalendarDays,
  Stethoscope,
  Briefcase, 
  UserCircle, 
  Eye, 
  Download,
  ShieldAlert,
} from "lucide-react"
import { calculateSafetyTrainingStatus } from "@/utils/hr/safety-compliance-calculator"

export default async function SelfServiceProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [adatlapRes, jogviszonyRes, orvosiRes, safetyTrainingRes] = await Promise.all([
    supabase
      .from("hr_dolgozo_adatlap")
      .select("*, felhasznalo_profil(nev, hr_szerepkor, avatar_url)")
      .eq("id", user.id)
      .single(),
    supabase
      .from("hr_jogviszony")
      .select("*, hr_beosztas(*, hr_munkakor(*))")
      .eq("dolgozo_id", user.id)
      .is("kilepes_datuma", null)
      .maybeSingle(),
    supabase
      .from("hr_orvosi_vizsgalat")
      .select("ervenyesseg_datuma")
      .eq("dolgozo_id", user.id)
      .order("ervenyesseg_datuma", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("hr_munkavedelmi_oktatas")
      .select("id, oktatas_tipusa, oktatas_datuma, ervenyesseg_vege, oktato_neve, oktato_beosztasa")
      .eq("dolgozo_id", user.id)
      .order("oktatas_datuma", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const adatlap = adatlapRes.data
  const jogviszonyInfo = jogviszonyRes.data
  const orvosi = orvosiRes.data
  const safetyTraining = safetyTrainingRes.data
  const safetyStatus = calculateSafetyTrainingStatus(safetyTraining?.ervenyesseg_vege)

  const activeMunkakor = jogviszonyInfo?.hr_beosztas?.[0]?.hr_munkakor
  const munkakorMegnevezes = activeMunkakor?.megnevezes || null
  const belepesDatuma = jogviszonyInfo?.belepes_datuma || null
  const orvosiErvenyesseg = orvosi?.ervenyesseg_datuma || null
  const nev = adatlap?.felhasznalo_profil?.nev || "Dolgozó"
  const szerepkor = adatlap?.felhasznalo_profil?.hr_szerepkor || null
  const avatarUrl = adatlap?.felhasznalo_profil?.avatar_url || null

  // Monogram generálás
  const initials = nev
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  // Orvosi lejárat és érvényesség állapotának ellenőrzése
  let isOrvosiExpired = false
  let isOrvosiExpiringSoon = false
  if (orvosiErvenyesseg && !isNaN(new Date(orvosiErvenyesseg).getTime())) {
    const diff = new Date(orvosiErvenyesseg).getTime() - new Date().getTime()
    if (diff < 0) {
      isOrvosiExpired = true
    } else if (diff < 30 * 24 * 60 * 60 * 1000) {
      isOrvosiExpiringSoon = true
    }
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

  // Hivatalos munkaköri leírás dokumentum verzió lekérése
  let latestJobVersion = null
  if (activeMunkakor?.id) {
    const { data: vData } = await supabase
      .from("hr_munkakor_leiras_verzio")
      .select("*")
      .eq("munkakor_id", activeMunkakor.id)
      .order("verzio_szam", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (vData?.fajl_path) {
      const { data: sData } = await supabase.storage
        .from("irat_files")
        .createSignedUrl(vData.fajl_path, 3600)
      latestJobVersion = {
        ...vData,
        signedUrl: sData?.signedUrl || `/api/hr/download-document?path=${encodeURIComponent(vData.fajl_path)}&bucket=irat_files`
      }
    } else {
      latestJobVersion = vData
    }
  }

  // Feladatok és kompetenciák feldolgozása
  const feladatok: string[] = Array.isArray(activeMunkakor?.feladatok_es_hataskorok)
    ? activeMunkakor.feladatok_es_hataskorok
    : (typeof activeMunkakor?.feladatok_es_hataskorok === "string"
        ? (() => {
            try {
              const p = JSON.parse(activeMunkakor.feladatok_es_hataskorok)
              return Array.isArray(p) ? p : []
            } catch {
              return activeMunkakor.feladatok_es_hataskorok.split("\n").map((s: string) => s.trim()).filter(Boolean)
            }
          })()
        : [])

  const kompetenciak: string[] = Array.isArray(activeMunkakor?.elvart_kompetenciak)
    ? activeMunkakor.elvart_kompetenciak
    : (typeof activeMunkakor?.elvart_kompetenciak === "string"
        ? (() => {
            try {
              const p = JSON.parse(activeMunkakor.elvart_kompetenciak)
              return Array.isArray(p) ? p : []
            } catch {
              return activeMunkakor.elvart_kompetenciak.split("\n").map((s: string) => s.trim()).filter(Boolean)
            }
          })()
        : [])


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
        <JobDescriptionAcknowledgment munkakor={activeMunkakor} latestJobVersion={latestJobVersion} />
      )}

      {/* Profil hero kártya */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            {/* Bal: Avatar + Név */}
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center shrink-0 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={nev} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-semibold text-primary-foreground tabular-nums">
                    {initials}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{nev}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {munkakorMegnevezes || "Munkakör nincs beállítva"}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success-subtle text-success">
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
                  isOrvosiExpired
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : isOrvosiExpiringSoon
                    ? "border-warning/40 bg-warning-subtle text-warning"
                    : "border bg-muted/40"
                }`}>
                  <Stethoscope className={`w-4 h-4 shrink-0 ${
                    isOrvosiExpired ? "text-destructive" : isOrvosiExpiringSoon ? "text-warning" : "text-primary"
                  }`} />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-medium opacity-80">
                      Orvosi {isOrvosiExpired ? "(Lejárt!)" : isOrvosiExpiringSoon ? "(Hamarosan lejár)" : ""}
                    </p>
                    <p className={`font-medium text-xs ${
                      isOrvosiExpired ? "text-destructive font-semibold" : isOrvosiExpiringSoon ? "text-warning font-semibold" : ""
                    }`}>
                      {new Date(orvosiErvenyesseg).toLocaleDateString("hu-HU", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              )}
              {/* Munkavédelmi oktatás chip */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                safetyStatus.status === "lejart"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : safetyStatus.status === "hamarosan_lejar"
                  ? "border-warning/40 bg-warning-subtle text-warning"
                  : safetyStatus.status === "hianyzik"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : "border bg-muted/40"
              }`}>
                <ShieldAlert className={`w-4 h-4 shrink-0 ${
                  safetyStatus.status === "lejart"
                    ? "text-destructive"
                    : safetyStatus.status === "hamarosan_lejar"
                    ? "text-warning"
                    : "text-primary"
                }`} />
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-medium opacity-80">
                    Munkavédelem {safetyStatus.status === "lejart" ? "(Lejárt!)" : safetyStatus.status === "hamarosan_lejar" ? "(Hamarosan lejár)" : safetyStatus.status === "hianyzik" ? "(Hiányzik)" : ""}
                  </p>
                  <p className={`font-medium text-xs ${
                    safetyStatus.status === "lejart"
                      ? "text-destructive font-semibold"
                      : safetyStatus.status === "hamarosan_lejar"
                      ? "text-warning font-semibold"
                      : ""
                  }`}>
                    {safetyTraining?.ervenyesseg_vege
                      ? new Date(safetyTraining.ervenyesseg_vege).toLocaleDateString("hu-HU", { year: "numeric", month: "short", day: "numeric" })
                      : "Nincs oktatás"}
                  </p>
                </div>
              </div>
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
            <div className="py-3 border-b border-border">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Orvosi Érvényesség</p>
              <div className="flex items-center gap-2 mt-1">
                {orvosiErvenyesseg && !isNaN(new Date(orvosiErvenyesseg).getTime()) ? (
                  <>
                    <span className={`font-medium text-sm ${
                      isOrvosiExpired ? "text-destructive font-semibold" : isOrvosiExpiringSoon ? "text-warning font-semibold" : ""
                    }`}>
                      {new Date(orvosiErvenyesseg).toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                    {isOrvosiExpired && (
                      <span className="text-[11px] font-semibold text-destructive bg-destructive/10 border border-destructive/30 px-1.5 py-0.5 rounded">
                        Lejárt!
                      </span>
                    )}
                    {isOrvosiExpiringSoon && (
                      <span className="text-[11px] font-semibold text-warning bg-warning-subtle border border-warning/30 px-1.5 py-0.5 rounded">
                        Hamarosan lejár
                      </span>
                    )}
                    {!isOrvosiExpired && !isOrvosiExpiringSoon && (
                      <span className="text-[11px] font-semibold text-success bg-success/10 border border-success/20 px-1.5 py-0.5 rounded">
                        Érvényes
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground italic text-sm">Nincs megadva</span>
                )}
              </div>
            </div>
            <div className="py-3">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Munkavédelmi Oktatás</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {safetyTraining?.ervenyesseg_vege && !isNaN(new Date(safetyTraining.ervenyesseg_vege).getTime()) ? (
                  <>
                    <span className={`font-medium text-sm tabular-nums ${
                      safetyStatus.status === "lejart"
                        ? "text-destructive font-semibold"
                        : safetyStatus.status === "hamarosan_lejar"
                        ? "text-warning font-semibold"
                        : ""
                    }`}>
                      {new Date(safetyTraining.ervenyesseg_vege).toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                    {safetyStatus.status === "lejart" && (
                      <span className="text-[11px] font-semibold text-destructive bg-destructive/10 border border-destructive/30 px-1.5 py-0.5 rounded">
                        Lejárt!
                      </span>
                    )}
                    {safetyStatus.status === "hamarosan_lejar" && (
                      <span className="text-[11px] font-semibold text-warning bg-warning-subtle border border-warning/30 px-1.5 py-0.5 rounded">
                        Hamarosan lejár
                      </span>
                    )}
                    {safetyStatus.status === "ervenyess" && (
                      <span className="text-[11px] font-semibold text-success bg-success/10 border border-success/20 px-1.5 py-0.5 rounded">
                        Érvényes
                      </span>
                    )}
                    {safetyTraining.oktatas_tipusa && (
                      <span className="text-xs text-muted-foreground">
                        ({safetyTraining.oktatas_tipusa === "munkavedelmi" ? "Munkavédelmi" : safetyTraining.oktatas_tipusa === "tuzvedelmi" ? "Tűzvédelmi" : safetyTraining.oktatas_tipusa})
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground italic text-sm">Nincs oktatás rögzítve</span>
                )}
              </div>
              {safetyTraining?.oktato_neve && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Oktató: {safetyTraining.oktato_neve} · Dátum: {new Date(safetyTraining.oktatas_datuma).toLocaleDateString("hu-HU")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Különleges Adatok – változtatás nélkül */}
        <PersonalDataCard />
      </div>

      {/* Munkaköri Profil és Felelősségi Köröm */}
      {activeMunkakor && (
        <Card className="border-border">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base sm:text-lg font-semibold">
                    {activeMunkakor.megnevezes}
                  </CardTitle>
                  {activeMunkakor.besorolasi_szint && (
                    <Badge variant="outline" className="text-xs">
                      {activeMunkakor.besorolasi_szint}
                    </Badge>
                  )}
                  {activeMunkakor.feor_kod && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      (FEOR: {activeMunkakor.feor_kod})
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A pozíciódhoz tartozó hivatalos feladatkör, elvárt kompetenciák és munkaegészségügyi előírások.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Feladatok és Hatáskörök */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">
                Feladatok és Felelősségi Körök ({feladatok.length})
              </h4>
              {feladatok.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {feladatok.map((task, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-2.5 rounded-md border bg-muted/20 text-xs text-foreground"
                    >
                      <span className="font-semibold text-primary mt-0.5 tabular-nums shrink-0">
                        {i + 1}.
                      </span>
                      <span className="leading-snug">{task}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic bg-muted/10 p-3 rounded border border-dashed">
                  Nincsenek egyedi feladatok rögzítve ehhez a munkakörhöz.
                </p>
              )}
            </div>

            {/* Elvárt Kompetenciák */}
            {kompetenciak.length > 0 && (
              <div className="space-y-3 pt-3 border-t">
                <h4 className="text-sm font-semibold text-foreground">
                  Elvárt Kompetenciák és Képzettség
                </h4>
                <div className="flex flex-wrap gap-2">
                  {kompetenciak.map((comp, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-normal py-1 px-2.5 bg-muted">
                      {comp}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Munkavédelem & Foglalkozás-egészségügy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
              <div className="p-3.5 rounded-lg border bg-muted/20 space-y-2">
                <div className="text-xs font-semibold text-foreground">
                  Munkavédelmi és Védőeszköz Előírások
                </div>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider block font-medium">Kockázati besorolás</span>
                    <p className="font-medium text-foreground">
                      {activeMunkakor.kockazat_tipusa || "Nem igényel különleges kockázatértékelést"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider block font-medium">Kötelező védőeszköz (EVE)</span>
                    <p className="font-medium text-foreground">
                      {activeMunkakor.vedoeszkoz_igeny || "Nem kötelező védőeszköz viselete"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border bg-muted/20 space-y-2">
                <div className="text-xs font-semibold text-foreground">
                  Foglalkozás-egészségügyi Alkalmasság
                </div>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider block font-medium">Kötelező orvosi vizsgálat</span>
                    <p className="font-medium text-foreground">
                      {activeMunkakor.orvosi_vizsgalat_tipus || "Standard üzemorvosi vizsgálat"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider block font-medium">Időszakos gyakoriság</span>
                    <p className="font-medium text-foreground">
                      {activeMunkakor.orvosi_vizsgalat_gyakorisag_ho 
                        ? `Minden ${activeMunkakor.orvosi_vizsgalat_gyakorisag_ho} hónapban esedékes` 
                        : "Időszakos vizsgálat nem kötelező"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hivatalos Munkaköri Leírás Verzió Állapot */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/10 text-xs">
              <div>
                <span className="font-medium text-foreground">
                  {latestJobVersion ? `Hivatalos Munkaköri Leírás (v${latestJobVersion.verzio_szam})` : "Munkaköri leírás dokumentum"}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  {latestJobVersion?.fajl_nev 
                    ? `${latestJobVersion.fajl_nev} • Kiadva: ${new Date(latestJobVersion.kiadas_datum || latestJobVersion.created_at).toLocaleDateString("hu-HU")}`
                    : "Még nincs digitális munkaköri leírás verzió feltöltve."}
                </p>
              </div>
              {latestJobVersion?.signedUrl && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <PdfViewerDialog
                    url={latestJobVersion.signedUrl}
                    title={`${latestJobVersion.fajl_nev || activeMunkakor.megnevezes} (v${latestJobVersion.verzio_szam})`}
                    trigger={
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary hover:text-primary">
                        <Eye className="w-3.5 h-3.5" /> Betekintés
                      </Button>
                    }
                  />
                  <a
                    href={latestJobVersion.signedUrl}
                    download={latestJobVersion.fajl_nev || "munkakori_leiras.pdf"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary px-2" title="Letöltés">
                      <Download className="w-3.5 h-3.5" /> Letöltés
                    </Button>
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
