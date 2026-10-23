"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FileText, Printer, ChevronDown, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { generateAndSaveContract, getEmployeeContractFillData } from "@/app/hr/actions/contract-actions"
import { EmploymentContractPanel } from "@/components/hr/employment-contract-panel"
import { DEFAULT_COMPANY_DETAILS } from "@/utils/hr/employment-contract-constants"

export interface ContractEmployeeData {
  id: string
  nev?: string
  felhasznalo_profil?: any
  hr_munkakor?: any
  [key: string]: any
}

export interface ContractAdatlapData {
  szuletesi_hely?: string | null
  szuletesi_datum?: string | null
  szuletesi_ido?: string | null
  anyja_neve?: string | null
  lakcim?: string | null
  adoazonosito_jel?: string | null
  taj_szam?: string | null
  alapber?: number | null
  [key: string]: any
}

function formatDateHu(dateStr?: string | null): string {
  if (!dateStr) return "Szerződés szerint"
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("hu-HU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    })
  } catch {
    return dateStr
  }
}

export function ContractGeneratorDialog({ 
  employee, 
  adatlap,
  munkakor,
  vezetoNev
}: { 
  employee: ContractEmployeeData
  adatlap: ContractAdatlapData
  munkakor?: any
  vezetoNev?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [template, setTemplate] = useState("munkaszerzodes")
  const [isSaving, setIsSaving] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Teljes körű automatikus adat-előtöltés
  const [fillData, setFillData] = useState<any>(null)
  const [ujAlapber, setUjAlapber] = useState<number>(650000)
  const [hatalyDatum, setHatalyDatum] = useState<string>(
    new Date().toISOString().split("T")[0]
  )

  useEffect(() => {
    if (!open || !employee?.id) return
    let isCancelled = false
    getEmployeeContractFillData(employee.id).then((res) => {
      if (!isCancelled && res.success && res.data) {
        setFillData(res.data)
        if (res.data.alapber) {
          setUjAlapber(res.data.alapber)
        }
      }
    })
    return () => {
      isCancelled = true
    }
  }, [open, employee?.id])

  // Megjelenítési adatok egységes feloldása
  const displayEmployeeName = employee?.nev || fillData?.nev || "Munkavállaló"
  const displaySzuletesiHely = fillData?.szuletesiHely || adatlap?.szuletesi_hely || "Budapest"
  const displaySzuletesiDatum = formatDateHu(fillData?.szuletesiDatum || adatlap?.szuletesi_datum || adatlap?.szuletesi_ido)
  const displayAnyjaNeve = fillData?.anyjaNeve || adatlap?.anyja_neve || "Nincs rögzítve"
  const displayLakcim = fillData?.lakcim || adatlap?.lakcim || "Nincs rögzítve"
  const displayAdoazonositoJel = fillData?.adoazonositoJel || adatlap?.adoazonosito_jel || "Nincs rögzítve"
  const displayTajSzam = fillData?.tajSzam || adatlap?.taj_szam || "Nincs rögzítve"
  const displayBankszamlaszam = fillData?.bankszamlaszam || "Nincs rögzítve"
  const displayMunkakor = fillData?.munkakor || munkakor?.megnevezes || adatlap?.hr_munkakor?.megnevezes || "Kijelölt munkakör"
  const displayReszleg = fillData?.reszleg || adatlap?.hr_szervezeti_egyseg?.nev || employee?.hr_szervezeti_egyseg?.nev || "Központi"
  const displayBelepesDatuma = formatDateHu(fillData?.belepesDatuma || adatlap?.belepes_datuma)
  const displayAlapber = fillData?.alapber || adatlap?.alapber || 650000

  const handlePrint = () => {
    window.print()
  }

  const handleSaveToSystem = async () => {
    if (!contentRef.current || !employee?.id) {
      toast.error("Hiba történt az adatok betöltésekor.")
      return
    }

    setIsSaving(true)
    const htmlContent = contentRef.current.innerHTML

    try {
      const result = await generateAndSaveContract(
        htmlContent,
        employee.id,
        template,
        displayEmployeeName
      )

      if (result.success) {
        toast.success("Dokumentum sikeresen legenerálva és elmentve a dolgozó iratai közé!")
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || "Hiba történt a generálás során.")
      }
    } catch (error) {
      toast.error("Váratlan hiba történt a mentés során.")
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 border" />}>
        <FileText className="w-4 h-4" />
        Szerződés / Irat Generálása
        <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[850px] w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden print:max-w-none print:w-full print:m-0 print:p-0 print:border-none print:shadow-none">
        <div className="print:hidden">
          <DialogHeader>
            <DialogTitle>Szerződés & Dokumentum Generátor</DialogTitle>
            <DialogDescription>
              Válassz sablont a dokumentum legenerálásához, majd nyomtasd ki vagy mentsd el közvetlenül a dolgozó iratai közé.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col sm:flex-row gap-4 items-start sm:items-end border-b pb-6 mb-4">
            <div className="space-y-2 flex-1 w-full">
              <Label>Dokumentum Sablon</Label>
              <Select value={template} onValueChange={(val) => val && setTemplate(val)} disabled={isSaving}>
                <SelectTrigger>
                  <SelectValue placeholder="Válassz sablont...">
                    {template === "munkaszerzodes" && "Hivatalos Munkaszerződés (Mt. 42–45. §)"}
                    {template === "munkakori_leiras" && "Hivatalos Munkaköri Leírás"}
                    {template === "bermodositas" && "Munkaszerződés-módosítás (Bérmódosítás - Mt. 58. §)"}
                    {template === "titoktartasi" && "Titoktartási Nyilatkozat (NDA)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="munkaszerzodes">Hivatalos Munkaszerződés (Mt. 42–45. §)</SelectItem>
                  <SelectItem value="munkakori_leiras">Hivatalos Munkaköri Leírás</SelectItem>
                  <SelectItem value="bermodositas">Munkaszerződés-módosítás (Bérmódosítás - Mt. 58. §)</SelectItem>
                  <SelectItem value="titoktartasi">Titoktartási Nyilatkozat (NDA)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {template !== "munkaszerzodes" && (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={handlePrint} disabled={isSaving} className="gap-2">
                  <Printer className="w-4 h-4" />
                  Nyomtatás
                </Button>
                <Button onClick={handleSaveToSystem} disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Mentés a Rendszerbe
                </Button>
              </div>
            )}
          </div>

          {/* Bérmódosítás interaktív vezérlősáv */}
          {template === "bermodositas" && (
            <div className="bg-muted/40 p-3.5 rounded-lg border flex flex-col sm:flex-row items-center gap-4 mb-4 text-xs">
              <div className="flex-1 w-full space-y-1">
                <Label className="text-xs font-medium text-foreground">Új Havi Bruttó Alapbér (Ft)</Label>
                <Input
                  type="number"
                  value={ujAlapber}
                  onChange={(e) => setUjAlapber(Number(e.target.value) || 0)}
                  className="h-8 font-mono tabular-nums text-xs"
                  placeholder="pl. 700000"
                />
              </div>
              <div className="flex-1 w-full space-y-1">
                <Label className="text-xs font-medium text-foreground">Bérmódosítás Hatálybalépése</Label>
                <Input
                  type="date"
                  value={hatalyDatum}
                  onChange={(e) => setHatalyDatum(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="text-xs text-muted-foreground sm:self-end sm:pb-2">
                A dokumentum tartalma valós időben frissül a megadott bérrel.
              </div>
            </div>
          )}
        </div>

        {/* Munkaszerződés esetén a hivatalos, onboardinggal azonos motor */}
        {template === "munkaszerzodes" ? (
          <div className="pt-1">
            <EmploymentContractPanel
              employeeName={displayEmployeeName}
              dolgozoId={employee?.id}
              munkakor={displayMunkakor}
              reszleg={displayReszleg}
              belepesDatuma={fillData?.belepesDatuma || adatlap?.belepes_datuma}
              adatlap={adatlap}
              initialPersonalData={fillData}
              onSuccess={() => {
                router.refresh()
              }}
            />
          </div>
        ) : (
          /* Egyéb nyomtatható A4-es nézet */
          <div ref={contentRef} className="print:block bg-white text-black p-6 sm:p-12 min-h-0 sm:min-h-[297mm] w-full max-w-[210mm] mx-auto border print:border-none print:shadow-none">

          {template === "munkakori_leiras" && (
            <div className="space-y-6">
              <div className="border-b pb-4 text-center">
                <h2 className="text-xs font-semibold tracking-wider uppercase text-gray-500">eaisyDocs Zrt. • Munkaköri Nyilvántartás</h2>
                <h1 className="text-2xl font-bold uppercase tracking-widest mt-2">Hivatalos Munkaköri Leírás</h1>
                <p className="text-xs text-gray-600 mt-1">
                  A Munka Törvénykönyvéről szóló 2012. évi I. törvény alapján
                </p>
              </div>

              {/* Alapadatok rács */}
              <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded border">
                <div>
                  <p className="text-xs text-gray-500">Munkavállaló neve:</p>
                  <p className="font-bold text-base">{displayEmployeeName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Munkakör megnevezése:</p>
                  <p className="font-bold text-base">{displayMunkakor}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">FEOR kód / Besorolás:</p>
                  <p className="font-medium">{munkakor?.feor_kod ? `FEOR: ${munkakor.feor_kod}` : "-"} {munkakor?.besorolasi_szint ? `(${munkakor.besorolasi_szint})` : ""}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Közvetlen felettes vezető:</p>
                  <p className="font-medium min-h-[1.25rem]">{vezetoNev || ""}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Munkaviszony kezdete:</p>
                  <p className="font-medium">{displayBelepesDatuma}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Munkarend / Időtartam:</p>
                  <p className="font-medium">{adatlap?.szerzodes_tipusa === "határozott" ? "Határozott idejű" : "Határozatlan idejű"}</p>
                </div>
              </div>

              {/* 1. Munkakör célja */}
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider border-b pb-1 mb-2">1. A munkakör célja és küldetése</h3>
                <p className="text-justify leading-relaxed text-sm">
                  {munkakor?.leiras || `A(z) ${displayMunkakor} célja a társaság szakmai színvonalának biztosítása, a szakterülethez tartozó feladatok precíz, határidőre történő megvalósítása a belső szabályzatok és jogszabályi keretek betartása mellett.`}
                </p>
              </div>

              {/* 2. Feladatok és hatáskörök */}
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider border-b pb-1 mb-2">2. Főbb feladatok és hatáskörök</h3>
                {Array.isArray(munkakor?.feladatok_es_hataskorok) && munkakor.feladatok_es_hataskorok.length > 0 ? (
                  <ol className="list-decimal pl-6 space-y-1.5 text-justify text-sm leading-relaxed">
                    {munkakor.feladatok_es_hataskorok.map((f: string, idx: number) => (
                      <li key={idx}>{f}</li>
                    ))}
                  </ol>
                ) : (
                  <ul className="list-disc pl-6 space-y-1.5 text-justify text-sm leading-relaxed">
                    <li>A munkakörhöz kapcsolódó operatív és szakmai feladatok önálló, felelősségteljes ellátása.</li>
                    <li>Rendszeres kapcsolattartás és együttműködés a társaság belső szervezeti egységeivel.</li>
                    <li>Szakmai és adminisztratív nyilvántartások, valamint feladatok naprakész vezetése.</li>
                    <li>A közvetlen felettes vezető által meghatározott eseti szakmai feladatok végrehajtása.</li>
                  </ul>
                )}
              </div>

              {/* 3. Elvárt kompetenciák */}
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider border-b pb-1 mb-2">3. Elvárt szaktudás és kompetenciák</h3>
                {Array.isArray(munkakor?.elvart_kompetenciak) && munkakor.elvart_kompetenciak.length > 0 ? (
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    {munkakor.elvart_kompetenciak.map((k: string, idx: number) => (
                      <li key={idx}>{k}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-700">Szakirányú végzettség, megbízhatóság, önálló munkavégzési készség és szakmai precizitás.</p>
                )}
              </div>

              {/* 4. Munkavédelem & Egészségügy */}
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider border-b pb-1 mb-2">4. Munkavédelem & Egészségügyi alkalmasság</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Kötelező orvosi vizsgálat:</strong> {munkakor?.orvosi_vizsgalat_tipus ? `${munkakor.orvosi_vizsgalat_tipus} (Gyakoriság: minden ${munkakor.orvosi_vizsgalat_gyakorisag_ho || 12} hónapban)` : "Előzetes és időszakos foglalkozás-egészségügyi alkalmassági vizsgálat."}</p>
                  <p><strong>Egyéni védőeszköz juttatás:</strong> {munkakor?.vedoeszkoz_igeny || munkakor?.kockazatertekeles_munkavedelmi || "Munkavédelmi szabályzat szerint előírt védőfelszerelés betartása kötelező."}</p>
                </div>
              </div>

              {/* 5. Átvételi nyilatkozat */}
              <div className="pt-4 border-t">
                <p className="text-xs text-justify text-gray-600 leading-relaxed">
                  A Munkavállaló kijelenti, hogy jelen munkaköri leírásban foglaltakat megismerte, megértette, azt magára nézve kötelezőnek ismeri el. Egyúttal igazolja, hogy a munkaköri leírás 1 (egy) eredeti példányát átvette.
                </p>
              </div>

              {/* Aláírások */}
              <div className="mt-12 pt-6 flex justify-between">
                <div className="text-center">
                  <div className="w-48 border-b border-black mb-2"></div>
                  <p className="text-xs font-medium">Munkáltató (Kiadó)</p>
                </div>
                <div className="text-center">
                  <div className="w-48 border-b border-black mb-2"></div>
                  <p className="text-xs font-medium">Munkavállaló (Átvevő)</p>
                </div>
              </div>
            </div>
          )}

          {template === "bermodositas" && (
            <div className="space-y-6 text-sm text-gray-900 leading-relaxed">
              {/* Fejléc */}
              <div className="border-b pb-4 text-center">
                <h2 className="text-xs font-semibold tracking-wider uppercase text-gray-500">
                  {DEFAULT_COMPANY_DETAILS.nev} • Munkaügyi Nyilvántartás
                </h2>
                <h1 className="text-xl font-bold uppercase tracking-wider mt-1.5">
                  Munkaszerződés-Módosítás (Bérmódosítás)
                </h1>
                <p className="text-xs text-gray-600 mt-1">
                  A Munka Törvénykönyvéről szóló 2012. évi I. törvény (Mt.) 58. §-a alapján
                </p>
              </div>

              {/* Felek adatai két oszlopban */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded border text-xs">
                <div className="space-y-1.5">
                  <p className="font-bold text-gray-700 uppercase tracking-wider border-b pb-1">Munkáltató adatai</p>
                  <div><span className="text-gray-500">Cégnév:</span> <strong className="font-medium">{DEFAULT_COMPANY_DETAILS.nev}</strong></div>
                  <div><span className="text-gray-500">Székhely:</span> {DEFAULT_COMPANY_DETAILS.szekhely}</div>
                  <div><span className="text-gray-500">Cégjegyzékszám:</span> {DEFAULT_COMPANY_DETAILS.cegjegyzekszam}</div>
                  <div><span className="text-gray-500">Adószám:</span> {DEFAULT_COMPANY_DETAILS.adoszam}</div>
                  <div><span className="text-gray-500">Képviselő:</span> {DEFAULT_COMPANY_DETAILS.kepviselo}</div>
                </div>

                <div className="space-y-1.5">
                  <p className="font-bold text-gray-700 uppercase tracking-wider border-b pb-1">Munkavállaló adatai</p>
                  <div><span className="text-gray-500">Név:</span> <strong className="font-medium">{displayEmployeeName}</strong></div>
                  <div><span className="text-gray-500">Születési hely, idő:</span> {displaySzuletesiHely}, {displaySzuletesiDatum}</div>
                  <div><span className="text-gray-500">Anyja születési neve:</span> {displayAnyjaNeve}</div>
                  <div><span className="text-gray-500">Állandó lakcím:</span> {displayLakcim}</div>
                  <div><span className="text-gray-500">Adóazonosító / TAJ:</span> {displayAdoazonositoJel} / {displayTajSzam}</div>
                  <div><span className="text-gray-500">Munkakör:</span> {displayMunkakor}</div>
                </div>
              </div>

              {/* Bevezetés */}
              <div className="text-justify text-xs space-y-2">
                <p>
                  amely létrejött egyrészről a fentiekben megnevezett <strong>{DEFAULT_COMPANY_DETAILS.nev}</strong>, mint Munkáltató,
                  másrészről a fent azonosított <strong>{displayEmployeeName}</strong>, mint Munkavállaló (a továbbiakban együtt: <em>Felek</em>) között,
                  az alábbi feltételek szerint:
                </p>
                <p>
                  Felek rögzítik, hogy egymással {displayBelepesDatuma ? `${displayBelepesDatuma} napjától kezdődően ` : ""}munkaviszonyban állnak.
                  Az Mt. 58. § rendelkezései szerint Felek a munkaszerződés alapbérre vonatkozó rendelkezését közös megegyezéssel az alábbiak szerint módosítják:
                </p>
              </div>

              {/* 1. Módosított alapbér */}
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider border-b pb-1 mb-2">1. Az új alapbér megállapítása</h3>
                <p className="text-justify text-xs leading-relaxed">
                  A Munkavállaló havi személyi alapbére <strong>{formatDateHu(hatalyDatum)}</strong> napjától kezdődően bruttó <strong>{ujAlapber.toLocaleString("hu-HU")} Ft/hó</strong> összegre módosul.
                  {displayAlapber && displayAlapber !== ujAlapber && (
                    <span className="text-gray-600"> (A módosítást megelőző alapbér: bruttó {displayAlapber.toLocaleString("hu-HU")} Ft/hó).</span>
                  )}
                </p>
              </div>

              {/* 2. Kifizetés módja */}
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider border-b pb-1 mb-2">2. A munkabér elszámolása és kifizetése</h3>
                <p className="text-justify text-xs leading-relaxed">
                  A munkabér elszámolása és kifizetése havonta utólag, a tárgyhónapot követő hónap 10. napjáig történik.
                  A Munkáltató a munkabért banki átutalással teljesíti a Munkavállaló által megadott <strong>{displayBankszamlaszam}</strong> fizetési számlaszámra (Mt. 157–158. §).
                </p>
              </div>

              {/* 3. Változatlan feltételek */}
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider border-b pb-1 mb-2">3. Változatlan szerződéses feltételek</h3>
                <p className="text-justify text-xs leading-relaxed">
                  Felek rögzítik, hogy a felek között létrejött munkaszerződés és annak korábbi módosításai egyéb rendelkezései – különösen a munkakör megnevezése, a munkaidő mértéke, a munkavégzés szokásos helye, valamint az egyéb juttatások rendszere – változatlan tartalommal maradnak érvényben és hatályban.
                </p>
              </div>

              {/* 4. Záró rendelkezések */}
              <div className="border-t pt-3">
                <p className="text-justify text-[11px] text-gray-600 leading-relaxed">
                  Jelen munkaszerződés-módosítás 2 (kettő) eredeti, egymással mindenben megegyező példányban készült, amelyből 1 (egy) példány a Munkáltatót, 1 (egy) példány a Munkavállalót illeti meg. Felek a jelen megállapodást elolvasás és közös értelmezés után, mint akaratukkal mindenben megegyezőt, jóváhagyólag aláírják.
                </p>
              </div>

              {/* Aláírások */}
              <div className="mt-8 pt-4 flex justify-between text-xs">
                <div className="text-center">
                  <p className="text-gray-500 mb-6">Budapest, {new Date().toLocaleDateString("hu-HU")}</p>
                  <div className="w-48 border-b border-black mb-1 mx-auto"></div>
                  <p className="font-medium">Munkáltató (Képviselő)</p>
                  <p className="text-[11px] text-gray-500">{DEFAULT_COMPANY_DETAILS.kepviselo}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 mb-6">Budapest, {new Date().toLocaleDateString("hu-HU")}</p>
                  <div className="w-48 border-b border-black mb-1 mx-auto"></div>
                  <p className="font-medium">Munkavállaló</p>
                  <p className="text-[11px] text-gray-500">{displayEmployeeName}</p>
                </div>
              </div>
            </div>
          )}

          {template === "titoktartasi" && (
            <div className="space-y-6 text-sm text-gray-900 leading-relaxed">
              {/* Fejléc */}
              <div className="border-b pb-4 text-center">
                <h2 className="text-xs font-semibold tracking-wider uppercase text-gray-500">
                  {DEFAULT_COMPANY_DETAILS.nev} • Információbiztonság & Jog
                </h2>
                <h1 className="text-xl font-bold uppercase tracking-wider mt-1.5">
                  Titoktartási és Adatvédelmi Nyilatkozat
                </h1>
                <p className="text-xs text-gray-600 mt-1">
                  A Munka Törvénykönyvéről szóló 2012. évi I. törvény (Mt.) 8. § (4) bekezdése és az üzleti titok védelméről szóló 2018. évi LIV. törvény alapján
                </p>
              </div>

              {/* Nyilatkozó adatai */}
              <div className="bg-gray-50 p-4 rounded border text-xs space-y-2">
                <p className="font-bold text-gray-700 uppercase tracking-wider border-b pb-1">Nyilatkozó Munkavállaló adatai</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-gray-500">Név:</span> <strong className="font-medium">{displayEmployeeName}</strong></div>
                  <div><span className="text-gray-500">Születési hely, idő:</span> {displaySzuletesiHely}, {displaySzuletesiDatum}</div>
                  <div><span className="text-gray-500">Anyja születési neve:</span> {displayAnyjaNeve}</div>
                  <div><span className="text-gray-500">Állandó lakcím:</span> {displayLakcim}</div>
                  <div><span className="text-gray-500">Adóazonosító jel:</span> {displayAdoazonositoJel}</div>
                  <div><span className="text-gray-500">TAJ szám:</span> {displayTajSzam}</div>
                  <div><span className="text-gray-500">Munkakör / Részleg:</span> {displayMunkakor} ({displayReszleg})</div>
                  <div><span className="text-gray-500">Munkáltató:</span> {DEFAULT_COMPANY_DETAILS.nev}</div>
                </div>
              </div>

              {/* 1. Üzleti titok fogalma */}
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider border-b pb-1 mb-2">1. Az üzleti titok és bizalmas információ meghatározása</h3>
                <p className="text-justify text-xs leading-relaxed">
                  Alulírott Munkavállaló kijelentem és tudomásul veszem, hogy a Munkáltató gazdasági tevékenységéhez kapcsolódó minden olyan nem közismert vagy nem könnyen hozzáférhető tény, tájékoztatás, egyéb adat és az azokból készült összeállítás üzleti titoknak minősül, amelynek illetéktelenek által történő megszerzése, hasznosítása, mással való közlése vagy nyilvánosságra hozatala a Munkáltató jogos pénzügyi, gazdasági vagy piaci érdekét sértené vagy veszélyeztetné (2018. évi LIV. tv. 1. §).
                </p>
                <p className="text-justify text-xs leading-relaxed mt-1">
                  Különösen üzleti titoknak és szigorúan bizalmas információnak minősülnek a Munkáltató szoftvereinek forráskódjai, fejlesztési dokumentációi, rendszerarchitektúrái, ügyfél- és partnerlistái, árképzési és béradatai, üzleti és marketing tervei, valamint az általa kezelt személyes adatállományok.
                </p>
              </div>

              {/* 2. Titoktartási kötelezettség terjedelme */}
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider border-b pb-1 mb-2">2. A titoktartási kötelezettség terjedelme és időtartama</h3>
                <p className="text-justify text-xs leading-relaxed">
                  Munkavállalóként kötelezettséget vállalok arra, hogy a munkaviszonyom fennállása alatt, valamint annak bármely okból történő megszűnését követően is:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-justify mt-1">
                  <li>a tudomásomra jutott valamennyi üzleti titkot és bizalmas információt időbeli korlátozás nélkül szigorúan megőrzöm;</li>
                  <li>az üzleti titkot illetéktelen harmadik személy (ideértve a Munkáltató olyan munkatársait is, akiknek a feladatköréhez az adott adat megismerése nem szükséges) részére sem közvetlenül, sem közvetve hozzáférhetővé nem teszem;</li>
                  <li>a birtokomba került bizalmas információkat kizárólag a munkaköri kötelezettségeim szakszerű és hűséges ellátása céljából használom fel;</li>
                  <li>a bizalmas adatokat saját vagy harmadik személy javára jogosulatlan előny szerzésére, vagy a Munkáltató hátrányára semmilyen formában nem hasznosítom (Mt. 8. § (4)).</li>
                </ul>
              </div>

              {/* 3. Információbiztonsági előírások */}
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider border-b pb-1 mb-2">3. Biztonsági előírások és elszámolás</h3>
                <p className="text-justify text-xs leading-relaxed">
                  Vállalom a Munkáltató információbiztonsági, jelszókezelési és eszközhasználati szabályainak maradéktalan betartását. A digitális hozzáférési jelszavakat, tokeneket és titkosítási kulcsokat más személlyel nem osztom meg. A munkaviszony megszűnésekor köteles vagyok a Munkáltató részére hiánytalanul átadni valamennyi birtokomban lévő munkaeszközt, adathordozót, dokumentációt és másolatot.
                </p>
              </div>

              {/* 4. Jogi felelősség és szankciók */}
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider border-b pb-1 mb-2">4. A kötelezettségszegés jogkövetkezményei és felelősség</h3>
                <p className="text-justify text-xs leading-relaxed">
                  Tudomásul veszem, hogy a titoktartási kötelezettség megszegése súlyos kötelezettségszegésnek minősül, amely a munkaviszony azonnali hatályú felmondását (Mt. 78. §), valamint a Munkáltatónak okozott teljes kár (ideértve az elmaradt hasznot és sérelemdíjat is) megtérítésének kötelezettségét vonja maga után (Mt. 179. §).
                </p>
                <p className="text-justify text-xs leading-relaxed mt-1">
                  Kifejezetten tudomásul veszem, hogy a Büntető Törvénykönyvről szóló 2012. évi C. törvény 418. §-a szerint az üzleti titok jogtalan megszerzése, hasznosítása vagy nyilvánosságra hozatala bűncselekményt valósít meg, amely 3 évig terjedő szabadságvesztéssel büntetendő.
                </p>
              </div>

              {/* 5. Záró nyilatkozat */}
              <div className="border-t pt-3">
                <p className="text-justify text-[11px] text-gray-600 leading-relaxed">
                  Kijelentem, hogy jelen nyilatkozatot elolvastam, tartalmát megértettem, a jogkövetkezményekkel tisztában vagyok, és a nyilatkozatot mint akaratommal mindenben megegyezőt, önként, felelősségem tudatában írom alá.
                </p>
              </div>

              {/* Aláírások és Tanúk */}
              <div className="mt-8 pt-4 space-y-6 text-xs">
                <div className="flex justify-between">
                  <div>
                    <p className="text-gray-500 mb-6">Kelt: Budapest, {new Date().toLocaleDateString("hu-HU")}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-56 border-b border-black mb-1 mx-auto"></div>
                    <p className="font-medium">Munkavállaló (Nyilatkozattevő)</p>
                    <p className="text-[11px] text-gray-500">{displayEmployeeName}</p>
                  </div>
                </div>

                {/* Tanúk blokk */}
                <div className="pt-2 border-t text-[11px]">
                  <p className="font-semibold text-gray-600 uppercase tracking-wider mb-3">Előttünk, mint tanúk előtt:</p>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <div className="w-full border-b border-black mb-1"></div>
                      <p>1. Tanú aláírása</p>
                      <p className="text-gray-500">Név: ..............................................................</p>
                      <p className="text-gray-500">Lakcím: .........................................................</p>
                    </div>
                    <div>
                      <div className="w-full border-b border-black mb-1"></div>
                      <p>2. Tanú aláírása</p>
                      <p className="text-gray-500">Név: ..............................................................</p>
                      <p className="text-gray-500">Lakcím: .........................................................</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </DialogContent>
    </Dialog>
  )
}
