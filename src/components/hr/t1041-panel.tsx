"use client"

import { useState, useEffect } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Building2, 
  FileCheck, 
  Download, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  Upload, 
  Copy, 
  Check, 
  FileText, 
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink
} from "lucide-react"
import { toast } from "sonner"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
import { 
  getT1041Data, 
  generateT1041PdfAction, 
  uploadT1041ReceiptAction,
  fileExistingT1041Document,
  type GetT1041Result 
} from "@/app/hr/actions/t1041-actions"
import { T1041_TYPE_LABELS, type T1041PdfData } from "@/utils/hr/t1041-constants"
import { DEFAULT_COMPANY_DETAILS } from "@/utils/hr/employment-contract-constants"

export interface T1041PanelProps {
  employeeName: string
  dolgozoId?: string | null
  onboardingId?: string | null
  offboardingId?: string | null
  munkakor?: string | null
  reszleg?: string | null
  initialType?: "U" | "V" | "T"
  onSuccess?: () => void
  onBack?: () => void
}

export function T1041Panel({
  employeeName,
  dolgozoId,
  onboardingId,
  offboardingId,
  munkakor,
  reszleg,
  initialType = "U",
  onSuccess,
  onBack
}: T1041PanelProps) {
  const [loading, setLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isFileLoading, setIsFileLoading] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Adatok
  const [t1041Data, setT1041Data] = useState<GetT1041Result | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)

  // Űrlap állapot
  const [bejelentesTipus, setBejelentesTipus] = useState<"U" | "V" | "T">(initialType)
  const [formName, setFormName] = useState(employeeName)
  const [tajSzam, setTajSzam] = useState("")
  const [adoazonositoJel, setAdoazonositoJel] = useState("")
  const [formMunkakor, setFormMunkakor] = useState(munkakor || "")
  const [feorKod, setFeorKod] = useState("")
  const [jogviszonyKezdete, setJogviszonyKezdete] = useState("")
  const [jogviszonyVege, setJogviszonyVege] = useState("")
  const [valtozasDatuma, setValtozasDatuma] = useState(new Date().toISOString().split("T")[0])
  const [valtozasJellege, setValtozasJellege] = useState("Heti munkaidő változása")
  const [hetiMunkaidoOra, setHetiMunkaidoOra] = useState(40)
  const [szuletesiHely, setSzuletesiHely] = useState("")
  const [szuletesiDatum, setSzuletesiDatum] = useState("")
  const [anyjaNeve, setAnyjaNeve] = useState("")
  const [lakcim, setLakcim] = useState("")
  const [bekuldesDatuma, setBekuldesDatuma] = useState(new Date().toISOString().split("T")[0])
  const [megjegyzes, setMegjegyzes] = useState("")

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await getT1041Data({ onboardingId, dolgozoId, offboardingId })
      setT1041Data(res)

      if (res.prefilled) {
        setBejelentesTipus(res.prefilled.bejelentesTipus || initialType)
        if (res.prefilled.employeeName) setFormName(res.prefilled.employeeName)
        if (res.prefilled.tajSzam) setTajSzam(res.prefilled.tajSzam)
        if (res.prefilled.adoazonositoJel) setAdoazonositoJel(res.prefilled.adoazonositoJel)
        if (res.prefilled.munkakor) setFormMunkakor(res.prefilled.munkakor)
        if (res.prefilled.feorKod) setFeorKod(res.prefilled.feorKod)
        if (res.prefilled.jogviszonyKezdete) setJogviszonyKezdete(res.prefilled.jogviszonyKezdete)
        if (res.prefilled.jogviszonyVege) setJogviszonyVege(res.prefilled.jogviszonyVege)
        if (res.prefilled.valtozasDatuma) setValtozasDatuma(res.prefilled.valtozasDatuma)
        if (res.prefilled.valtozasJellege) setValtozasJellege(res.prefilled.valtozasJellege)
        if (res.prefilled.hetiMunkaidoOra) setHetiMunkaidoOra(res.prefilled.hetiMunkaidoOra)
        if (res.prefilled.szuletesiHely) setSzuletesiHely(res.prefilled.szuletesiHely)
        if (res.prefilled.szuletesiDatum) setSzuletesiDatum(res.prefilled.szuletesiDatum)
        if (res.prefilled.anyjaNeve) setAnyjaNeve(res.prefilled.anyjaNeve)
        if (res.prefilled.lakcim) setLakcim(res.prefilled.lakcim)
        if (res.prefilled.bekuldesDatuma) setBekuldesDatuma(res.prefilled.bekuldesDatuma)
      }
      if (res.record?.megjegyzes) {
        setMegjegyzes(res.record.megjegyzes)
      }
    } catch (err) {
      console.error("T1041 betöltési hiba:", err)
      toast.error("Nem sikerült betölteni a T1041 adatokat.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [onboardingId, dolgozoId, offboardingId])

  const handleCopyAll = () => {
    const text = [
      `--- NAV T1041 BEJELENTÉSI ADATOK ---`,
      `Foglalkoztató neve: ${DEFAULT_COMPANY_DETAILS.nev}`,
      `Foglalkoztató adószáma: ${DEFAULT_COMPANY_DETAILS.adoszam}`,
      `Foglalkoztató székhelye: ${DEFAULT_COMPANY_DETAILS.szekhely}`,
      `Bejelentés típusa: ${T1041_TYPE_LABELS[bejelentesTipus] || bejelentesTipus}`,
      `Biztosított neve: ${formName}`,
      `Adóazonosító jel: ${adoazonositoJel}`,
      `TAJ szám: ${tajSzam}`,
      `Születési hely, idő: ${szuletesiHely || "-"}, ${szuletesiDatum || "-"}`,
      `Anyja születési neve: ${anyjaNeve || "-"}`,
      `Lakcím: ${lakcim || "-"}`,
      `Munkakör (FEOR): ${feorKod} - ${formMunkakor}`,
      bejelentesTipus === "T"
        ? `Jogviszony vége (megszűnése): ${jogviszonyVege || jogviszonyKezdete}`
        : bejelentesTipus === "V"
        ? `Változás időpontja (hatálya): ${valtozasDatuma}\nEredeti jogviszony kezdete: ${jogviszonyKezdete}\nVáltozás jellege: ${valtozasJellege}`
        : `Jogviszony kezdete: ${jogviszonyKezdete}`,
      `Heti munkaidő: ${hetiMunkaidoOra} óra`,
      `Keltezés: ${bekuldesDatuma}`
    ].join("\n")

    navigator.clipboard.writeText(text)
    setCopiedKey("all")
    toast.success("Összes T1041 adat kimásolva a vágólapra!")
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // PDF Generálás
  const handleGeneratePdf = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast.error("Add meg a biztosított nevét!")
      return
    }
    if (!adoazonositoJel.trim() && !tajSzam.trim()) {
      toast.error("Az adóazonosító jel vagy a TAJ szám megadása kötelező a T1041-hez!")
      return
    }

    const payload: T1041PdfData = {
      bejelentesTipus,
      employeeName: formName.trim(),
      cegNev: DEFAULT_COMPANY_DETAILS.nev,
      cegCim: DEFAULT_COMPANY_DETAILS.szekhely,
      cegAdoszam: DEFAULT_COMPANY_DETAILS.adoszam,
      tajSzam: tajSzam.trim() || undefined,
      adoazonositoJel: adoazonositoJel.trim() || undefined,
      munkakor: formMunkakor.trim() || undefined,
      feorKod: feorKod.trim() || undefined,
      reszleg: reszleg || undefined,
      jogviszonyKezdete: jogviszonyKezdete || undefined,
      jogviszonyVege: (bejelentesTipus === "T" ? (jogviszonyVege || jogviszonyKezdete) : jogviszonyVege) || undefined,
      valtozasDatuma: bejelentesTipus === "V" ? (valtozasDatuma || bekuldesDatuma) : undefined,
      valtozasJellege: bejelentesTipus === "V" ? valtozasJellege : undefined,
      hetiMunkaidoOra: Number(hetiMunkaidoOra) || 40,
      szuletesiHely: szuletesiHely.trim() || undefined,
      szuletesiDatum: szuletesiDatum || undefined,
      anyjaNeve: anyjaNeve.trim() || undefined,
      lakcim: lakcim.trim() || undefined,
      bekuldesDatuma: bekuldesDatuma || new Date().toISOString().split("T")[0],
      megjegyzes: megjegyzes.trim() || undefined
    }

    setIsGenerating(true)
    const res = await generateT1041PdfAction({
      onboardingId,
      offboardingId,
      dolgozoId,
      data: payload
    })
    setIsGenerating(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(
        res.isFiled
          ? `Hivatalos T1041 Adatlap generálva és iktatva! (${res.iktatoszam})`
          : "Hivatalos T1041 Adatlap PDF sikeresen generálva! Következő lépés: beküldés és a NAV nyugta csatolása."
      )
      loadData()
    }
  }

  // NAV Nyugta feltöltése
  const handleUploadReceipt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!receiptFile) {
      toast.error("Válassz ki egy NAV igazolás / nyugta PDF fájlt!")
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", receiptFile)
    formData.append("employeeName", formName)
    if (onboardingId) formData.append("onboardingId", onboardingId)
    if (offboardingId) formData.append("offboardingId", offboardingId)
    if (dolgozoId) formData.append("dolgozoId", dolgozoId)

    const res = await uploadT1041ReceiptAction(formData)
    setIsUploading(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(
        res.isFiled
          ? `NAV Nyugta feltöltve és iktatva a személyi anyagba! (${res.iktatoszam})`
          : "NAV Befogadási Nyugta sikeresen feltöltve! A T1041 feladat kész."
      )
      setReceiptFile(null)
      loadData()
      if (onSuccess) onSuccess()
    }
  }

  // Utólagos iktatás ha dolgozó fiók már aktív
  const handleFileExisting = async (docId: string, docType: "adatlap" | "nyugta") => {
    if (!dolgozoId) return
    setIsFileLoading(true)
    const res = await fileExistingT1041Document({
      dolgozoId,
      documentId: docId
    })
    setIsFileLoading(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(`Dokumentum sikeresen iktatva az 1.3 Hatósági bejelentések dossziéba! (${res.iktatoszam})`)
      loadData()
    }
  }

  const isVerified = t1041Data?.record?.allapot === "igazolva" || Boolean(t1041Data?.nyugtaDoc)
  const isAdatlapReady = Boolean(t1041Data?.adatlapDoc)

  if (loading && !t1041Data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">T1041 bejelentési adatok betöltése...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Státusz és Állapot Kártya */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-foreground">
              NAV T1041 Hatósági Bejelentés & Igazolás
            </h3>
            {isVerified ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Igazolva (NAV nyugta feltöltve)
              </Badge>
            ) : isAdatlapReady ? (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs gap-1 font-medium">
                <Clock className="w-3.5 h-3.5" /> Adatlap kész (Befogadásra vár)
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs gap-1 font-medium">
                <Clock className="w-3.5 h-3.5" /> Bejelentésre vár
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {bejelentesTipus === "T" || offboardingId ? (
              <>
                Biztosítási jogviszony megszűnésének kötelező hatósági bejelentése a NAV felé (Art. 22. §, Tbj. 40. §).
                A jogviszony megszűnését követő <strong>8 napon belül</strong> be kell küldeni!
              </>
            ) : bejelentesTipus === "V" ? (
              <>
                Biztosítási jogviszony adatváltozásának kötelező hatósági bejelentése a NAV felé (Art. 22. §, Tbj. 40. §).
                A változás bekövetkeztétől (hatálybalépésétől) számított <strong>8 napon belül</strong> be kell küldeni!
              </>
            ) : (
              <>
                Biztosítási jogviszony kezdetének kötelező hatósági bejelentése a NAV felé (Art. 22. §, Tbj. 40. §).
                Legkésőbb a munkába állás első napján, a munka megkezdése előtt be kell küldeni!
              </>
            )}
          </p>
        </div>

        {/* Gyors ÁNYK / ONYA Kimásolás */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyAll}
            className="h-8 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
          >
            {copiedKey === "all" ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            Összes adat másolása ÁNYK / ONYA-hoz
          </Button>
        </div>
      </div>

      {/* 2. Két fő oszlop: Bal: Adatlap & PDF, Jobb: NAV Nyugta igazolás */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bal oszlop: T1041 Űrlap és Adatlap PDF */}
        <div className="space-y-4 border rounded-xl p-5 bg-card">
          <div className="border-b pb-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              1. T1041 Bejelentési Adatlap (PDF)
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hivatalos belső nyilvántartási és beküldési adatlap generálása eaisyDocs fejlécbélyegzővel.
            </p>
          </div>

          <form onSubmit={handleGeneratePdf} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Bejelentés típusa</Label>
                <select
                  value={bejelentesTipus}
                  onChange={(e) => setBejelentesTipus(e.target.value as any)}
                  className="w-full h-8 text-xs px-2 rounded-md border border-input bg-background font-medium"
                >
                  <option value="U">Ú - Új jogviszony bejelentése</option>
                  <option value="V">V - Változás bejelentése</option>
                  <option value="T">T - Törlés / Megszűnés</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Beküldés / Keltezés</Label>
                <Input
                  type="date"
                  value={bekuldesDatuma}
                  onChange={(e) => setBekuldesDatuma(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Biztosított (Munkavállaló) Neve</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-8 text-xs font-medium"
                placeholder="Teljes név"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Adóazonosító Jel (10 jegy)</Label>
                <Input
                  value={adoazonositoJel}
                  onChange={(e) => setAdoazonositoJel(e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="8XXXXXXXXX"
                  maxLength={10}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">TAJ Szám (9 jegy)</Label>
                <Input
                  value={tajSzam}
                  onChange={(e) => setTajSzam(e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="123 456 789"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">FEOR-08 Kód</Label>
                <Input
                  value={feorKod}
                  onChange={(e) => setFeorKod(e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="4121"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Munkakör Megnevezése</Label>
                <Input
                  value={formMunkakor}
                  onChange={(e) => setFormMunkakor(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="pl. Flottakezelő"
                />
              </div>
            </div>

            {bejelentesTipus === "T" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center justify-between">
                      <span>Jogviszony Vége (Megszűnés napja)</span>
                      <span className="text-[10px] text-amber-600/80 font-normal">Kötelező</span>
                    </Label>
                    <Input
                      type="date"
                      value={jogviszonyVege || jogviszonyKezdete}
                      onChange={(e) => setJogviszonyVege(e.target.value)}
                      className="h-8 text-xs border-amber-500/40 bg-amber-500/5 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Jogviszony Kezdete (opcionális)
                    </Label>
                    <Input
                      type="date"
                      value={jogviszonyKezdete}
                      onChange={(e) => setJogviszonyKezdete(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Heti Munkaidő (Óra)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={hetiMunkaidoOra}
                      onChange={(e) => setHetiMunkaidoOra(Number(e.target.value))}
                      className="h-8 text-xs font-mono"
                      placeholder="40"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Megjegyzés / Ügyintézői feljegyzés</Label>
                    <Input
                      value={megjegyzes}
                      onChange={(e) => setMegjegyzes(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="pl. ÁNYK-n beküldve 2026.10.01 09:30"
                    />
                  </div>
                </div>
              </>
            ) : bejelentesTipus === "V" ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>Változás Jellege (NAV 13-as pótlap)</span>
                    <span className="text-[10px] text-primary font-normal">Szerződésmódosítás</span>
                  </Label>
                  <select
                    value={valtozasJellege}
                    onChange={(e) => setValtozasJellege(e.target.value)}
                    className="w-full h-8 text-xs px-2 rounded-md border border-input bg-background font-medium"
                  >
                    <option value="Heti munkaidő változása">Heti munkaidő változása (pl. teljes/részmunkaidő módosulás)</option>
                    <option value="Munkakör / FEOR változása">Munkakör / FEOR kód változása</option>
                    <option value="Biztosítás szünetelése (fizetés nélküli)">Biztosítás szünetelése (fizetés nélküli szabadság kezdete/vége)</option>
                    <option value="Személyi adat / lakcím változása">Személyi adat / lakcím változása</option>
                    <option value="Egyéb munkaszerződés-módosítás">Egyéb munkaszerződés-módosítás</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-sky-600 dark:text-sky-400 flex items-center justify-between">
                      <span>Változás Időpontja (hatálya)</span>
                      <span className="text-[10px] text-sky-600/80 font-normal">7. rovat (Kötelező)</span>
                    </Label>
                    <Input
                      type="date"
                      value={valtozasDatuma}
                      onChange={(e) => setValtozasDatuma(e.target.value)}
                      className="h-8 text-xs border-sky-500/40 bg-sky-500/5 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>Eredeti Jogviszony Kezdete</span>
                      <span className="text-[10px] text-muted-foreground">3. rovat (Azonosító)</span>
                    </Label>
                    <Input
                      type="date"
                      value={jogviszonyKezdete}
                      onChange={(e) => setJogviszonyKezdete(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Új Heti Munkaidő (Óra)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={hetiMunkaidoOra}
                      onChange={(e) => setHetiMunkaidoOra(Number(e.target.value))}
                      className="h-8 text-xs font-mono"
                      placeholder="40"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Megjegyzés / Ügyintézői feljegyzés</Label>
                    <Input
                      value={megjegyzes}
                      onChange={(e) => setMegjegyzes(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="pl. 2. sz. munkaszerződés-módosítás alapján"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Jogviszony Kezdete</Label>
                    <Input
                      type="date"
                      value={jogviszonyKezdete}
                      onChange={(e) => setJogviszonyKezdete(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Heti Munkaidő (Óra)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={hetiMunkaidoOra}
                      onChange={(e) => setHetiMunkaidoOra(Number(e.target.value))}
                      className="h-8 text-xs font-mono"
                      placeholder="40"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Megjegyzés / Ügyintézői feljegyzés (opcionális)</Label>
                  <Input
                    value={megjegyzes}
                    onChange={(e) => setMegjegyzes(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="pl. ÁNYK-n beküldve 2026.10.01 09:30"
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={isGenerating}
              className="w-full h-8 text-xs gap-1.5 font-medium mt-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  PDF Generálása folyamatban...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Hivatalos T1041 Adatlap (PDF) Generálása
                </>
              )}
            </Button>
          </form>

          {/* Generált Adatlap Dokumentum Kártya */}
          {t1041Data?.adatlapDoc && (
            <div className="pt-3 border-t space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Generált Adatlap:</span>
                {t1041Data.adatlapDoc.iktatoszam ? (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-mono">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    Iktatva: {t1041Data.adatlapDoc.iktatoszam}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                    Aktiváláskor iktatódik (1.3)
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <PdfViewerDialog
                  url={t1041Data.adatlapDoc.displayUrl || t1041Data.adatlapDoc.url}
                  title="NAV T1041 Hivatalos Adatlap"
                  trigger={
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1 flex-1">
                      <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                      Megtekintés
                    </Button>
                  }
                />
                <a
                  href={t1041Data.adatlapDoc.displayUrl || t1041Data.adatlapDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className={`${buttonVariants({ variant: "outline", size: "sm" })} h-7 text-xs gap-1`}
                >
                  <Download className="w-3.5 h-3.5" />
                  Letöltés
                </a>

                {dolgozoId && !t1041Data.adatlapDoc.iktatoszam && (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="h-7 text-xs gap-1 bg-primary text-primary-foreground"
                    onClick={() => handleFileExisting(t1041Data.adatlapDoc.id, "adatlap")}
                    disabled={isFileLoading}
                  >
                    {isFileLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                    Iktatás
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Jobb oszlop: NAV Nyugta Igazolás Feltöltése */}
        <div className="space-y-4 border rounded-xl p-5 bg-card flex flex-col justify-between">
          <div className="space-y-3">
            <div className="border-b pb-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                2. NAV Befogadási Nyugta (Hivatalos Igazolás)
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                A NAV ÁNYK vagy ONYA által visszaküldött elektronikus befogadási nyugta (.pdf) feltöltése.
              </p>
            </div>

            {/* Ha már fel van töltve a nyugta */}
            {t1041Data?.nyugtaDoc ? (
              <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h5 className="text-sm font-bold text-foreground">
                      Hivatalos NAV Nyugta Érvényesítve
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      A hatósági bejelentés igazolása sikeresen rögzítve az eaisyDocs rendszerben.
                    </p>
                    <div className="text-[11px] font-mono text-muted-foreground pt-1 truncate">
                      Dokumentum: {t1041Data.nyugtaDoc.nev}
                    </div>
                    {t1041Data.nyugtaDoc.iktatoszam ? (
                      <div className="text-xs font-semibold text-emerald-600 pt-0.5 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Iktatószám: {t1041Data.nyugtaDoc.iktatoszam} (1.3 Hatósági bejelentések)
                      </div>
                    ) : (
                      <div className="text-xs text-amber-600 pt-0.5 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Fiókaktiváláskor automatikusan iktatásra kerül.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/20">
                  <PdfViewerDialog
                    url={t1041Data.nyugtaDoc.displayUrl || t1041Data.nyugtaDoc.url}
                    title="Hivatalos NAV T1041 Befogadási Nyugta"
                    trigger={
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 flex-1">
                        <FileCheck className="w-3.5 h-3.5" />
                        Nyugta Megtekintése
                      </Button>
                    }
                  />
                  <a
                    href={t1041Data.nyugtaDoc.displayUrl || t1041Data.nyugtaDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className={`${buttonVariants({ variant: "outline", size: "sm" })} h-7 text-xs gap-1 border-emerald-500/30`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Letöltés
                  </a>

                  {dolgozoId && !t1041Data.nyugtaDoc.iktatoszam && (
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleFileExisting(t1041Data.nyugtaDoc.id, "nyugta")}
                      disabled={isFileLoading}
                    >
                      {isFileLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                      Iktatás
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-border rounded-xl p-4 space-y-3 bg-muted/10 text-center">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">
                    Még nincs feltöltve a NAV befogadási nyugta
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    A T1041 ÁNYK / ONYA beküldése után a NAV e-Papíron vagy Ügyfélkapun keresztül küld egy elektronikus nyugtát.
                    A feladat lezárásához és az eaisyDocs hatósági iktatáshoz töltsd fel ide a PDF-et.
                  </p>
                </div>
              </div>
            )}

            {/* Feltöltési űrlap (mindig elérhető frissítéshez / feltöltéshez) */}
            <form onSubmit={handleUploadReceipt} className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  {t1041Data?.nyugtaDoc ? "Nyugta cseréje / Frissítés" : "NAV Nyugta PDF Fájl Kiválasztása"}
                </Label>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="h-9 text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </div>

              <Button
                type="submit"
                disabled={isUploading || !receiptFile}
                className="w-full h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Feltöltés és érvényesítés...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    NAV Nyugta Feltöltése és Feladat Lezárása
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="pt-3 border-t text-[11px] text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              A feltöltött nyugta azonnal készre állítja a {offboardingId || bejelentesTipus === "T" ? "kiléptetés" : "onboarding"} T1041 feladatát, és bekerül a személyi dossziéba.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
