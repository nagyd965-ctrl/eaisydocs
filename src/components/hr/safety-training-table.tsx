"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import {
  CompanySafetyOverview,
  EmployeeSafetyComplianceItem,
  SafetyTrainingStatus,
} from "@/utils/hr/safety-compliance-calculator"
import { TRAINING_TYPE_LABELS } from "@/utils/hr/safety-training-constants"
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
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
import { SafetyTrainingDialog } from "@/components/hr/safety-training-dialog"
import {
  ExternalLink,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Clock,
  Calendar,
  X,
  ShieldAlert,
  HardHat,
  Eye,
  Plus,
} from "lucide-react"

interface SafetyTrainingTableProps {
  initialData: CompanySafetyOverview
}

export function SafetyTrainingTable({ initialData }: SafetyTrainingTableProps) {
  const [data, setData] = useState<CompanySafetyOverview>(initialData)
  const [search, setSearch] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedDept, setSelectedDept] = useState<string>("all")

  // Oszlopok definíciója a TableToolbar számára
  const [columns, setColumns] = useState<TableColumnOption[]>([
    { id: "dolgozo", label: "Munkatárs", isVisible: true },
    { id: "reszleg", label: "Szervezeti egység / Munkakör", isVisible: true },
    { id: "tipus", label: "Oktatás típusa", isVisible: true },
    { id: "datum", label: "Oktatás dátuma", isVisible: true },
    { id: "lejarat", label: "Érvényesség lejárata", isVisible: true },
    { id: "statusz", label: "Megfelelőségi státusz", isVisible: true },
    { id: "jegyzokonyv", label: "Iktatott jegyzőkönyv", isVisible: true },
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

  // Szűrőcsoportok a TableToolbar Popover számára
  const filterGroups: FilterGroup[] = [
    {
      id: "status",
      title: "Megfelelőségi státusz",
      options: [
        { id: "all", label: "Összes státusz", checked: selectedStatus === "all" },
        { id: "ervenyess", label: "🟢 Érvényes (> 30 nap)", checked: selectedStatus === "ervenyess" },
        { id: "hamarosan_lejar", label: "🟡 Hamarosan lejár (30 napon belül)", checked: selectedStatus === "hamarosan_lejar" },
        { id: "lejart", label: "🔴 Lejárt oktatás", checked: selectedStatus === "lejart" },
        { id: "hianyzik", label: "⚠️ Hiányzik (nincs adat)", checked: selectedStatus === "hianyzik" },
      ],
      onToggle: (optId: string) => setSelectedStatus(optId),
    },
    {
      id: "trainingType",
      title: "Oktatás típusa",
      options: [
        { id: "all", label: "Összes típus", checked: selectedType === "all" },
        { id: "elozetes_munkaba_allasi", label: "Előzetes munkába állási (Onboarding)", checked: selectedType === "elozetes_munkaba_allasi" },
        { id: "idoszakos_ismetlo", label: "Éves időszakos ismétlő", checked: selectedType === "idoszakos_ismetlo" },
        { id: "rendkivuli", label: "Rendkívüli oktatás", checked: selectedType === "rendkivuli" },
        { id: "munkakor_valtozas", label: "Munkakör változás miatti", checked: selectedType === "munkakor_valtozas" },
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
      // Szöveges keresés
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matchesName = emp.nev.toLowerCase().includes(q)
        const matchesDept = (emp.szervezetiEgysegNev || "").toLowerCase().includes(q)
        const matchesRole = (emp.munkakorMegnevezes || "").toLowerCase().includes(q)
        if (!matchesName && !matchesDept && !matchesRole) return false
      }

      // Státusz szűrő
      if (selectedStatus !== "all" && emp.status !== selectedStatus) {
        return false
      }

      // Típus szűrő
      if (selectedType !== "all") {
        if (!emp.oktatasTipusa || emp.oktatasTipusa !== selectedType) return false
      }

      // Részleg szűrő
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
      "Oktatás típusa",
      "Oktatás dátuma",
      "Érvényesség lejárata",
      "Hátralévő napok",
      "Megfelelőségi státusz",
      "Oktató neve",
      "Iktatószám",
    ]

    const statusTextMap: Record<SafetyTrainingStatus, string> = {
      ervenyess: "Érvényes",
      hamarosan_lejar: "Hamarosan lejár (30 nap)",
      lejart: "Lejárt",
      hianyzik: "Hiányzik (nincs adat)",
    }

    const rows = filteredEmployees.map((emp) => [
      emp.nev,
      emp.szervezetiEgysegNev || "",
      emp.munkakorMegnevezes || "",
      emp.oktatasTipusa ? TRAINING_TYPE_LABELS[emp.oktatasTipusa] || emp.oktatasTipusa : "",
      emp.oktatasDatuma || "",
      emp.ervenyessegVege || "",
      emp.daysRemaining !== null ? emp.daysRemaining : "",
      statusTextMap[emp.status] || emp.status,
      emp.oktatoNeve || "",
      emp.iktatoszam || "",
    ])

    const csvContent =
      "\uFEFF" +
      [headers.join(";"), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))].join(
        "\r\n"
      )

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute(
      "download",
      `munkavedelmi_oktatasok_${new Date().toISOString().split("T")[0]}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Státusz badge renderelés
  const renderStatusBadge = (emp: EmployeeSafetyComplianceItem) => {
    switch (emp.status) {
      case "ervenyess":
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
        searchPlaceholder="Keresés munkatárs neve, munkaköre vagy részlege szerint..."
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
              Státusz: {selectedStatus}
              <X
                className="w-3 h-3 cursor-pointer hover:text-foreground"
                onClick={() => setSelectedStatus("all")}
              />
            </Badge>
          )}
          {selectedType !== "all" && (
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-xs">
              Típus: {TRAINING_TYPE_LABELS[selectedType] || selectedType}
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
                <TableHead className="w-[180px]">Szervezeti egység</TableHead>
              )}
              {isColVisible("tipus") && (
                <TableHead className="w-[200px]">Oktatás típusa</TableHead>
              )}
              {isColVisible("datum") && (
                <TableHead className="w-[130px] tabular-nums">Oktatás dátuma</TableHead>
              )}
              {isColVisible("lejarat") && (
                <TableHead className="w-[150px] tabular-nums">Érvényesség lejárata</TableHead>
              )}
              {isColVisible("statusz") && (
                <TableHead className="w-[170px]">Státusz</TableHead>
              )}
              {isColVisible("jegyzokonyv") && (
                <TableHead className="w-[160px]">Iktatott jegyzőkönyv</TableHead>
              )}
              {isColVisible("muveletek") && (
                <TableHead className="w-[150px] text-right">Művelet</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.filter((c) => c.isVisible).length}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <ShieldAlert className="w-8 h-8 text-muted-foreground/40 mb-1" />
                    <p className="font-medium text-foreground">Nem található a feltételeknek megfelelő munkatárs.</p>
                    <p className="text-xs">Módosítsd a keresési feltételeket vagy töröld a szűrőket.</p>
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

                return (
                  <TableRow
                    key={emp.dolgozoId}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {/* Munkatárs */}
                    {isColVisible("dolgozo") && (
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 rounded-full border border-border/60">
                            {emp.avatarUrl ? (
                              <AvatarImage src={emp.avatarUrl} alt={emp.nev} />
                            ) : null}
                            <AvatarFallback className="text-[11px] font-semibold bg-muted text-foreground">
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

                    {/* Oktatás típusa */}
                    {isColVisible("tipus") && (
                      <TableCell className="text-xs">
                        {emp.oktatasTipusa ? (
                          <span className="text-foreground font-medium">
                            {TRAINING_TYPE_LABELS[emp.oktatasTipusa] || emp.oktatasTipusa}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Nincs adat</span>
                        )}
                      </TableCell>
                    )}

                    {/* Oktatás dátuma */}
                    {isColVisible("datum") && (
                      <TableCell className="text-xs tabular-nums">
                        {emp.oktatasDatuma ? (
                          <span>{emp.oktatasDatuma}</span>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                    )}

                    {/* Érvényesség lejárata */}
                    {isColVisible("lejarat") && (
                      <TableCell className="text-xs tabular-nums">
                        {emp.ervenyessegVege ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{emp.ervenyessegVege}</span>
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
                      <TableCell>
                        {renderStatusBadge(emp)}
                      </TableCell>
                    )}

                    {/* Iktatott jegyzőkönyv */}
                    {isColVisible("jegyzokonyv") && (
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

                            {emp.documentUrl && (
                              <PdfViewerDialog
                                url={emp.documentUrl.startsWith("http") ? emp.documentUrl : `/api/download?path=${encodeURIComponent(emp.documentUrl)}`}
                                title={`Munkavédelmi Oktatási Jegyzőkönyv - ${emp.nev}`}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    title="Jegyzőkönyv megtekintése"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-primary" />
                                  </Button>
                                }
                              />
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">Nincs iktatva</span>
                        )}
                      </TableCell>
                    )}

                    {/* Műveletek */}
                    {isColVisible("muveletek") && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Új oktatás rögzítése erre a dolgozóra */}
                          <SafetyTrainingDialog
                            employeeName={emp.nev}
                            dolgozoId={emp.dolgozoId}
                            munkakor={emp.munkakorMegnevezes}
                            reszleg={emp.szervezetiEgysegNev}
                            triggerButton={
                              <Button
                                variant={emp.status === "hianyzik" || emp.status === "lejart" ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-xs gap-1"
                                title="Munkavédelmi és tűzvédelmi oktatás rögzítése"
                              >
                                <HardHat className="w-3.5 h-3.5" />
                                <span>{emp.status === "hianyzik" ? "Oktatás pótlása" : emp.status === "lejart" ? "Ismétlő oktatás" : "Új oktatás"}</span>
                              </Button>
                            }
                          />

                          <Link
                            href={`/hr/employee/${emp.dolgozoId}`}
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "sm" }),
                              "h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            )}
                            title="Munkavállaló adatlapjának megnyitása"
                          >
                            <ExternalLink className="h-3.5 h-3.5" />
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
          Összesen: <strong className="text-foreground tabular-nums">{filteredEmployees.length}</strong> munkatárs listázva ({data.totalEmployees} munkavállalóból).
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success" />
            Érvényes: <strong className="text-foreground tabular-nums">{data.validCount}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warning" />
            30 napon belül lejár: <strong className="text-foreground tabular-nums">{data.expiringSoonCount}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            Lejárt / Hiányzik: <strong className="text-foreground tabular-nums">{data.expiredOrMissingCount}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}
