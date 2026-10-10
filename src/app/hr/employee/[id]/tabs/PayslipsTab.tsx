"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog"
import { 
  Receipt, 
  Eye, 
  Download, 
  Settings2, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Loader2, 
  Sparkles,
  Calendar,
  AlertCircle
} from "lucide-react"
import { KpiCard } from "@/components/kpi-card"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
import { formatHufCurrency, getMonthNameHu } from "@/utils/hr/payslip-calculator"
import { downloadPayslipPdfAction, updateSinglePayslipAction } from "@/app/hr/payroll/actions"
import { toast } from "sonner"

export interface EmployeePayslipItem {
  id: string
  dolgozo_id: string
  ev: number
  honap: number
  statusz: "tervezet" | "kikuldve" | "atveve"
  brutto_alapber: number
  brutto_osszesen: number
  alapber_reszlet?: number
  tervezett_munkanap?: number
  ledolgozott_munkanap?: number
  szabadsag_nap?: number
  betegszabadsag_nap?: number
  tulora_ora?: number
  kedvezmeny_25_ev_alatti: boolean
  csaladi_kedvezmeny_osszeg: number
  egyeb_adokedvezmeny_osszeg: number
  szja_levonas: number
  tb_jarulek_levonas: number
  letiltas_egyeb_levonas: number
  levonasok_osszesen: number
  netto_kifizetendo: number
  szocho_munkaltatoi: number
  bonusz_jutalom: number
  cafeteria_brutto: number
  kifizetes_hatarido: string | null
  kifizetes_modja: string | null
  kikuldes_datuma: string | null
  atvetel_datuma: string | null
  atvetel_ip: string | null
}

interface PayslipsTabProps {
  employeeId: string
  employeeName: string
  isHrOrAdmin: boolean
  initialPayslips: EmployeePayslipItem[]
}

export function PayslipsTab({
  employeeId,
  employeeName,
  isHrOrAdmin,
  initialPayslips
}: PayslipsTabProps) {
  const [payslips, setPayslips] = useState<EmployeePayslipItem[]>(initialPayslips)
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null)
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null)
  const [previewPdfTitle, setPreviewPdfTitle] = useState<string>("")

  // Szerkesztő modál állapota
  const [editingRow, setEditingRow] = useState<EmployeePayslipItem | null>(null)
  const [editBonus, setEditBonus] = useState<number>(0)
  const [editUnder25, setEditUnder25] = useState<boolean>(false)
  const [editFamily, setEditFamily] = useState<number>(0)
  const [editOtherTax, setEditOtherTax] = useState<number>(0)
  const [editDeduction, setEditDeduction] = useState<number>(0)
  const [editSaving, setEditSaving] = useState<boolean>(false)

  // Szűrés év szerint
  const years = Array.from(new Set(payslips.map(p => p.ev))).sort((a, b) => b - a)
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<string>("all")

  const filteredPayslips = selectedYear === "all" 
    ? payslips 
    : payslips.filter(p => p.ev.toString() === selectedYear)

  // Statisztikák számítása
  const latestPayslip = payslips[0]
  const currentYearTotalNet = payslips
    .filter(p => p.ev === currentYear && p.statusz !== "tervezet")
    .reduce((sum, p) => sum + Number(p.netto_kifizetendo || 0), 0)

  const publishedCount = payslips.filter(p => p.statusz === "kikuldve" || p.statusz === "atveve").length
  const acknowledgedCount = payslips.filter(p => p.statusz === "atveve").length

  // PDF Megtekintés
  const handleViewPdf = async (item: EmployeePayslipItem) => {
    setLoadingPdfId(item.id)
    const res = await downloadPayslipPdfAction(item.id)
    setLoadingPdfId(null)

    if (res.base64) {
      setPreviewPdfUrl(`data:application/pdf;base64,${res.base64}`)
      const isDraft = item.statusz === "tervezet"
      setPreviewPdfTitle(`Bérjegyzék ${isDraft ? "(Tervezet) " : ""}- ${employeeName} - ${item.ev}/${item.honap}`)
    } else {
      toast.error(res.error || "Nem sikerült a PDF előállítása.")
    }
  }

  // PDF Letöltés
  const handleDownloadPdf = async (item: EmployeePayslipItem) => {
    setLoadingPdfId(item.id)
    const res = await downloadPayslipPdfAction(item.id)
    setLoadingPdfId(null)

    if (res.base64) {
      const link = document.createElement("a")
      link.href = `data:application/pdf;base64,${res.base64}`
      const safeName = employeeName.replace(/[^a-zA-Z0-9_\-áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/g, "_")
      link.download = res.fileName || `berjegyzek_${safeName}_${item.ev}_${item.honap}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("Bérjegyzék PDF letöltve!")
    } else {
      toast.error(res.error || "Nem sikerült a PDF letöltése.")
    }
  }

  // Korrekció megnyitása
  const openEditDialog = (item: EmployeePayslipItem) => {
    setEditingRow(item)
    setEditBonus(item.bonusz_jutalom || 0)
    setEditUnder25(Boolean(item.kedvezmeny_25_ev_alatti))
    setEditFamily(item.csaladi_kedvezmeny_osszeg || 0)
    setEditOtherTax(item.egyeb_adokedvezmeny_osszeg || 0)
    setEditDeduction(item.letiltas_egyeb_levonas || 0)
  }

  // Korrekció mentése
  const handleSaveEdit = async () => {
    if (!editingRow) return
    setEditSaving(true)

    const res = await updateSinglePayslipAction({
      payslipId: editingRow.id,
      dolgozoId: employeeId,
      year: editingRow.ev,
      month: editingRow.honap,
      bonuszJutalom: editBonus,
      kedvezmeny25EvAlatti: editUnder25,
      csaladiKedvezmenyOsszeg: editFamily,
      egyebAdokedvezmeny: editOtherTax,
      letiltasLevonas: editDeduction
    })

    setEditSaving(false)
    if (res.success) {
      toast.success("Bérpapír adatok sikeresen frissítve!")
      setEditingRow(null)
      // Lokális frissítés
      setPayslips(prev => prev.map(p => {
        if (p.id === editingRow.id) {
          return {
            ...p,
            bonusz_jutalom: editBonus,
            kedvezmeny_25_ev_alatti: editUnder25,
            csaladi_kedvezmeny_osszeg: editFamily,
            egyeb_adokedvezmeny_osszeg: editOtherTax,
            letiltas_egyeb_levonas: editDeduction
          }
        }
        return p
      }))
    } else {
      toast.error(res.error || "Nem sikerült a módosítás mentése.")
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Fejléc & Áttekintés */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-teal-600" />
            Havi Bérpapírok & Bérjegyzékek (Mt. 155. §)
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {employeeName} munkavállaló havi törvényes munkabér elszámolásai, adókedvezményei és átvételi nyugtái.
          </p>
        </div>

        {years.length > 0 && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Év szűrés:</Label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-xs border rounded-md px-2 py-1 bg-background text-foreground"
            >
              <option value="all">Összes év ({payslips.length})</option>
              {years.map(y => (
                <option key={y} value={y.toString()}>{y}. év</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Statisztikai KPI Sáv */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Legutóbbi Nettó Bér"
          value={latestPayslip ? formatHufCurrency(latestPayslip.netto_kifizetendo) : "0 Ft"}
          sub={latestPayslip ? `${latestPayslip.ev}. ${getMonthNameHu(latestPayslip.honap)}` : "Még nincs adat"}
        />
        <KpiCard
          label={`${currentYear}. Évi Nettó Összesen`}
          value={formatHufCurrency(currentYearTotalNet)}
          sub="Idei elszámolt kifizetések"
        />
        <KpiCard
          label="Átvéve és Nyugtázva"
          value={publishedCount > 0 ? `${acknowledgedCount} / ${publishedCount}` : "0"}
          sub={publishedCount > 0 ? `${Math.round((acknowledgedCount / publishedCount) * 100)}% aláírva` : "Nincs kiküldve"}
        />
        <KpiCard
          label="Elszámolt Hónapok"
          value={`${payslips.length} hó`}
          sub="Összes tárolt bérpapír"
        />
      </div>

      {/* 3. Bérpapírok Táblázata */}
      {filteredPayslips.length === 0 ? (
        <Card className="border border-dashed p-8 text-center bg-card">
          <div className="mx-auto w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
            <Receipt className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-foreground text-sm">Még nincsenek előállított bérpapírok</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Ehhez a munkavállalóhoz még nem került előállításra havi bérjegyzék. A Bérszámfejtés munkaasztalon állíthatók elő a havi elszámolások.
          </p>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b text-muted-foreground font-medium uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Időszak</th>
                  <th className="py-2.5 px-3 text-right">Alapbér</th>
                  <th className="py-2.5 px-3 text-right">Bruttó összesen</th>
                  <th className="py-2.5 px-3">Kedvezmények</th>
                  <th className="py-2.5 px-3 text-right">Levonások</th>
                  <th className="py-2.5 px-3 text-right">Nettó kifizetendő</th>
                  <th className="py-2.5 px-3">Állapot</th>
                  <th className="py-2.5 px-3 text-right">Műveletek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredPayslips.map((p) => {
                  const isAcknowledged = p.statusz === "atveve"
                  const isPending = p.statusz === "kikuldve"
                  const isDraft = p.statusz === "tervezet"

                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      {/* Időszak */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{p.ev}. {getMonthNameHu(p.honap)}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {p.kifizetes_hatarido ? `Fizetési határidő: ${p.kifizetes_hatarido}` : "Banki átutalás"}
                        </div>
                      </td>

                      {/* Alapbér */}
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                        {formatHufCurrency(p.brutto_alapber)}
                      </td>

                      {/* Bruttó összesen */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-foreground">
                        {formatHufCurrency(p.brutto_osszesen)}
                        {p.bonusz_jutalom > 0 && (
                          <div className="text-[10px] text-teal-600 font-normal">
                            +{formatHufCurrency(p.bonusz_jutalom)} bónusz
                          </div>
                        )}
                      </td>

                      {/* Kedvezmények */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {p.kedvezmeny_25_ev_alatti && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-teal-500/30 text-teal-600 bg-teal-500/5">
                              25 év alatti
                            </Badge>
                          )}
                          {p.csaladi_kedvezmeny_osszeg > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-500/30 text-indigo-600 bg-indigo-500/5">
                              Családi: {formatHufCurrency(p.csaladi_kedvezmeny_osszeg)}
                            </Badge>
                          )}
                          {p.egyeb_adokedvezmeny_osszeg > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/30 text-purple-600 bg-purple-500/5">
                              Személyi: {formatHufCurrency(p.egyeb_adokedvezmeny_osszeg)}
                            </Badge>
                          )}
                          {!p.kedvezmeny_25_ev_alatti && p.csaladi_kedvezmeny_osszeg === 0 && p.egyeb_adokedvezmeny_osszeg === 0 && (
                            <span className="text-[11px] text-muted-foreground">-</span>
                          )}
                        </div>
                      </td>

                      {/* Levonások */}
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                        -{formatHufCurrency(p.levonasok_osszesen)}
                      </td>

                      {/* Nettó kifizetendő */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-sm text-teal-600 dark:text-teal-400">
                        {formatHufCurrency(p.netto_kifizetendo)}
                      </td>

                      {/* Állapot */}
                      <td className="py-3 px-3">
                        {isAcknowledged ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Átvéve: {p.atvetel_datuma ? new Date(p.atvetel_datuma).toLocaleDateString("hu-HU") : "Igen"}</span>
                          </div>
                        ) : isPending ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>Átvételre vár</span>
                          </div>
                        ) : isDraft ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span>Tervezet</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Generálásra vár</span>
                          </div>
                        )}
                      </td>

                      {/* Műveletek */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            title="Bérjegyzék PDF megtekintése"
                            onClick={() => handleViewPdf(p)}
                            disabled={loadingPdfId === p.id}
                          >
                            {loadingPdfId === p.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </Button>

                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            title="Bérjegyzék PDF közvetlen letöltése"
                            onClick={() => handleDownloadPdf(p)}
                            disabled={loadingPdfId === p.id}
                          >
                            <Download className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>

                          {isHrOrAdmin && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 hover:border-teal-500/40 hover:text-teal-600 transition-colors"
                              title="Bérelemek és kedvezmények szerkesztése"
                              onClick={() => openEditDialog(p)}
                            >
                              <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Egyéni Bérpapír Korrekció Dialog (HR Admin számára) */}
      {editingRow && (
        <Dialog open={Boolean(editingRow)} onOpenChange={(open) => !open && setEditingRow(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Bérpapír Korrekció – {editingRow.ev}. {getMonthNameHu(editingRow.honap)}</DialogTitle>
              <DialogDescription>
                {employeeName} bérjegyzékéhez tartozó egyedi bónusz, adókedvezmények és levonások beállítása.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 border rounded-lg text-xs">
                <div>
                  <span className="text-muted-foreground">Szerződéses alapbér:</span>
                  <div className="font-bold text-sm text-foreground">{formatHufCurrency(editingRow.brutto_alapber)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Nettó kifizetendő:</span>
                  <div className="font-bold text-sm text-teal-600">{formatHufCurrency(editingRow.netto_kifizetendo)}</div>
                </div>
              </div>

              {/* Teljesítmény bónusz */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Teljesítmény bónusz / Jutalom (Ft)</Label>
                <Input
                  type="number"
                  value={editBonus}
                  onChange={(e) => setEditBonus(Number(e.target.value))}
                  placeholder="0"
                />
              </div>

              {/* 25 év alattiak kedvezménye */}
              <div className="flex items-center justify-between border rounded-lg p-3">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">25 év alatti fiatalok SZJA-mentessége</Label>
                  <p className="text-[11px] text-muted-foreground">
                    A törvényes keretig (576.601 Ft) 0% SZJA kerül megállapításra.
                  </p>
                </div>
                <Switch
                  checked={editUnder25}
                  onCheckedChange={setEditUnder25}
                />
              </div>

              {/* Családi adó- és járulékkedvezmény */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Családi adó- és járulékkedvezmény összege (Ft)</Label>
                <Input
                  type="number"
                  value={editFamily}
                  onChange={(e) => setEditFamily(Number(e.target.value))}
                  placeholder="Pl. 20000 vagy 40000"
                />
              </div>

              {/* Egyéb személyi kedvezmény */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Egyéb személyi adókedvezmény (Ft)</Label>
                <Input
                  type="number"
                  value={editOtherTax}
                  onChange={(e) => setEditOtherTax(Number(e.target.value))}
                  placeholder="0"
                />
              </div>

              {/* Bírósági / munkabér letiltás */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-rose-600">Bírósági letiltás / Levonás (Ft)</Label>
                <Input
                  type="number"
                  value={editDeduction}
                  onChange={(e) => setEditDeduction(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingRow(null)}>
                Mégsem
              </Button>
              <Button 
                size="sm" 
                className="bg-teal-600 hover:bg-teal-700 text-white" 
                onClick={handleSaveEdit}
                disabled={editSaving}
              >
                {editSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Mentés...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Módosítások mentése
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 5. PDF Előnézeti Modál */}
      <PdfViewerDialog
        url={previewPdfUrl || undefined}
        title={previewPdfTitle}
        open={Boolean(previewPdfUrl)}
        onOpenChange={(open) => !open && setPreviewPdfUrl(null)}
      />
    </div>
  )
}
