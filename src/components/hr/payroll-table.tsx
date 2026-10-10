"use client"

import { useState, useTransition, useMemo } from "react"
import { 
  Receipt, 
  Download, 
  Eye, 
  Settings2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Send, 
  Building, 
  Loader2,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { TableToolbar } from "@/components/table-toolbar/table-toolbar"
import { KpiCard } from "@/components/kpi-card"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
import { formatHufCurrency } from "@/utils/hr/payslip-calculator"
import { 
  getPayrollDashboardData, 
  generateMonthlyPayslipsAction, 
  updateSinglePayslipAction,
  downloadPayslipPdfAction,
  type PayrollDashboardData, 
  type PayrollDashboardRow 
} from "@/app/hr/payroll/actions"
import { toast } from "sonner"

export interface PayrollTableProps {
  initialData: PayrollDashboardData
}

export function PayrollTable({ initialData }: PayrollTableProps) {
  const [data, setData] = useState<PayrollDashboardData>(initialData)
  const [year, setYear] = useState<number>(initialData.year)
  const [month, setMonth] = useState<number>(initialData.month)
  const [search, setSearch] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [deptFilter, setDeptFilter] = useState<string>("all")
  const [isPending, startTransition] = useTransition()

  // Módosító modal állapota
  const [editingRow, setEditingRow] = useState<PayrollDashboardRow | null>(null)
  const [editBonus, setEditBonus] = useState<number>(0)
  const [editUnder25, setEditUnder25] = useState<boolean>(false)
  const [editFamily, setEditFamily] = useState<number>(0)
  const [editOtherTax, setEditOtherTax] = useState<number>(0)
  const [editDeduction, setEditDeduction] = useState<number>(0)
  const [editSaving, setEditSaving] = useState<boolean>(false)

  // PDF előnézet modal állapota
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null)
  const [previewPdfTitle, setPreviewPdfTitle] = useState<string>("")
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null)

  // Kötegelt generálás megerősítő ablak
  const [batchDialogOpen, setBatchDialogOpen] = useState<boolean>(false)

  // Hónapváltás
  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear)
    setMonth(newMonth)
    startTransition(async () => {
      const res = await getPayrollDashboardData(newYear, newMonth)
      if (res.data) {
        setData(res.data)
      } else {
        toast.error(res.error || "Nem sikerült betölteni a hónap adatait.")
      }
    })
  }

  const prevMonth = () => {
    if (month === 1) handleMonthChange(year - 1, 12)
    else handleMonthChange(year, month - 1)
  }

  const nextMonth = () => {
    if (month === 12) handleMonthChange(year + 1, 1)
    else handleMonthChange(year, month + 1)
  }

  // Részlegek listája szűréshez
  const departments = useMemo(() => {
    const set = new Set<string>()
    data.items.forEach(i => {
      if (i.reszleg) set.add(i.reszleg)
    })
    return Array.from(set)
  }, [data.items])

  // Szűrt lista
  const filteredItems = useMemo(() => {
    return data.items.filter(item => {
      // Szöveges keresés
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = item.nev.toLowerCase().includes(q)
        const matchTaj = item.tajSzam.toLowerCase().includes(q)
        const matchAdo = item.adoazonosito.toLowerCase().includes(q)
        const matchMunkakor = item.munkakor.toLowerCase().includes(q)
        const matchReszleg = item.reszleg.toLowerCase().includes(q)
        if (!matchName && !matchTaj && !matchAdo && !matchMunkakor && !matchReszleg) return false
      }

      // Státusz szűrés
      if (statusFilter !== "all" && item.statusz !== statusFilter) {
        return false
      }

      // Részleg szűrés
      if (deptFilter !== "all" && item.reszleg !== deptFilter) {
        return false
      }

      return true
    })
  }, [data.items, search, statusFilter, deptFilter])

  // Kötegelt generálás végrehajtása
  const handleBatchGenerate = () => {
    setBatchDialogOpen(false)
    startTransition(async () => {
      const res = await generateMonthlyPayslipsAction({
        year,
        month,
        publishImmediately: true
      })

      if (res.success) {
        toast.success(`Sikeresen előállítva és közzétéve ${res.count} db havi bérpapír (Mt. 155. §)!`)
        const refresh = await getPayrollDashboardData(year, month)
        if (refresh.data) setData(refresh.data)
      } else {
        toast.error(res.error || "Hiba történt a bérpapírok generálásakor.")
      }
    })
  }

  // Bérpapír szerkesztése
  const openEditDialog = (item: PayrollDashboardRow) => {
    setEditingRow(item)
    setEditBonus(item.bonuszJutalom || 0)
    setEditUnder25(item.kedvezmeny25EvAlatti)
    setEditFamily(item.csaladiKedvezmenyOsszeg || 0)
    setEditOtherTax(item.egyebAdokedvezmeny || 0)
    setEditDeduction(item.letiltasEgyebLevonas || 0)
  }

  const handleSaveEdit = async () => {
    if (!editingRow) return
    setEditSaving(true)

    const res = await updateSinglePayslipAction({
      payslipId: editingRow.berpapirId,
      dolgozoId: editingRow.dolgozoId,
      year,
      month,
      bonuszJutalom: editBonus,
      kedvezmeny25EvAlatti: editUnder25,
      csaladiKedvezmenyOsszeg: editFamily,
      egyebAdokedvezmeny: editOtherTax,
      letiltasLevonas: editDeduction
    })

    setEditSaving(false)
    if (res.success) {
      toast.success(editingRow.berpapirId ? "Bérpapír tételek sikeresen frissítve!" : "Bérpapír tervezet sikeresen mentve!")
      setEditingRow(null)
      const refresh = await getPayrollDashboardData(year, month)
      if (refresh.data) setData(refresh.data)
    } else {
      toast.error(res.error || "Nem sikerült a módosítás mentése.")
    }
  }

  // PDF Megtekintés / Letöltés (Generálás előtt és után is!)
  const handleViewPdf = async (item: PayrollDashboardRow) => {
    const idOrTarget = item.berpapirId
      ? item.berpapirId
      : { dolgozoId: item.dolgozoId, year, month }

    setLoadingPdfId(item.berpapirId || item.dolgozoId)
    const res = await downloadPayslipPdfAction(idOrTarget)
    setLoadingPdfId(null)

    if (res.base64) {
      const dataUri = `data:application/pdf;base64,${res.base64}`
      setPreviewPdfUrl(dataUri)
      const isDraft = item.statusz === "nem_generalt" || item.statusz === "tervezet"
      setPreviewPdfTitle(`Bérjegyzék ${isDraft ? "(Tervezet) " : ""}- ${item.nev} - ${data.year}/${data.month}`)
    } else {
      toast.error(res.error || "Nem sikerült a PDF előállítása.")
    }
  }

  const handleDirectDownload = async (item: PayrollDashboardRow) => {
    const idOrTarget = item.berpapirId
      ? item.berpapirId
      : { dolgozoId: item.dolgozoId, year, month }

    setLoadingPdfId(item.berpapirId || item.dolgozoId)
    const res = await downloadPayslipPdfAction(idOrTarget)
    setLoadingPdfId(null)

    if (res.base64) {
      const link = document.createElement("a")
      link.href = `data:application/pdf;base64,${res.base64}`
      const safeName = item.nev.replace(/[^a-zA-Z0-9_\-áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/g, "_")
      link.download = res.fileName || `berjegyzek_${safeName}_${data.year}_${data.month}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("Bérjegyzék PDF letöltve!")
    } else {
      toast.error(res.error || "Nem sikerült a letöltés.")
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Havi Időszakválasztó és Fejléc Vezérlő */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border rounded-xl p-4 bg-card shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Elszámolt Időszak</div>
            <div className="text-xl font-bold text-foreground">
              {data.year}. {data.monthName}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Léptető gombok */}
          <div className="flex items-center border rounded-lg bg-muted/20 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={prevMonth}
              disabled={isPending}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-semibold px-2 tabular-nums">
              {data.year} / {String(data.month).padStart(2, "0")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={nextMonth}
              disabled={isPending}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={() => setBatchDialogOpen(true)}
            disabled={isPending || data.items.length === 0}
            className="gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs h-9 shadow-xs"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Havi Bérpapírok Előállítása & Közzététele (Mt. 155. §)
          </Button>
        </div>
      </div>

      {/* 2. Linear Flat KPI Statisztikai Kártyák */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Összes Munkavállaló"
          value={data.metrics.totalEmployees}
          sub={`Norma: ${data.plannedWorkdays} munkanap`}
        />
        <KpiCard
          label="Előállított Bérpapír"
          value={data.metrics.generatedCount}
          sub={`${data.metrics.unpreparedCount} dolgozó vár előállításra`}
          highlight={data.metrics.unpreparedCount > 0}
        />
        <KpiCard
          label="Átvéve és Nyugtázva"
          value={data.metrics.acknowledgedCount}
          sub="Dolgozói ESS portálon jóváhagyva"
        />
        <KpiCard
          label="Átvételre Vár"
          value={data.metrics.pendingCount}
          sub="Közzétéve a portálon"
          highlight={data.metrics.pendingCount > 0}
        />
        <KpiCard
          label="Havi Nettó Kifizetés"
          value={formatHufCurrency(data.metrics.totalNetPayout)}
          sub={`Összköltség: ${formatHufCurrency(data.metrics.totalEmployerCost)}`}
        />
      </div>

      {/* 3. Szűrősáv (Kanonikus TableToolbar) */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Keresés név, adójel, TAJ, munkakör, részleg szerint..."
        filterGroups={[
          {
            id: "status",
            title: "Bérpapír Státusz",
            options: [
              { id: "all", label: "Mindegyik", checked: statusFilter === "all" },
              { id: "atveve", label: "✓ Átvéve (Nyugtázva)", checked: statusFilter === "atveve" },
              { id: "kikuldve", label: "⏳ Átvételre vár", checked: statusFilter === "kikuldve" },
              { id: "nem_generalt", label: "Generálásra vár", checked: statusFilter === "nem_generalt" }
            ],
            onToggle: (id) => setStatusFilter(id)
          },
          {
            id: "department",
            title: "Szervezeti Egység / Részleg",
            options: [
              { id: "all", label: "Összes részleg", checked: deptFilter === "all" },
              ...departments.map(d => ({
                id: d,
                label: d,
                checked: deptFilter === d
              }))
            ],
            onToggle: (id) => setDeptFilter(id)
          }
        ]}
        activeFiltersCount={
          (statusFilter !== "all" ? 1 : 0) + (deptFilter !== "all" ? 1 : 0)
        }
        onClearFilters={() => {
          setStatusFilter("all")
          setDeptFilter("all")
        }}
      />

      {/* 4. Táblázat */}
      <div className="rounded-xl border border-border/70 overflow-hidden bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-[11px] border-b">
              <tr>
                <th className="py-3 px-3 font-semibold">Munkavállaló</th>
                <th className="py-3 px-3 font-semibold">Munkakör / Részleg</th>
                <th className="py-3 px-3 font-semibold text-right">Alapbér</th>
                <th className="py-3 px-3 font-semibold text-center">Munka / Távollét</th>
                <th className="py-3 px-3 font-semibold text-right">Bruttó Összesen</th>
                <th className="py-3 px-3 font-semibold text-center">Kedvezmények</th>
                <th className="py-3 px-3 font-semibold text-right">Levonások</th>
                <th className="py-3 px-3 font-semibold text-right">Nettó Kifizetendő</th>
                <th className="py-3 px-3 font-semibold">Átvételi Állapot (Mt. 155. §)</th>
                <th className="py-3 px-3 font-semibold text-right">Műveletek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground text-sm">
                    Nem található bérszámfejtési adat a megadott szűrési feltételekkel.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isGenerated = item.statusz !== "nem_generalt"
                  const isAcknowledged = item.statusz === "atveve"
                  const isPendingAck = item.statusz === "kikuldve"

                  return (
                    <tr key={item.dolgozoId} className="hover:bg-muted/30 transition-colors">
                      {/* Név & azonosítók */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-foreground text-sm">{item.nev}</div>
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          Adójel: {item.adoazonosito} • TAJ: {item.tajSzam}
                        </div>
                      </td>

                      {/* Munkakör & részleg */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-foreground">{item.munkakor}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3" /> {item.reszleg}
                        </div>
                      </td>

                      {/* Alapbér */}
                      <td className="py-3 px-3 text-right font-mono font-medium">
                        {formatHufCurrency(item.bruttoAlapber)}
                      </td>

                      {/* Munkanapok */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-semibold text-foreground">{item.ledolgozottMunkanap}</span>
                        <span className="text-muted-foreground"> / {item.tervezettMunkanap} nap</span>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {item.szabadsagNap > 0 && `${item.szabadsagNap} szabi • `}
                          {item.betegszabadsagNap > 0 && `${item.betegszabadsagNap} beteg • `}
                          {item.tuloraOra > 0 && `${item.tuloraOra}h túlóra`}
                          {item.szabadsagNap === 0 && item.betegszabadsagNap === 0 && item.tuloraOra === 0 && "Nincs távollét"}
                        </div>
                      </td>

                      {/* Bruttó összesen */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-foreground">
                        {formatHufCurrency(item.bruttoOsszesen)}
                      </td>

                      {/* Kedvezmények badge */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {item.kedvezmeny25EvAlatti && (
                            <Badge variant="outline" className="text-[10px] font-semibold border-teal-500/30 text-teal-600 bg-teal-500/5">
                              25 év alatti SZJA
                            </Badge>
                          )}
                          {item.csaladiKedvezmenyOsszeg > 0 && (
                            <Badge variant="outline" className="text-[10px] font-semibold border-blue-500/30 text-blue-600 bg-blue-500/5">
                              Családi: {formatHufCurrency(item.csaladiKedvezmenyOsszeg)}
                            </Badge>
                          )}
                          {!item.kedvezmeny25EvAlatti && item.csaladiKedvezmenyOsszeg === 0 && (
                            <span className="text-[11px] text-muted-foreground">-</span>
                          )}
                        </div>
                      </td>

                      {/* Levonások összesen */}
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                        -{formatHufCurrency(item.levonasokOsszesen)}
                      </td>

                      {/* Nettó kifizetendő */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-sm text-teal-600 dark:text-teal-400">
                        {formatHufCurrency(item.nettoKifizetendo)}
                      </td>

                      {/* Átvételi állapot */}
                      <td className="py-3 px-3">
                        {isAcknowledged ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Átvéve: {item.atvetelDatuma ? new Date(item.atvetelDatuma).toLocaleDateString("hu-HU") : "Igen"}</span>
                          </div>
                        ) : isPendingAck ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>Átvételre vár</span>
                          </div>
                        ) : item.statusz === "tervezet" ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span>Tervezet (Módosítva)</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Generálásra vár</span>
                          </div>
                        )}
                      </td>

                      {/* Műveletek - Generálás előtt és után is mindig elérhető */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            title={item.statusz === "nem_generalt" || item.statusz === "tervezet" ? "Előzetes PDF tervezet megtekintése" : "Bérjegyzék PDF megtekintése"}
                            onClick={() => handleViewPdf(item)}
                            disabled={loadingPdfId === (item.berpapirId || item.dolgozoId)}
                          >
                            {loadingPdfId === (item.berpapirId || item.dolgozoId) ? (
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
                            onClick={() => handleDirectDownload(item)}
                            disabled={loadingPdfId === (item.berpapirId || item.dolgozoId)}
                          >
                            <Download className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>

                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 hover:border-teal-500/40 hover:text-teal-600 transition-colors"
                            title="Bérelemek és kedvezmények szerkesztése"
                            onClick={() => openEditDialog(item)}
                          >
                            <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Kötegelt Generálás Megerősítő Dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              Havi Bérpapírok Előállítása és Közzététele
            </DialogTitle>
            <DialogDescription>
              Biztosan előállítod és közzéteszed a(z) <strong>{data.year}. {data.monthName}</strong> havi hivatalos bérpapírokat a(z) {data.items.length} munkavállaló számára az Mt. 155. § alapján?
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-muted/30 border rounded-lg space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Érintett munkavállalók:</span>
              <span className="font-semibold text-foreground">{data.items.length} fő</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tervezett munkanap norma:</span>
              <span className="font-semibold text-foreground">{data.plannedWorkdays} munkanap</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dolgozói elérés:</span>
              <span className="font-semibold text-teal-600">Önkiszolgáló pult (Bérpapírjaim)</span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setBatchDialogOpen(false)}>
              Mégsem
            </Button>
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleBatchGenerate}>
              Előállítás & Közzététel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Egyéni Bérpapír Tétel Módosító Dialog */}
      {editingRow && (
        <Dialog open={Boolean(editingRow)} onOpenChange={(open) => !open && setEditingRow(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Bérpapír Korrekció – {editingRow.nev}</DialogTitle>
              <DialogDescription>
                {data.year}. {data.monthName} időszakra vonatkozó egyedi bónusz, adókedvezmények és levonások beállítása.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 border rounded-lg text-xs">
                <div>
                  <span className="text-muted-foreground">Szerződéses alapbér:</span>
                  <div className="font-bold text-sm text-foreground">{formatHufCurrency(editingRow.bruttoAlapber)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Ledolgozott napok:</span>
                  <div className="font-bold text-sm text-foreground">{editingRow.ledolgozottMunkanap} / {editingRow.tervezettMunkanap} nap</div>
                </div>
              </div>

              {/* Teljesítmény bónusz / Jutalom */}
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
                    A törvényes havi keretig (576.601 Ft) 0% SZJA kerül levonásra.
                  </p>
                </div>
                <Switch
                  checked={editUnder25}
                  onCheckedChange={setEditUnder25}
                />
              </div>

              {/* Családi adókedvezmény */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Családi adó- és járulékkedvezmény összege (Ft)</Label>
                <Input
                  type="number"
                  value={editFamily}
                  onChange={(e) => setEditFamily(Number(e.target.value))}
                  placeholder="Pl. 20000 vagy 40000"
                />
                <p className="text-[11px] text-muted-foreground">
                  A közvetlenül az SZJA-ból és a TB-járulékból érvényesíthető havi nettó kedvezmény.
                </p>
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
                <Label className="text-xs font-semibold text-rose-600">Bírósági végrehajtás / Letiltás (Ft)</Label>
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
                className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
                onClick={handleSaveEdit}
                disabled={editSaving}
              >
                {editSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Újraszámítás és Mentés
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 7. PDF Előnézet Dialog */}
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
