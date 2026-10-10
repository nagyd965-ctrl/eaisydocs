"use client"

import { useState } from "react"
import { 
  Receipt, 
  Download, 
  Eye, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Building, 
  FileText,
  AlertCircle,
  Loader2,
  Landmark,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
import { formatHufCurrency, getMonthNameHu } from "@/utils/hr/payslip-calculator"
import { 
  acknowledgeMyPayslipAction, 
  downloadMyPayslipAction,
  type MyPayslipItem 
} from "@/app/hr/self-service/payroll/actions"
import { toast } from "sonner"

export interface MyPayslipsViewProps {
  initialItems: MyPayslipItem[]
}

export function MyPayslipsView({ initialItems }: MyPayslipsViewProps) {
  const [items, setItems] = useState<MyPayslipItem[]>(initialItems)
  const [selectedId, setSelectedId] = useState<string>(initialItems[0]?.id || "")
  
  // Átvételi nyugtázás megerősítő modál
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [acknowledging, setAcknowledging] = useState(false)

  // PDF előnézet modal
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null)
  const [previewPdfTitle, setPreviewPdfTitle] = useState<string>("")
  const [loadingPdf, setLoadingPdf] = useState(false)

  const selectedItem = items.find(i => i.id === selectedId) || items[0]

  const handleAcknowledge = async () => {
    if (!selectedItem) return
    setAcknowledging(true)

    const res = await acknowledgeMyPayslipAction(selectedItem.id)
    setAcknowledging(false)
    setConfirmModalOpen(false)

    if (res.success) {
      toast.success("Bérpapír átvétele sikeresen igazolva és naplózva (Mt. 155. §)!")
      setItems(prev => prev.map(p => p.id === selectedItem.id ? { ...p, statusz: "atveve", atvetelDatuma: new Date().toISOString() } : p))
    } else {
      toast.error(res.error || "Nem sikerült az átvétel igazolása.")
    }
  }

  const handleViewPdf = async () => {
    if (!selectedItem) return
    setLoadingPdf(true)
    const res = await downloadMyPayslipAction(selectedItem.id)
    setLoadingPdf(false)

    if (res.base64) {
      setPreviewPdfUrl(`data:application/pdf;base64,${res.base64}`)
      setPreviewPdfTitle(`Bérjegyzék - ${selectedItem.ev}/${selectedItem.honap}`)
    } else {
      toast.error(res.error || "Nem sikerült a PDF előállítása.")
    }
  }

  const handleDownloadPdf = async () => {
    if (!selectedItem) return
    setLoadingPdf(true)
    const res = await downloadMyPayslipAction(selectedItem.id)
    setLoadingPdf(false)

    if (res.base64) {
      const link = document.createElement("a")
      link.href = `data:application/pdf;base64,${res.base64}`
      link.download = res.fileName || `berjegyzek_${selectedItem.ev}_${selectedItem.honap}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("Bérjegyzék letöltve!")
    } else {
      toast.error(res.error || "Nem sikerült a letöltés.")
    }
  }

  if (items.length === 0) {
    return (
      <div className="border border-border/70 rounded-xl p-12 text-center bg-card max-w-2xl mx-auto space-y-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
          <Receipt className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">Még nincs közzétett bérpapírod</h3>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
          A havi elszámolásokat a bérszámfejtés és a HR a tárgyhónapot követő hónap 10. napjáig teszi közzé az Mt. 155. § alapján. Amint elkészül egy új bérjegyzék, itt jelenik meg.
        </p>
      </div>
    )
  }

  const isAcknowledged = selectedItem?.statusz === "atveve"

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Bal oldal: Hónapok listája */}
      <div className="lg:col-span-4 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Elérhető Havi Bérjegyzékek ({items.length})
        </div>

        <div className="space-y-2">
          {items.map((item) => {
            const isSelected = item.id === selectedItem?.id
            const isAck = item.statusz === "atveve"

            return (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  isSelected
                    ? "bg-card border-teal-500/50 ring-1 ring-teal-500/30 shadow-xs"
                    : "bg-card/60 hover:bg-card border-border/70 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                    isSelected
                      ? "bg-teal-500/10 text-teal-600 border-teal-500/20"
                      : "bg-muted text-muted-foreground border-border/50"
                  }`}>
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {item.ev}. {getMonthNameHu(item.honap)}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5 font-medium">
                      Nettó: {formatHufCurrency(item.nettoKifizetendo)}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {isAck ? (
                    <Badge variant="outline" className="text-[10px] font-medium border-emerald-500/30 text-emerald-600 bg-emerald-500/5 gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Átvéve
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-medium border-amber-500/30 text-amber-600 bg-amber-500/5 gap-1">
                      <Clock className="w-3 h-3" /> Nyugtázandó
                    </Badge>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Jobb oldal: Részletes Bérpapír Adatlap és Műveletek */}
      {selectedItem && (
        <div className="lg:col-span-8 space-y-5">
          {/* Fő Kártya: Kiemelt Nettó és Átvételi Záradék */}
          <div className="border border-border/70 rounded-xl bg-card p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Hivatalos Bérjegyzék
                </span>
                <h2 className="text-xl font-bold text-foreground mt-0.5">
                  {selectedItem.ev}. {getMonthNameHu(selectedItem.honap)} havi elszámolás
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-8"
                  onClick={handleViewPdf}
                  disabled={loadingPdf}
                >
                  {loadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                  Előnézet
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-8"
                  onClick={handleDownloadPdf}
                  disabled={loadingPdf}
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF Letöltése
                </Button>
              </div>
            </div>

            {/* Kiemelt Nettó Box */}
            <div className="border-2 border-teal-500/30 bg-teal-500/5 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                  Nettó Kifizetendő Munkabér
                </div>
                <div className="text-2xl font-black text-teal-800 dark:text-teal-300 font-mono mt-0.5">
                  {formatHufCurrency(selectedItem.nettoKifizetendo)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-muted-foreground" />
                  {selectedItem.bankszamlaszam ? `Átutalás: ${selectedItem.bankszamlaszam}` : "Bankszámlaszám rögzítésre vár"}
                </div>
              </div>

              {/* Átvételi állapot */}
              <div className="shrink-0">
                {isAcknowledged ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div>Elektronikusan átvéve</div>
                      <div className="text-[10px] text-muted-foreground font-normal">
                        {selectedItem.atvetelDatuma ? new Date(selectedItem.atvetelDatuma).toLocaleString("hu-HU") : "Nyugtázva"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setConfirmModalOpen(true)}
                    className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Átvételt igazolom (Mt. 155. §)
                  </Button>
                )}
              </div>
            </div>

            {/* Figyelmeztető sáv, ha még nincs átvéve */}
            {!isAcknowledged && (
              <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-3 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div className="leading-relaxed">
                  A Munka Törvénykönyve (Mt.) 155. § alapján a munkabér elszámolásáról szóló tájékoztatás átvétele kötelező. Kérjük, tekintsd át a tételeket, és kattints az <strong>„Átvételt igazolom”</strong> gombra a digitális átvételi nyugta rögzítéséhez!
                </div>
              </div>
            )}
          </div>

          {/* Tételes Bontás Táblázatok */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Jövedelem elemek (Bruttó) */}
            <div className="border border-border/70 rounded-xl bg-card p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>1. Bruttó Jövedelem Elemek</span>
                <span className="font-mono text-foreground font-bold">{formatHufCurrency(selectedItem.bruttoOsszesen)}</span>
              </h3>

              <div className="divide-y text-xs">
                <div className="py-2 flex justify-between">
                  <span className="text-muted-foreground">Szerződés szerinti alapbér:</span>
                  <span className="font-mono font-medium">{formatHufCurrency(selectedItem.bruttoAlapber)}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-muted-foreground">Ledolgozott napok ({selectedItem.ledolgozottMunkanap} nap):</span>
                  <span className="font-mono font-medium">{formatHufCurrency(selectedItem.bruttoAlapber)}</span>
                </div>
                {selectedItem.szabadsagNap > 0 && (
                  <div className="py-2 flex justify-between">
                    <span className="text-muted-foreground">Fizetett szabadság ({selectedItem.szabadsagNap} nap):</span>
                    <span className="font-mono font-medium text-emerald-600">Elszámolva</span>
                  </div>
                )}
                {selectedItem.betegszabadsagNap > 0 && (
                  <div className="py-2 flex justify-between">
                    <span className="text-muted-foreground">Betegszabadság (70%, {selectedItem.betegszabadsagNap} nap):</span>
                    <span className="font-mono font-medium text-amber-600">Elszámolva</span>
                  </div>
                )}
                {selectedItem.tuloraOra > 0 && (
                  <div className="py-2 flex justify-between">
                    <span className="text-muted-foreground">Túlóra pótlék ({selectedItem.tuloraOra} óra):</span>
                    <span className="font-mono font-medium">Elszámolva</span>
                  </div>
                )}
                {selectedItem.bonuszJutalom > 0 && (
                  <div className="py-2 flex justify-between">
                    <span className="text-muted-foreground">Teljesítmény bónusz / Jutalom:</span>
                    <span className="font-mono font-semibold text-emerald-600">+{formatHufCurrency(selectedItem.bonuszJutalom)}</span>
                  </div>
                )}
                {selectedItem.cafeteriaBrutto > 0 && (
                  <div className="py-2 flex justify-between">
                    <span className="text-muted-foreground">Béren kívüli juttatás (Cafeteria):</span>
                    <span className="font-mono font-medium">+{formatHufCurrency(selectedItem.cafeteriaBrutto)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Törvényes Levonások és Kedvezmények */}
            <div className="border border-border/70 rounded-xl bg-card p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>2. Levonások & Kedvezmények</span>
                <span className="font-mono text-rose-600 font-bold">-{formatHufCurrency(selectedItem.levonasokOsszesen)}</span>
              </h3>

              <div className="divide-y text-xs">
                {/* 25 év alatti kedvezmény */}
                {selectedItem.kedvezmeny25EvAlatti && (
                  <div className="py-2 flex justify-between items-center text-teal-600 bg-teal-500/5 px-2 rounded">
                    <span>25 év alattiak SZJA-mentessége:</span>
                    <span className="font-semibold font-mono">0% SZJA</span>
                  </div>
                )}

                {/* Családi kedvezmény */}
                {selectedItem.csaladiKedvezmenyOsszeg > 0 && (
                  <div className="py-2 flex justify-between items-center text-blue-600 bg-blue-500/5 px-2 rounded">
                    <span>Családi adókedvezmény:</span>
                    <span className="font-semibold font-mono">+{formatHufCurrency(selectedItem.csaladiKedvezmenyOsszeg)}</span>
                  </div>
                )}

                <div className="py-2 flex justify-between">
                  <span className="text-muted-foreground">SZJA előleg (15%):</span>
                  <span className="font-mono font-medium text-rose-600">-{formatHufCurrency(selectedItem.szjaLevonas)}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-muted-foreground">TB járulék (18,5%):</span>
                  <span className="font-mono font-medium text-rose-600">-{formatHufCurrency(selectedItem.tbJarulekLevonas)}</span>
                </div>
                {selectedItem.letiltasEgyebLevonas > 0 && (
                  <div className="py-2 flex justify-between">
                    <span className="text-muted-foreground">Bírósági letiltás:</span>
                    <span className="font-mono font-medium text-rose-600">-{formatHufCurrency(selectedItem.letiltasEgyebLevonas)}</span>
                  </div>
                )}
                <div className="py-2 flex justify-between text-muted-foreground">
                  <span>Munkáltatói SZOCHO (13%, tájékoztató):</span>
                  <span className="font-mono">{formatHufCurrency(selectedItem.szochoMunkaltatoi)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Átvételt igazoló megerősítő Dialógus */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              Bérjegyzék Átvételének Igazolása (Mt. 155. §)
            </DialogTitle>
            <DialogDescription>
              A „Nyugtázom és Átveszem” gombra kattintva elektronikus aláírásoddal igazolod, hogy a(z) <strong>{selectedItem?.ev}. {selectedItem && getMonthNameHu(selectedItem.honap)}</strong> havi munkabér elszámolásodat megismerted és átvetted.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-muted/30 border rounded-lg space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nettó kifizetendő összeg:</span>
              <span className="font-bold text-teal-600 font-mono text-sm">{selectedItem && formatHufCurrency(selectedItem.nettoKifizetendo)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kézbesítés módja:</span>
              <span>eaisyHR Elektronikus Önkiszolgáló Portál</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Megőrzési idő:</span>
              <span>50 év (Tbj. / Lvt.)</span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmModalOpen(false)}>
              Mégsem
            </Button>
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
              onClick={handleAcknowledge}
              disabled={acknowledging}
            >
              {acknowledging && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Nyugtázom és Átveszem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Előnézet Dialógus */}
      {previewPdfUrl && (
        <PdfViewerDialog
          url={previewPdfUrl}
          title={previewPdfTitle}
          open={Boolean(previewPdfUrl)}
          onOpenChange={(open) => !open && setPreviewPdfUrl(null)}
        />
      )}
    </div>
  )
}
