"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CompanyMedicalOverview,
  EmployeeMedicalComplianceItem,
  MedicalComplianceStatus,
  MEDICAL_EXAM_TYPE_LABELS,
  MEDICAL_RESULT_LABELS,
} from "@/utils/hr/medical-compliance-calculator"
import { TableToolbar, TableColumnOption, FilterGroup } from "@/components/table-toolbar/table-toolbar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
import {
  addOrvosiVizsgalat,
  fileMedicalExaminationAction,
} from "@/app/hr/employee/[id]/actions"
import { toast } from "sonner"
import {
  ExternalLink,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  X,
  ShieldAlert,
  Stethoscope,
  Eye,
  Archive,
  Loader2,
  Upload,
  FileCheck,
} from "lucide-react"

interface MedicalComplianceTableProps {
  initialData: CompanyMedicalOverview
  userRole?: string
}

export function MedicalComplianceTable({
  initialData,
  userRole = "admin",
}: MedicalComplianceTableProps) {
  const router = useRouter()
  const [data, setData] = useState<CompanyMedicalOverview>(initialData)
  const [search, setSearch] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedDept, setSelectedDept] = useState<string>("all")

  // Új vizsgálat rögzítő modál állapota
  const [dialogTarget, setDialogTarget] = useState<EmployeeMedicalComplianceItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [filingId, setFilingId] = useState<string | null>(null)
  const [tipus, setTipus] = useState("idoszakos")
  const [eredmeny, setEredmeny] = useState("alkalmas")
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)

  const today = new Date().toISOString().split("T")[0]
  const showDetails = userRole !== "munkavedelmi"
  const canManage = ["hr_munkatars", "hr_vezeto", "admin"].includes(userRole)

  useEffect(() => {
    setData(initialData)
  }, [initialData])

  // Oszlopok definíciója a TableToolbar számára
  const [columns, setColumns] = useState<TableColumnOption[]>([
    { id: "dolgozo", label: "Munkatárs", isVisible: true },
    { id: "reszleg", label: "Szervezeti egység", isVisible: true },
    { id: "tipus", label: "Vizsgálat típusa / Eredmény", isVisible: true },
    { id: "datum", label: "Vizsgálat dátuma", isVisible: true },
    { id: "lejarat", label: "Érvényesség lejárata", isVisible: true },
    { id: "statusz", label: "Megfelelőségi státusz", isVisible: true },
    { id: "velemeny", label: "Iktatott vélemény", isVisible: true },
    { id: "muveletek", label: "Műveletek", isVisible: true },
  ])

  const handleToggleColumn = (colId: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, isVisible: !c.isVisible } : c))
    )
  }

  const isColVisible = (colId: string) => {
    const col = columns.find((c) => c.id === colId)
    return col ? col.isVisible : true
  }

  // Egyedi részlegek kinyerése a szűrőhöz
  const departments = React.useMemo(() => {
    const set = new Set<string>()
    data.items.forEach((e) => {
      if (e.szervezetiEgysegNev) set.add(e.szervezetiEgysegNev)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, "hu"))
  }, [data.items])

  const statusFilterLabels: Record<string, string> = {
    ervenyes: "Érvényes (> 30 nap)",
    hamarosan_lejar: "Hamarosan lejár (30 nap)",
    lejart: "Lejárt",
    hianyzik: "Hiányzik (nincs adat)",
    nem_alkalmas: "Nem alkalmas",
  }

  // Szűrőcsoportok a TableToolbar Popover számára
  const filterGroups: FilterGroup[] = [
    {
      id: "status",
      title: "Megfelelőségi státusz",
      options: [
        { id: "all", label: "Összes státusz", checked: selectedStatus === "all" },
        { id: "ervenyes", label: "Érvényes (> 30 nap)", checked: selectedStatus === "ervenyes" },
        { id: "hamarosan_lejar", label: "Hamarosan lejár (30 napon belül)", checked: selectedStatus === "hamarosan_lejar" },
        { id: "lejart", label: "Lejárt vizsgálat", checked: selectedStatus === "lejart" },
        { id: "hianyzik", label: "Hiányzik (nincs adat)", checked: selectedStatus === "hianyzik" },
        { id: "nem_alkalmas", label: "Nem alkalmas", checked: selectedStatus === "nem_alkalmas" },
      ],
      onToggle: (optId: string) => setSelectedStatus(optId),
    },
    {
      id: "examType",
      title: "Vizsgálat típusa",
      options: [
        { id: "all", label: "Összes típus", checked: selectedType === "all" },
        { id: "elozetes", label: "Előzetes (Munkába lépéskor)", checked: selectedType === "elozetes" },
        { id: "idoszakos", label: "Időszakos (Éves / Kétéves)", checked: selectedType === "idoszakos" },
        { id: "soron_kivuli", label: "Soron kívüli", checked: selectedType === "soron_kivuli" },
        { id: "zaro", label: "Záró vizsgálat", checked: selectedType === "zaro" },
        { id: "alapadat", label: "Alapadatoknál rögzített", checked: selectedType === "alapadat" },
      ],
      onToggle: (optId: string) => setSelectedType(optId),
    },
    {
      id: "department",
      title: "Szervezeti egység (Részleg)",
      options: [
        { id: "all", label: "Összes részleg", checked: selectedDept === "all" },
        ...departments.map((d) => ({
          id: d,
          label: d,
          checked: selectedDept === d,
        })),
      ],
      onToggle: (optId: string) => setSelectedDept(optId),
    },
  ]

  // Aktív szűrők számlálása
  let activeFiltersCount = 0
  if (selectedStatus !== "all") activeFiltersCount++
  if (selectedType !== "all") activeFiltersCount++
  if (selectedDept !== "all") activeFiltersCount++

  const handleClearFilters = () => {
    setSearch("")
    setSelectedStatus("all")
    setSelectedType("all")
    setSelectedDept("all")
  }

  // Szűrés a felhasználói beállítások szerint
  const filteredEmployees = React.useMemo(() => {
    return data.items.filter((emp) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matchesName = emp.nev.toLowerCase().includes(q)
        const matchesDept = (emp.szervezetiEgysegNev || "").toLowerCase().includes(q)
        const matchesRole = (emp.munkakorMegnevezes || "").toLowerCase().includes(q)
        const matchesIktato = (emp.iktatoszam || "").toLowerCase().includes(q)
        if (!matchesName && !matchesDept && !matchesRole && !matchesIktato) return false
      }

      if (selectedStatus !== "all" && emp.status !== selectedStatus) {
        return false
      }

      if (selectedType !== "all") {
        if (!emp.vizsgalatTipusa || emp.vizsgalatTipusa !== selectedType) return false
      }

      if (selectedDept !== "all" && emp.szervezetiEgysegNev !== selectedDept) {
        return false
      }

      return true
    })
  }, [data.items, search, selectedStatus, selectedType, selectedDept])

  // CSV Exportálás
  const handleExportCsv = () => {
    const headers = [
      "Munkatárs neve",
      "Szervezeti egység",
      "Munkakör",
      "Vizsgálat típusa",
      "Eredmény",
      "Vizsgálat dátuma",
      "Érvényesség lejárata",
      "Hátralévő napok",
      "Megfelelőségi státusz",
      "Vizsgáló orvos",
      "Iktatószám",
    ]

    const statusTextMap: Record<MedicalComplianceStatus, string> = {
      ervenyes: "Érvényes",
      hamarosan_lejar: "Hamarosan lejár (30 nap)",
      lejart: "Lejárt",
      hianyzik: "Hiányzik (nincs adat)",
      nem_alkalmas: "Nem alkalmas",
    }

    const rows = filteredEmployees.map((emp) => [
      emp.nev,
      emp.szervezetiEgysegNev || "",
      emp.munkakorMegnevezes || "",
      emp.vizsgalatTipusa ? MEDICAL_EXAM_TYPE_LABELS[emp.vizsgalatTipusa] || emp.vizsgalatTipusa : "",
      showDetails && emp.eredmeny ? MEDICAL_RESULT_LABELS[emp.eredmeny] || emp.eredmeny : "",
      emp.vizsgalatDatuma || "",
      emp.ervenyessegDatuma || "",
      emp.daysRemaining !== null ? emp.daysRemaining : "",
      statusTextMap[emp.status] || emp.status,
      showDetails ? emp.orvosNeve || "" : "",
      emp.iktatoszam || "",
    ])

    const csvContent =
      "\uFEFF" +
      [
        headers.join(";"),
        ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")),
      ].join("\r\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute(
      "download",
      `orvosi_alkalmassagi_${new Date().toISOString().split("T")[0]}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Új vizsgálat mentése a helyi modálból
  const handleAddExam = async (formData: FormData) => {
    if (!dialogTarget) return
    setSubmitting(true)
    try {
      const res = await addOrvosiVizsgalat(dialogTarget.dolgozoId, formData)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Orvosi vizsgálat sikeresen rögzítve (${dialogTarget.nev})!`)
        setDialogTarget(null)
        setSelectedFileName(null)
        router.refresh()
      }
    } catch (e: any) {
      toast.error("Hiba történt a mentés során: " + (e?.message || "Ismeretlen hiba"))
    } finally {
      setSubmitting(false)
    }
  }

  // Iktatás indítása közvetlenül a táblázatból
  const handleFileExam = async (emp: EmployeeMedicalComplianceItem) => {
    if (!emp.vizsgalatId) return
    setFilingId(emp.vizsgalatId)
    try {
      const res = await fileMedicalExaminationAction(emp.vizsgalatId, emp.dolgozoId)
      if (res.success) {
        toast.success(
          `Orvosi alkalmassági vélemény beiktatva a személyi dossziéba! (${res.iktatoszam})`
        )
        setData((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.dolgozoId === emp.dolgozoId
              ? {
                  ...item,
                  iktatoszam: res.iktatoszam,
                  ugyiratId: res.ugyirat_id,
                  dokumentumId: res.docId,
                }
              : item
          ),
        }))
        router.refresh()
      } else {
        toast.error(res.error || "Hiba történt az iktatás során.")
      }
    } catch (err: any) {
      toast.error("Váratlan hiba az iktatás során: " + (err?.message || "Ismeretlen hiba"))
    } finally {
      setFilingId(null)
    }
  }

  const renderStatusBadge = (emp: EmployeeMedicalComplianceItem) => {
    switch (emp.status) {
      case "ervenyes":
        return (
          <Badge
            variant="secondary"
            className="bg-success/10 text-success border border-success/30 font-medium"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Érvényes
          </Badge>
        )
      case "hamarosan_lejar":
        return (
          <Badge
            variant="secondary"
            className="bg-warning/10 text-warning border border-warning/30 font-medium"
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            Hamarosan lejár ({emp.daysRemaining} nap)
          </Badge>
        )
      case "lejart":
        return (
          <Badge variant="destructive" className="font-medium">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Lejárt ({Math.abs(emp.daysRemaining || 0)} napja)
          </Badge>
        )
      case "nem_alkalmas":
        return (
          <Badge variant="destructive" className="font-medium">
            <ShieldAlert className="w-3 h-3 mr-1" />
            Nem alkalmas
          </Badge>
        )
      case "hianyzik":
      default:
        return (
          <Badge variant="destructive" className="font-medium">
            <ShieldAlert className="w-3 h-3 mr-1" />
            Hiányzik
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* Kanonikus TableToolbar */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Keresés munkatárs neve, munkaköre, részlege vagy iktatószáma szerint..."
        columns={columns}
        onToggleColumn={handleToggleColumn}
        filterGroups={filterGroups}
        activeFiltersCount={activeFiltersCount}
        onClearFilters={handleClearFilters}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground border-border/60"
            title="Hatósági táblázat exportálása Excel / CSV formátumban"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportálás (CSV)</span>
          </Button>
        }
      />

      {/* Aktív szűrők pill sáv */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <span className="font-medium">Aktív szűrők:</span>
          {selectedStatus !== "all" && (
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-xs">
              Státusz: {statusFilterLabels[selectedStatus] || selectedStatus}
              <X
                className="w-3 h-3 cursor-pointer hover:text-foreground"
                onClick={() => setSelectedStatus("all")}
              />
            </Badge>
          )}
          {selectedType !== "all" && (
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-xs">
              Típus: {MEDICAL_EXAM_TYPE_LABELS[selectedType] || selectedType}
              <X
                className="w-3 h-3 cursor-pointer hover:text-foreground"
                onClick={() => setSelectedType("all")}
              />
            </Badge>
          )}
          {selectedDept !== "all" && (
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-xs">
              Részleg: {selectedDept}
              <X
                className="w-3 h-3 cursor-pointer hover:text-foreground"
                onClick={() => setSelectedDept("all")}
              />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="xs"
            onClick={handleClearFilters}
            className="h-6 text-xs text-primary hover:underline px-1"
          >
            Szűrők törlése
          </Button>
        </div>
      )}

      {/* Fő Adattábla */}
      <div className="rounded-lg border border-border/50 overflow-hidden bg-card">
        <Table className="compact-table">
          <TableHeader className="bg-muted/50">
            <TableRow>
              {isColVisible("dolgozo") && (
                <TableHead className="w-[240px]">Munkatárs</TableHead>
              )}
              {isColVisible("reszleg") && (
                <TableHead className="w-[170px]">Szervezeti egység</TableHead>
              )}
              {isColVisible("tipus") && (
                <TableHead className="w-[220px]">Vizsgálat típusa / Eredmény</TableHead>
              )}
              {isColVisible("datum") && (
                <TableHead className="w-[140px] tabular-nums">Vizsgálat dátuma</TableHead>
              )}
              {isColVisible("lejarat") && (
                <TableHead className="w-[150px] tabular-nums">Érvényesség lejárata</TableHead>
              )}
              {isColVisible("statusz") && (
                <TableHead className="w-[170px]">Státusz</TableHead>
              )}
              {isColVisible("velemeny") && (
                <TableHead className="w-[170px]">Iktatott vélemény</TableHead>
              )}
              {isColVisible("muveletek") && (
                <TableHead className="w-[160px] text-right">Művelet</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.filter((c) => c.isVisible).length}
                  className="h-28 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <p className="font-medium text-foreground">
                      Nem található a feltételeknek megfelelő munkatárs.
                    </p>
                    <p className="text-xs">
                      Módosítsd a keresési feltételeket vagy töröld a szűrőket.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((emp) => {
                const initials = emp.nev
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()

                return (
                  <TableRow
                    key={emp.dolgozoId}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {/* Munkatárs */}
                    {isColVisible("dolgozo") && (
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-border">
                            {emp.avatarUrl && (
                              <AvatarImage src={emp.avatarUrl} alt={emp.nev} />
                            )}
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <Link
                              href={`/hr/employee/${emp.dolgozoId}`}
                              className="font-medium hover:text-primary transition-colors truncate"
                            >
                              {emp.nev}
                            </Link>
                            <span className="text-xs text-muted-foreground truncate">
                              {emp.munkakorMegnevezes}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {/* Szervezeti egység */}
                    {isColVisible("reszleg") && (
                      <TableCell className="text-xs text-muted-foreground">
                        {emp.szervezetiEgysegNev}
                      </TableCell>
                    )}

                    {/* Vizsgálat típusa / Eredmény */}
                    {isColVisible("tipus") && (
                      <TableCell className="text-xs">
                        {emp.vizsgalatTipusa ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-foreground font-medium">
                              {MEDICAL_EXAM_TYPE_LABELS[emp.vizsgalatTipusa] ||
                                emp.vizsgalatTipusa}
                            </span>
                            {showDetails && emp.eredmeny && (
                              <span
                                className={cn(
                                  "text-[11px]",
                                  emp.eredmeny === "nem_alkalmas"
                                    ? "text-destructive font-medium"
                                    : emp.eredmeny === "fetelekkel_alkalmas"
                                    ? "text-warning-foreground dark:text-warning font-medium"
                                    : "text-muted-foreground"
                                )}
                              >
                                {MEDICAL_RESULT_LABELS[emp.eredmeny] || emp.eredmeny}
                                {emp.megjegyzes ? ` — ${emp.megjegyzes}` : ""}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Nincs adat</span>
                        )}
                      </TableCell>
                    )}

                    {/* Vizsgálat dátuma */}
                    {isColVisible("datum") && (
                      <TableCell className="text-xs tabular-nums">
                        {emp.vizsgalatDatuma ? (
                          <div className="flex flex-col">
                            <span>{emp.vizsgalatDatuma}</span>
                            {showDetails && emp.orvosNeve && (
                              <span className="text-[11px] text-muted-foreground truncate max-w-[130px]">
                                {emp.orvosNeve}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                    )}

                    {/* Érvényesség lejárata */}
                    {isColVisible("lejarat") && (
                      <TableCell className="text-xs tabular-nums">
                        {emp.ervenyessegDatuma ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {emp.ervenyessegDatuma}
                            </span>
                            {emp.daysRemaining !== null && (
                              <span
                                className={cn(
                                  "text-[11px]",
                                  emp.daysRemaining < 0
                                    ? "text-destructive font-medium"
                                    : emp.daysRemaining <= 30
                                    ? "text-warning-foreground dark:text-warning"
                                    : "text-muted-foreground"
                                )}
                              >
                                {emp.daysRemaining < 0
                                  ? `${Math.abs(emp.daysRemaining)} napja lejárt`
                                  : emp.daysRemaining === 0
                                  ? "Ma jár le"
                                  : `${emp.daysRemaining} nap van hátra`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                    )}

                    {/* Megfelelőségi státusz */}
                    {isColVisible("statusz") && (
                      <TableCell>{renderStatusBadge(emp)}</TableCell>
                    )}

                    {/* Iktatott vélemény */}
                    {isColVisible("velemeny") && (
                      <TableCell>
                        {emp.iktatoszam ? (
                          <div className="flex items-center gap-1.5">
                            {emp.ugyiratId ? (
                              <Link
                                href={`/dossiers/${emp.ugyiratId}`}
                                className="inline-flex"
                              >
                                <Badge
                                  variant="outline"
                                  className="h-6 gap-1 px-2 text-[11px] font-medium border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                                  title={`Iktatva a személyi dossziéba (${emp.iktatoszam})`}
                                >
                                  <FileCheck2 className="w-3 h-3" />
                                  <span>{emp.iktatoszam}</span>
                                </Badge>
                              </Link>
                            ) : (
                              <Badge
                                variant="outline"
                                className="h-6 gap-1 px-2 text-[11px] font-medium border-primary/30 bg-primary/5 text-primary"
                              >
                                <FileCheck2 className="w-3 h-3" />
                                <span>{emp.iktatoszam}</span>
                              </Badge>
                            )}

                            {showDetails && emp.vizsgalatId && (
                              <PdfViewerDialog
                                url={`/api/hr/medical-pdf?id=${emp.vizsgalatId}&preview=true`}
                                title={`Foglalkozás-egészségügyi Alkalmassági Vélemény - ${emp.nev}`}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    title="Alkalmassági vélemény megtekintése"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-primary" />
                                  </Button>
                                }
                              />
                            )}
                          </div>
                        ) : emp.vizsgalatId ? (
                          <div className="flex items-center gap-1.5">
                            {showDetails && (
                              <PdfViewerDialog
                                url={`/api/hr/medical-pdf?id=${emp.vizsgalatId}&preview=true`}
                                title={`Foglalkozás-egészségügyi Alkalmassági Vélemény - ${emp.nev}`}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    title="Alkalmassági vélemény előnézete"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-primary" />
                                  </Button>
                                }
                              />
                            )}
                            {canManage ? (
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => handleFileExam(emp)}
                                disabled={filingId === emp.vizsgalatId}
                                className="h-6 px-2 text-[11px] gap-1 border-primary/30 text-primary hover:bg-primary/10"
                                title="Alkalmassági vélemény beiktatása a dolgozó személyi dossziéjába"
                              >
                                {filingId === emp.vizsgalatId ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Archive className="w-3 h-3" />
                                )}
                                <span>Iktatás</span>
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground/60 italic">
                                Nincs iktatva
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">
                            Nincs iktatva
                          </span>
                        )}
                      </TableCell>
                    )}

                    {/* Műveletek */}
                    {isColVisible("muveletek") && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && (
                            <Button
                              variant={
                                emp.status === "hianyzik" ||
                                emp.status === "lejart" ||
                                emp.status === "nem_alkalmas"
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => {
                                setTipus(emp.vizsgalatId ? "idoszakos" : "elozetes")
                                setEredmeny("alkalmas")
                                setSelectedFileName(null)
                                setDialogTarget(emp)
                              }}
                              title="Foglalkozás-egészségügyi vizsgálat rögzítése"
                            >
                              <Stethoscope className="w-3.5 h-3.5" />
                              <span>
                                {emp.status === "hianyzik"
                                  ? "Vizsgálat pótlása"
                                  : emp.status === "lejart"
                                  ? "Megújítás"
                                  : "Új vizsgálat"}
                              </span>
                            </Button>
                          )}

                          <Link
                            href={`/hr/employee/${emp.dolgozoId}`}
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "sm" }),
                              "h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            )}
                            title="Munkavállaló 360° adatlapjának megnyitása"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Lábléc összesítő */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Összesen:{" "}
          <strong className="text-foreground tabular-nums">
            {filteredEmployees.length}
          </strong>{" "}
          munkatárs listázva ({data.totalEmployees} munkavállalóból).
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success" />
            Érvényes:{" "}
            <strong className="text-foreground tabular-nums">{data.validCount}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warning" />
            30 napon belül lejár:{" "}
            <strong className="text-foreground tabular-nums">
              {data.expiringSoonCount}
            </strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            Lejárt / Hiányzik:{" "}
            <strong className="text-foreground tabular-nums">
              {data.expiredOrMissingCount}
            </strong>
          </span>
        </div>
      </div>

      {/* Új orvosi vizsgálat rögzítő modál */}
      <Dialog
        open={!!dialogTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDialogTarget(null)
            setSelectedFileName(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-[700px] w-full p-6 max-h-[92vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-lg font-semibold">
              Orvosi alkalmassági vizsgálat rögzítése — {dialogTarget?.nev}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {dialogTarget?.munkakorMegnevezes} ({dialogTarget?.szervezetiEgysegNev}) • 33/1998. (VI. 24.) NM rendelet szerinti nyilvántartás.
            </p>
          </DialogHeader>

          <form action={handleAddExam} className="space-y-5 pt-3">
            {/* 1. Szekció: Vizsgálat és Eredmény */}
            <div className="rounded-lg border bg-card/60 p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                1. Vizsgálat alapadatok
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Vizsgálat típusa</Label>
                  <Select
                    name="tipus"
                    value={tipus}
                    onValueChange={(val) => val && setTipus(val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Válassz típust">
                        {MEDICAL_EXAM_TYPE_LABELS[tipus] || tipus}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="elozetes">Előzetes (Munkába lépéskor)</SelectItem>
                      <SelectItem value="idoszakos">Időszakos (Éves / Kétéves)</SelectItem>
                      <SelectItem value="soron_kivuli">Soron kívüli (Visszatérés / Áthelyezés)</SelectItem>
                      <SelectItem value="zaro">Záró (Munkaviszony végén)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Orvosi eredmény</Label>
                  <Select
                    name="eredmeny"
                    value={eredmeny}
                    onValueChange={(val) => val && setEredmeny(val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Válassz eredményt">
                        {MEDICAL_RESULT_LABELS[eredmeny] || eredmeny}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alkalmas">Alkalmas</SelectItem>
                      <SelectItem value="fetelekkel_alkalmas">
                        Feltételekkel alkalmas (Korlátozással)
                      </SelectItem>
                      <SelectItem value="nem_alkalmas">Nem alkalmas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Vizsgálat elvégzésének dátuma
                  </Label>
                  <Input
                    name="vizsgalat_datuma"
                    type="date"
                    defaultValue={today}
                    max={today}
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Érvényesség lejárata (Következő vizsgálat)
                  </Label>
                  <Input
                    name="ervenyesseg_datuma"
                    type="date"
                    defaultValue={
                      new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                        .toISOString()
                        .split("T")[0]
                    }
                    required
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* 2. Szekció: Kiállító orvos és megjegyzések */}
            <div className="rounded-lg border bg-card/60 p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                2. Orvos és rendelő adatai (Opcionális)
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Vizsgáló szakorvos neve</Label>
                  <Input
                    name="orvos_neve"
                    placeholder="Pl. Dr. Kovács István"
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Foglalkozás-egészségügyi szolgálat
                  </Label>
                  <Input
                    name="szakrendeles"
                    placeholder="Pl. MediCare Foglalkozás-egészségügyi Kft."
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Orvosi záradék / Megjegyzés / Korlátozás
                </Label>
                <Input
                  name="megjegyzes"
                  placeholder="Pl. Képernyő előtti munkavégzéshez éleslátást biztosító szemüveg viselése szükséges..."
                  className="w-full"
                />
              </div>
            </div>

            {/* 3. Szekció: Hivatalos dokumentum / Lelet forrása */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary shrink-0" />
                <Label className="font-semibold text-xs uppercase tracking-wide text-foreground">
                  Hivatalos lelet / igazolás csatolása (PDF vagy kép)
                </Label>
              </div>

              <Input
                type="file"
                name="file"
                accept=".pdf,image/*"
                className="cursor-pointer file:cursor-pointer text-xs bg-background"
                onChange={(e) =>
                  setSelectedFileName(e.target.files?.[0]?.name || null)
                }
              />

              {selectedFileName ? (
                <div className="text-xs text-primary font-medium flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-2 rounded-md">
                  <FileCheck className="w-4 h-4 shrink-0" />
                  <span>
                    Feltöltésre kijelölt dokumentum: <strong>{selectedFileName}</strong>
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Ha nem csatolsz külön szkennelt fájlt, a rendszer a mentés után
                  automatikusan kiállítja a hatályos{" "}
                  <strong>33/1998. (VI. 24.) NM rendelet</strong> szerinti A4-es
                  hivatalos alkalmassági véleményt a dolgozó adataival és
                  munkakörével.
                </p>
              )}
            </div>

            <DialogFooter className="pt-2 border-t flex flex-row items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogTarget(null)}
              >
                Mégse
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{submitting ? "Rögzítés..." : "Vizsgálat mentése"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
