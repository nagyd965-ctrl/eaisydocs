"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Download,
  FileText,
  Calendar,
  Building,
  Landmark,
  Trash2,
  Upload,
  FileSpreadsheet,
  Copy,
  Eye,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  ExternalLink,
  ShieldCheck,
  Check,
  UserPlus,
  User,
} from "lucide-react"
import Link from "next/link"
import { TableToolbar } from "@/components/table-toolbar/table-toolbar"
import { KpiCard } from "@/components/kpi-card"
import { DocumentPreviewFrame } from "@/components/document-preview-frame"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  getT1041ReportData,
  getKshReportData,
  getPayrollReportData,
  uploadT1041ReceiptFromReport,
  uploadArchiveFileAdmin,
  getArchiveRecords,
  deleteArchiveRecordAdmin,
  getAllEmployeesForReports,
  type T1041ReportResponse,
  type ReportEmployeeOption,
} from "@/app/hr/reports/actions"
import { getCafeteriaExportData } from "@/app/hr/cafeteria-actions"
import { generateT1041PdfAction } from "@/app/hr/actions/t1041-actions"
import {
  exportT1041ToXlsx,
  exportT1041ToCsv,
  copyT1041ToClipboard,
  exportKshToXlsx,
  exportPayrollToXlsx,
  exportSingleEmployeePayrollToXlsx,
  exportCafeteriaToXlsx,
  type T1041ReportRow,
  type KshReportData,
  type PayrollReportRow,
} from "@/utils/hr/reports-export"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

export function ReportsTabs() {
  const [activeTab, setActiveTab] = useState("t1041")
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [loading, setLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Data states
  const [t1041Data, setT1041Data] = useState<T1041ReportResponse | null>(null)
  const [kshData, setKshData] = useState<KshReportData | null>(null)
  const [payrollData, setPayrollData] = useState<{
    yearMonth: string
    items: PayrollReportRow[]
    metrics: {
      totalEmployees: number
      closedCount: number
      pendingCount: number
      totalPlannedHours?: number
      totalWorkedHours: number
      totalCafeteriaGross: number
    }
  } | null>(null)
  const [archiveRecords, setArchiveRecords] = useState<any[]>([])

  // Filters & search states
  const [t1041Search, setT1041Search] = useState("")
  const [t1041TypeFilter, setT1041TypeFilter] = useState<string>("all")
  const [t1041StatusFilter, setT1041StatusFilter] = useState<string>("all")

  const [kshSearch, setKshSearch] = useState("")

  const [payrollSearch, setPayrollSearch] = useState("")
  const [payrollStatusFilter, setPayrollStatusFilter] = useState<string>("all")
  const [selectedPayrollEmployeeId, setSelectedPayrollEmployeeId] = useState<string>("all")

  // Összes munkavállaló az egyéni választókhoz
  const [allEmployees, setAllEmployees] = useState<ReportEmployeeOption[]>([])

  // Egyéni T1041 generátor modal állapota
  const [individualT1041Open, setIndividualT1041Open] = useState(false)
  const [indivEmpId, setIndivEmpId] = useState<string>("")
  const [indivType, setIndivType] = useState<string>("U")
  const [indivGeneratingPdf, setIndivGeneratingPdf] = useState(false)

  const [archiveSearch, setArchiveSearch] = useState("")
  const [archiveType, setArchiveType] = useState("NAV T1041")
  const [archiveUgyszam, setArchiveUgyszam] = useState("")
  const [archiveFile, setArchiveFile] = useState<File | null>(null)
  const [uploadingArchive, setUploadingArchive] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; filePath: string } | null>(null)

  // Nyugta feltöltő modal állapota
  const [receiptModalItem, setReceiptModalItem] = useState<T1041ReportRow | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  // Dokumentum előnézet modal állapota
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null)

  const supabase = createClient()

  // Adatbetöltés adott fülre és hónapra
  const loadDataForTab = useCallback(
    async (tab: string, targetMonth: string, showToast = false) => {
      try {
        if (showToast) setIsRefreshing(true)
        else setLoading(true)

        if (tab === "t1041") {
          const res = await getT1041ReportData(targetMonth)
          setT1041Data(res)
        } else if (tab === "ksh") {
          const res = await getKshReportData(targetMonth)
          setKshData(res)
        } else if (tab === "payroll") {
          const res = await getPayrollReportData(targetMonth)
          setPayrollData(res)
        } else if (tab === "archivum") {
          const data = await getArchiveRecords()
          setArchiveRecords(data)
        }

        if (showToast) {
          toast.success("Riport adatok sikeresen frissítve!")
        }
      } catch (err: any) {
        console.error("Hiba az adatok betöltésekor:", err)
        toast.error("Nem sikerült betölteni a riport adatokat: " + (err.message || "Hiba"))
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    },
    []
  )

  // Első betöltés és hónap váltás kezelése
  useEffect(() => {
    loadDataForTab(activeTab, month)
  }, [activeTab, month, loadDataForTab])

  // Összes munkavállaló betöltése a legördülő választókhoz
  useEffect(() => {
    getAllEmployeesForReports().then((emps) => {
      setAllEmployees(emps)
      if (emps.length > 0 && !indivEmpId) {
        setIndivEmpId(emps[0].dolgozoId)
      }
    })
  }, [])

  const handleTabChange = (val: string) => {
    setActiveTab(val)
  }

  const handleRefresh = () => {
    loadDataForTab(activeTab, month, true)
    getAllEmployeesForReports().then(setAllEmployees)
  }

  // --- T1041 szűrés ---
  const filteredT1041Items = useMemo(() => {
    if (!t1041Data?.items) return []
    return t1041Data.items.filter((item) => {
      // Szöveges keresés
      if (t1041Search.trim()) {
        const query = t1041Search.toLowerCase()
        const matchName = item.biztositottNeve.toLowerCase().includes(query)
        const matchTaj = item.tajSzam.toLowerCase().includes(query)
        const matchAdo = item.adoazonositoJel.toLowerCase().includes(query)
        const matchMunkakor = item.munkakor.toLowerCase().includes(query)
        const matchFeor = item.feorKod.toLowerCase().includes(query)
        if (!matchName && !matchTaj && !matchAdo && !matchMunkakor && !matchFeor) {
          return false
        }
      }

      // Típus szűrés
      if (t1041TypeFilter !== "all" && item.bejelentesTipus !== t1041TypeFilter) {
        return false
      }

      // Állapot szűrés
      if (t1041StatusFilter !== "all") {
        if (t1041StatusFilter === "igazolva" && !item.hasNyugta && item.allapot !== "igazolva") return false
        if (t1041StatusFilter === "bekuldve" && item.allapot !== "bekuldve") return false
        if (t1041StatusFilter === "elokeszitve" && item.allapot !== "elokeszitve") return false
        if (t1041StatusFilter === "elokeszitesre_var" && item.allapot !== "elokeszitesre_var") return false
      }

      return true
    })
  }, [t1041Data, t1041Search, t1041TypeFilter, t1041StatusFilter])

  // --- Payroll szűrés ---
  const filteredPayrollItems = useMemo(() => {
    if (!payrollData?.items) return []
    return payrollData.items.filter((item) => {
      // Egyéni dolgozó szűrés
      if (selectedPayrollEmployeeId !== "all" && item.dolgozoId !== selectedPayrollEmployeeId) {
        return false
      }

      if (payrollSearch.trim()) {
        const q = payrollSearch.toLowerCase()
        const matchName = item.nev.toLowerCase().includes(q)
        const matchAdo = item.adoazonosito.toLowerCase().includes(q)
        const matchTaj = item.tajSzam.toLowerCase().includes(q)
        const matchReszleg = item.reszleg.toLowerCase().includes(q)
        const matchMunkakor = item.munkakor.toLowerCase().includes(q)
        if (!matchName && !matchAdo && !matchTaj && !matchReszleg && !matchMunkakor) {
          return false
        }
      }

      if (payrollStatusFilter !== "all" && item.zarasStatusz !== payrollStatusFilter) {
        return false
      }

      return true
    })
  }, [payrollData, payrollSearch, payrollStatusFilter, selectedPayrollEmployeeId])

  // Kiválasztott egyéni dolgozó T1041-hez
  const selectedIndivEmp = useMemo(() => {
    return allEmployees.find((e) => e.dolgozoId === indivEmpId) || null
  }, [allEmployees, indivEmpId])

  // Egyéni T1041 ÁNYK vágólapra másolás
  const handleCopyIndivT1041 = () => {
    if (!selectedIndivEmp) return
    const row: T1041ReportRow = {
      id: `temp-${selectedIndivEmp.dolgozoId}`,
      bejelentesTipus: indivType as any,
      bejelentesTipusLabel:
        indivType === "U" ? "Új bejelentés (U)" : indivType === "V" ? "Változás bejelentés (V)" : "Kijelentés / Törlés (T)",
      biztositottNeve: selectedIndivEmp.nev,
      adoazonositoJel: selectedIndivEmp.adoazonosito || "-",
      tajSzam: selectedIndivEmp.tajSzam || "-",
      munkakor: selectedIndivEmp.munkakor || "-",
      feorKod: selectedIndivEmp.feorKod || "-",
      reszleg: selectedIndivEmp.reszleg || "-",
      jogviszonyKezdete: selectedIndivEmp.belepesDatuma || "-",
      jogviszonyVege: selectedIndivEmp.kilepesDatuma || undefined,
      valtozasDatuma: indivType === "V" ? new Date().toISOString().slice(0, 10) : undefined,
      valtozasJellege: indivType === "V" ? "Munkakör / Munkaidő módosulás" : undefined,
      hetiMunkaidoOra: selectedIndivEmp.hetiMunkaidoOra,
      allapot: "elokeszitve",
      allapotLabel: "Előkészítve",
      hasAdatlap: false,
      hasNyugta: false,
    }
    copyT1041ToClipboard([row])
  }

  // Egyéni T1041 A4 PDF előállítása és előnézete
  const handleGenerateIndivT1041Pdf = async () => {
    if (!selectedIndivEmp) return
    setIndivGeneratingPdf(true)
    toast.loading("A4 T1041 adatlap előállítása...", { id: "indiv-pdf" })
    try {
      const res = await generateT1041PdfAction({
        dolgozoId: selectedIndivEmp.dolgozoId,
        data: {
          bejelentesTipus: indivType as any,
          employeeName: selectedIndivEmp.nev,
          tajSzam: selectedIndivEmp.tajSzam !== "-" ? selectedIndivEmp.tajSzam : "",
          adoazonositoJel: selectedIndivEmp.adoazonosito !== "-" ? selectedIndivEmp.adoazonosito : "",
          munkakor: selectedIndivEmp.munkakor !== "-" ? selectedIndivEmp.munkakor : "",
          feorKod: selectedIndivEmp.feorKod !== "-" ? selectedIndivEmp.feorKod : "",
          jogviszonyKezdete: selectedIndivEmp.belepesDatuma || "",
          jogviszonyVege: selectedIndivEmp.kilepesDatuma || "",
          hetiMunkaidoOra: selectedIndivEmp.hetiMunkaidoOra,
          szuletesiHely: "",
          szuletesiDatum: "",
          anyjaNeve: "",
          lakcim: "",
          bekuldesDatuma: new Date().toISOString().slice(0, 10),
        },
      })
      toast.dismiss("indiv-pdf")
      if (res.error) {
        toast.error(res.error)
      } else if (res.document?.url) {
        const { data: signedData } = await supabase.storage
          .from("irat_files")
          .createSignedUrl(res.document.url, 300)

        if (signedData?.signedUrl) {
          setPreviewDoc({
            url: signedData.signedUrl,
            title: `${selectedIndivEmp.nev} - NAV T1041 Adatlap (${indivType})`,
          })
        }
        setIndividualT1041Open(false)
        toast.success("A4 T1041 adatlap sikeresen elkészült és beiktatva a dossziéba!")
        loadDataForTab("t1041", month)
      }
    } catch (err: any) {
      toast.dismiss("indiv-pdf")
      toast.error("Hiba a T1041 generálásakor: " + err.message)
    } finally {
      setIndivGeneratingPdf(false)
    }
  }

  // --- KSH szűrés ---
  const filteredKshDepartments = useMemo(() => {
    if (!kshData?.reszlegek) return []
    if (!kshSearch.trim()) return kshData.reszlegek
    const q = kshSearch.toLowerCase()
    return kshData.reszlegek.filter((r) => r.reszlegNev.toLowerCase().includes(q))
  }, [kshData, kshSearch])

  // --- Archívum szűrés ---
  const filteredArchiveRecords = useMemo(() => {
    if (!archiveRecords) return []
    if (!archiveSearch.trim()) return archiveRecords
    const q = archiveSearch.toLowerCase()
    return archiveRecords.filter(
      (r) =>
        r.tipus?.toLowerCase().includes(q) ||
        r.fajl_nev?.toLowerCase().includes(q) ||
        r.ugyszam?.toLowerCase().includes(q) ||
        r.idoszak?.toLowerCase().includes(q)
    )
  }, [archiveRecords, archiveSearch])

  // Nyugta feltöltés beküldése
  const handleReceiptUploadSubmit = async () => {
    if (!receiptModalItem || !receiptFile) {
      toast.error("Kérjük, válassz ki egy feltöltendő fájlt!")
      return
    }

    setUploadingReceipt(true)
    toast.loading("Nyugta feltöltése és iktatása...", { id: "rcpt-upload" })

    try {
      const formData = new FormData()
      formData.append("file", receiptFile)
      formData.append("t1041Id", receiptModalItem.id || "new")
      formData.append("employeeName", receiptModalItem.biztositottNeve)

      const res = await uploadT1041ReceiptFromReport(formData)
      if (res.error) {
        throw new Error(res.error)
      }

      toast.success("NAV Nyugta sikeresen feltöltve és igazolva!", { id: "rcpt-upload" })
      setReceiptModalItem(null)
      setReceiptFile(null)

      // Újratöltjük a T1041 adatokat
      loadDataForTab("t1041", month)
    } catch (err: any) {
      console.error(err)
      toast.error(`Sikertelen feltöltés: ${err.message || "Hiba"}`, { id: "rcpt-upload" })
    } finally {
      setUploadingReceipt(false)
    }
  }

  // Cafeteria exportálás Excelbe
  const handleCafeteriaExport = async () => {
    const year = parseInt(month.split("-")[0], 10)
    toast.loading("Cafeteria adatok összegyűjtése...", { id: "caf_exp" })
    try {
      const data = await getCafeteriaExportData(year)
      toast.dismiss("caf_exp")
      if (!data || data.length === 0) {
        toast.info("Nincs cafeteria adat ebben az évben.")
        return
      }
      exportCafeteriaToXlsx(data, year)
    } catch (err: any) {
      toast.dismiss("caf_exp")
      toast.error("Hiba a cafeteria exportálásakor: " + err.message)
    }
  }

  // Archívum fájl feltöltése
  const handleArchiveUpload = async () => {
    if (!archiveFile) {
      toast.error("Válassz ki egy fájlt a feltöltéshez!")
      return
    }

    setUploadingArchive(true)
    toast.loading("Fájl feltöltése az archívumba...", { id: "arch-upload" })

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error("Nincs bejelentkezve")

      const formData = new FormData()
      formData.append("file", archiveFile)
      formData.append("type", archiveType)
      formData.append("month", month)
      formData.append("userId", userData.user.id)
      formData.append("ugyszam", archiveUgyszam)

      const res = await uploadArchiveFileAdmin(formData)
      if (!res.success) throw new Error(res.error)

      toast.success("Bevallás sikeresen archiválva!", { id: "arch-upload" })
      setArchiveFile(null)
      setArchiveUgyszam("")
      loadDataForTab("archivum", month)
    } catch (err: any) {
      console.error(err)
      toast.error(`Feltöltés sikertelen: ${err.message || "Hiba"}`, { id: "arch-upload" })
    } finally {
      setUploadingArchive(false)
    }
  }

  // Archívum letöltés
  const handleDownloadArchive = async (filePath: string, fileName: string) => {
    toast.loading("Letöltés előkészítése...", { id: "dl" })
    const { data, error } = await supabase.storage.from("hr_reports").createSignedUrl(filePath, 60)
    toast.dismiss("dl")

    if (error || !data?.signedUrl) {
      toast.error("Hiba a letöltési link generálásakor")
      return
    }

    const a = document.createElement("a")
    a.href = data.signedUrl
    a.download = fileName
    a.target = "_blank"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Archívum törlés megerősítése
  const executeDeleteArchive = async () => {
    if (!itemToDelete) return
    toast.loading("Törlés folyamatban...", { id: "delete" })
    const res = await deleteArchiveRecordAdmin(itemToDelete.id, itemToDelete.filePath)
    if (res.success) {
      toast.success("Sikeresen törölve az archívumból!", { id: "delete" })
      loadDataForTab("archivum", month)
    } else {
      toast.error(`Hiba történt: ${res.error}`, { id: "delete" })
    }
    setItemToDelete(null)
  }

  // Egyedi sor másolása ÁNYK formátumban
  const handleCopySingleT1041 = (item: T1041ReportRow) => {
    copyT1041ToClipboard([item])
  }

  // Kompakt időszakválasztó és frissítő gomb a táblázat eszköztárába (Szűrés mellé)
  const renderPeriodPicker = () => (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="flex items-center gap-1.5 bg-background border border-input rounded-md px-2.5 h-9 text-xs transition-colors hover:border-input/80">
        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
        <input
          type="month"
          value={month}
          onChange={(e) => {
            if (e.target.value) setMonth(e.target.value)
          }}
          className="bg-transparent text-xs font-semibold tabular-nums focus:outline-none cursor-pointer text-foreground"
          title="Tárgyhónap kiválasztása"
        />
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={handleRefresh}
        disabled={loading || isRefreshing}
        className="h-9 w-9 shrink-0 bg-background hover:bg-muted/40 cursor-pointer"
        title="Riport adatok újratöltése"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* 1. STATISZTIKAI KÁRTYÁK (KPI GRID) KÖZVETLENÜL A CÍM ÉS ALCÍM ALATT */}
      {activeTab === "t1041" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard
            label="Összes esemény"
            value={t1041Data?.metrics.totalCount ?? "-"}
            sub="Tárgyhavi bejelentési tétel"
          />
          <KpiCard
            label="Új bejelentés (U)"
            value={t1041Data?.metrics.newIntakeCount ?? "-"}
            sub="Belépő munkavállaló"
          />
          <KpiCard
            label="Kijelentés (T)"
            value={t1041Data?.metrics.exitCount ?? "-"}
            sub="Jogviszony megszűnés"
          />
          <KpiCard
            label="Módosítás (V)"
            value={t1041Data?.metrics.changeCount ?? "-"}
            sub="Adat- vagy munkakör változás"
          />
          <KpiCard
            label="Igazolt bejelentés"
            value={t1041Data?.metrics.verifiedCount ?? "-"}
            sub="NAV nyugtával ellátva"
            highlight={
              Boolean(
                t1041Data?.metrics.totalCount &&
                  t1041Data.metrics.verifiedCount < t1041Data.metrics.totalCount
              )
            }
          />
        </div>
      )}

      {activeTab === "ksh" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard
            label="Záró állományi létszám"
            value={kshData ? `${kshData.zaroLetszam} fő` : "-"}
            sub="Tárgyhó utolsó napján"
          />
          <KpiCard
            label="Átlagos FTE létszám"
            value={kshData ? kshData.atlagosFte.toFixed(2) : "-"}
            sub="Teljes munkaidős egyenérték"
          />
          <KpiCard
            label="Havi fluktuáció"
            value={kshData ? `+${kshData.belepettFo} / -${kshData.kilepettFo}` : "-"}
            sub="Belépők és kilépők száma"
          />
          <KpiCard
            label="Ledolgozott munkaóra (Tény)"
            value={kshData ? `${Number(kshData.osszesLedolgozottOra.toFixed(1))} ó` : "-"}
            sub={
              kshData
                ? `Norma: ${Number(kshData.normaMunkaora.toFixed(1))} ó (${kshData.teljesitesiArany}%)`
                : "Rendes és rendkívüli órák"
            }
          />
          <KpiCard
            label="Távolléti órák"
            value={
              kshData
                ? `${Math.round(kshData.szabadsagOra + kshData.betegszabadsagOra)} ó`
                : "-"
            }
            sub="Fizetett szabadság és betegség"
          />
        </div>
      )}

      {activeTab === "payroll" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard
            label="Érintett Munkavállalók"
            value={payrollData ? `${payrollData.metrics.totalEmployees} fő` : "-"}
            sub="Tárgyhónapban aktív jogviszonyok"
          />
          <KpiCard
            label="Jóváhagyott zárások"
            value={payrollData ? `${payrollData.metrics.closedCount} fő` : "-"}
            sub="Vezető által jóváhagyott jelenlét"
          />
          <KpiCard
            label="Folyamatban lévő"
            value={payrollData ? `${payrollData.metrics.pendingCount} fő` : "-"}
            sub="Zárásra vagy jóváhagyásra vár"
            highlight={Boolean(payrollData && payrollData.metrics.pendingCount > 0)}
          />
          <KpiCard
            label="Ledolgozott órák (Tény)"
            value={payrollData ? `${Number(payrollData.metrics.totalWorkedHours.toFixed(1))} ó` : "-"}
            sub={
              payrollData
                ? `Tervezett norma: ${Number((payrollData.metrics.totalPlannedHours || 0).toFixed(1))} ó`
                : "Összes elszámolt munkaidő"
            }
          />
          <KpiCard
            label="Havi Cafeteria keret"
            value={
              payrollData
                ? `${payrollData.metrics.totalCafeteriaGross.toLocaleString("hu-HU")} Ft`
                : "-"
            }
            sub="Igényelt juttatások összege"
          />
        </div>
      )}

      {activeTab === "archivum" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="Tárolt Dokumentumok"
            value={archiveRecords.length}
            sub="Összes archivált állomány"
          />
          <KpiCard
            label="NAV T1041 Nyugták"
            value={archiveRecords.filter((r) => r.type?.includes("T1041")).length}
            sub="Biztosítotti bejelentések"
          />
          <KpiCard
            label="Havi Bevallások (08)"
            value={archiveRecords.filter((r) => r.type?.includes("08")).length}
            sub="NAV járulékbevallások"
          />
          <KpiCard
            label="KSH & Egyéb Kimutatások"
            value={archiveRecords.filter((r) => !r.type?.includes("T1041") && !r.type?.includes("08")).length}
            sub="Statisztika és igazolások"
          />
        </div>
      )}

      {/* 2. FÜLES NAVIGÁCIÓ */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-[840px] h-10">
          <TabsTrigger value="t1041" className="gap-2">
            <Landmark className="w-4 h-4" />
            NAV T1041
          </TabsTrigger>
          <TabsTrigger value="ksh" className="gap-2">
            <Building className="w-4 h-4" />
            KSH Riport
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Bérszámfejtés
          </TabsTrigger>
          <TabsTrigger value="archivum" className="gap-2">
            <FileText className="w-4 h-4" />
            Bevallás Archívum
          </TabsTrigger>
        </TabsList>

        {/* ========================================================= */}
        {/* 1. FÜL: NAV T1041 HATÓSÁGI BEJELENTÉSEK                   */}
        {/* ========================================================= */}
        <TabsContent value="t1041" className="space-y-6 mt-0">
          {/* Toolbar és műveletek */}
          <Card className="border border-border/70 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold">T1041 Biztosítotti Hatósági Riport</CardTitle>
                  <CardDescription className="text-xs">
                    NAV T1041 adatszolgáltatás belépő, kilépő és jogviszony-módosítás alatt álló biztosítottakról.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8 font-medium text-xs border-primary/40 text-primary hover:bg-primary/5"
                    onClick={() => {
                      setIndividualT1041Open(true)
                      if (allEmployees.length > 0 && !indivEmpId) {
                        setIndivEmpId(allEmployees[0].dolgozoId)
                      }
                    }}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    + Egyéni T1041 Készítése
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8 font-medium text-xs"
                    onClick={() => copyT1041ToClipboard(filteredT1041Items)}
                    disabled={filteredT1041Items.length === 0}
                  >
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    ÁNYK Vágólapra
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8 font-medium text-xs"
                    onClick={() => exportT1041ToCsv(filteredT1041Items, month)}
                    disabled={filteredT1041Items.length === 0}
                  >
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                    CSV (BOM)
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 h-8 font-medium text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => exportT1041ToXlsx(filteredT1041Items, month)}
                    disabled={filteredT1041Items.length === 0}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Excel Export (.xlsx)
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-2 space-y-4">
              <TableToolbar
                searchValue={t1041Search}
                onSearchChange={setT1041Search}
                searchPlaceholder="Keresés név, TAJ, adójel, munkakör szerint..."
                periodPicker={renderPeriodPicker()}
                filterGroups={[
                  {
                    id: "type",
                    title: "Bejelentés Jellege",
                    options: [
                      { id: "all", label: "Mindegyik", checked: t1041TypeFilter === "all" },
                      { id: "U", label: "Új bejelentés (U)", checked: t1041TypeFilter === "U" },
                      { id: "T", label: "Kijelentés / Törlés (T)", checked: t1041TypeFilter === "T" },
                      { id: "V", label: "Változás / Módosítás (V)", checked: t1041TypeFilter === "V" },
                    ],
                    onToggle: (optId) => setT1041TypeFilter(optId),
                  },
                  {
                    id: "status",
                    title: "Hatósági Státusz",
                    options: [
                      { id: "all", label: "Mindegyik", checked: t1041StatusFilter === "all" },
                      { id: "igazolva", label: "Igazolva (Nyugta)", checked: t1041StatusFilter === "igazolva" },
                      { id: "bekuldve", label: "Beküldve", checked: t1041StatusFilter === "bekuldve" },
                      { id: "elokeszitve", label: "Előkészítve", checked: t1041StatusFilter === "elokeszitve" },
                      { id: "elokeszitesre_var", label: "Bejelentésre vár", checked: t1041StatusFilter === "elokeszitesre_var" },
                    ],
                    onToggle: (optId) => setT1041StatusFilter(optId),
                  },
                ]}
                activeFiltersCount={
                  (t1041TypeFilter !== "all" ? 1 : 0) + (t1041StatusFilter !== "all" ? 1 : 0)
                }
                onClearFilters={() => {
                  setT1041TypeFilter("all")
                  setT1041StatusFilter("all")
                }}
              />

              {/* Data Table */}
              <div className="rounded-md border border-border/70 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-[11px] border-b">
                    <tr>
                      <th className="py-2.5 px-3 font-medium w-10 text-center">#</th>
                      <th className="py-2.5 px-3 font-medium min-w-[180px]">Biztosított Neve</th>
                      <th className="py-2.5 px-3 font-medium w-24">Típus</th>
                      <th className="py-2.5 px-3 font-medium w-28">Adóazonosító</th>
                      <th className="py-2.5 px-3 font-medium w-28">TAJ Szám</th>
                      <th className="py-2.5 px-3 font-medium min-w-[160px]">Munkakör / FEOR</th>
                      <th className="py-2.5 px-3 font-medium w-28">Dátum</th>
                      <th className="py-2.5 px-3 font-medium w-20 text-center">Heti Óra</th>
                      <th className="py-2.5 px-3 font-medium w-36">Státusz</th>
                      <th className="py-2.5 px-3 font-medium w-48 text-right">Műveletek</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-muted-foreground">
                          <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-primary" />
                          Adatok betöltése folyamatban...
                        </td>
                      </tr>
                    ) : filteredT1041Items.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-muted-foreground">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          Nem található T1041 bejelentési adat a megadott feltételekkel ({month}).
                        </td>
                      </tr>
                    ) : (
                      filteredT1041Items.map((item, idx) => {
                        const isVerified = item.hasNyugta || item.allapot === "igazolva"
                        const isSubmitted = item.allapot === "bekuldve"
                        const isPending = item.allapot === "elokeszitesre_var"

                        return (
                          <tr key={item.id || idx} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-3 text-center text-muted-foreground tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-foreground">
                              {item.biztositottNeve}
                              <div className="text-[10px] text-muted-foreground truncate">{item.reszleg}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant="outline"
                                className={
                                  item.bejelentesTipus === "U"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : item.bejelentesTipus === "T"
                                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                    : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                }
                              >
                                {item.bejelentesTipus} ({item.bejelentesTipusLabel.split(" ")[0]})
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 tabular-nums font-mono text-[11px]">
                              {item.adoazonositoJel || "-"}
                            </td>
                            <td className="py-2.5 px-3 tabular-nums font-mono text-[11px]">
                              {item.tajSzam || "-"}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="truncate font-medium">{item.munkakor}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">FEOR: {item.feorKod}</div>
                            </td>
                            <td className="py-2.5 px-3 tabular-nums text-muted-foreground">
                              {item.jogviszonyKezdete || item.valtozasDatuma || "-"}
                            </td>
                            <td className="py-2.5 px-3 tabular-nums text-center font-medium">
                              {item.hetiMunkaidoOra} óra
                            </td>
                            <td className="py-2.5 px-3">
                              {isVerified ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Igazolva
                                </span>
                              ) : isSubmitted ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                                  <Clock className="w-3.5 h-3.5" />
                                  Beküldve
                                </span>
                              ) : isPending ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Bejelentésre vár
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                                  Előkészítve
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* Adatlap megtekintése ha van */}
                                {item.adatlapUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="T1041 A4 Adatlap megtekintése"
                                    className="h-7 w-7 p-0"
                                    onClick={() =>
                                      setPreviewDoc({
                                        url: item.adatlapUrl!,
                                        title: `${item.biztositottNeve} - T1041 Adatlap`,
                                      })
                                    }
                                  >
                                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                  </Button>
                                )}

                                {/* Nyugta megtekintése ha van */}
                                {item.nyugtaUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="NAV Igazoló Nyugta megtekintése"
                                    className="h-7 w-7 p-0 text-emerald-600"
                                    onClick={() =>
                                      setPreviewDoc({
                                        url: item.nyugtaUrl!,
                                        title: `${item.biztositottNeve} - Hivatalos NAV Nyugta`,
                                      })
                                    }
                                  >
                                    <FileCheck className="w-3.5 h-3.5" />
                                  </Button>
                                )}

                                {/* Nyugta feltöltése gomb ha nincs igazolva */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Hivatalos NAV Nyugta feltöltése"
                                  className="h-7 px-2 text-xs gap-1"
                                  onClick={() => {
                                    setReceiptModalItem(item)
                                    setReceiptFile(null)
                                  }}
                                >
                                  <Upload className="w-3 h-3 text-muted-foreground" />
                                  <span className="hidden sm:inline">Nyugta</span>
                                </Button>

                                {/* Egyedi sor másolása ÁNYK formátumban */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Sor másolása vágólapra (ÁNYK)"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleCopySingleT1041(item)}
                                >
                                  <Copy className="w-3 h-3 text-muted-foreground" />
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* 2. FÜL: KSH MUNKAÜGYI ÉS LÉTSZÁMSTATISZTIKAI JELENTÉS     */}
        {/* ========================================================= */}
        <TabsContent value="ksh" className="space-y-6 mt-0">
          {/* Fő akció és táblázatok */}
          <Card className="border border-border/70 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold">KSH Havi Statisztikai Munkaügyi Jelentés</CardTitle>
                  <CardDescription className="text-xs">
                    Összesített adatszolgáltatási mutatók a Központi Statisztikai Hivatal havi és negyedéves jelentéseihez.
                  </CardDescription>
                </div>

                <div>
                  <Button
                    size="sm"
                    className="gap-1.5 h-8 font-medium text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => kshData && exportKshToXlsx(kshData, month)}
                    disabled={!kshData}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    KSH Riport Letöltése (Excel)
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-2 space-y-4">
              <TableToolbar
                searchValue={kshSearch}
                onSearchChange={setKshSearch}
                searchPlaceholder="Keresés mutatók és FEOR kódok között..."
                periodPicker={renderPeriodPicker()}
              />
              {/* KSH FŐMUTATÓK TÁBLÁZAT */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  1. KSH Havi Főmutatók
                </h4>
                <div className="rounded-md border border-border/70 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-[11px] border-b">
                      <tr>
                        <th className="py-2.5 px-3 font-medium w-16">Kód</th>
                        <th className="py-2.5 px-3 font-medium">Mutató Megnevezése</th>
                        <th className="py-2.5 px-3 font-medium w-40 text-right">Havi Érték</th>
                        <th className="py-2.5 px-3 font-medium w-32">Mértékegység</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      <tr className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-mono font-medium text-primary">KSH-01</td>
                        <td className="py-2.5 px-3 font-medium">Záró állományi létszám (hó utolsó napján)</td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                          {kshData?.zaroLetszam ?? 0}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">fő</td>
                      </tr>
                      <tr className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-mono font-medium text-primary">KSH-02</td>
                        <td className="py-2.5 px-3 font-medium">Átlagos statisztikai állományi létszám (FTE)</td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                          {kshData?.atlagosFte?.toFixed(2) ?? "0.00"}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">fő (FTE)</td>
                      </tr>
                      <tr className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-mono font-medium text-primary">KSH-03</td>
                        <td className="py-2.5 px-3 font-medium">Tárgyhónapban belépők száma</td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums text-emerald-600">
                          +{kshData?.belepettFo ?? 0}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">fő</td>
                      </tr>
                      <tr className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-mono font-medium text-primary">KSH-04</td>
                        <td className="py-2.5 px-3 font-medium">Tárgyhónapban kilépők száma</td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums text-rose-600">
                          -{kshData?.kilepettFo ?? 0}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">fő</td>
                      </tr>
                      <tr className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-mono font-medium text-primary">KSH-05a</td>
                        <td className="py-2.5 px-3 font-medium">Törvényes havi norma munkaidő-alap (Terv)</td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums text-foreground">
                          {kshData ? Number(kshData.normaMunkaora.toFixed(1)) : 0}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">munkaóra</td>
                      </tr>
                      <tr className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-mono font-medium text-primary">KSH-05b</td>
                        <td className="py-2.5 px-3 font-medium">Ténylegesen teljesített rendes munkaórák (Tény)</td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                          {kshData ? Number(kshData.rendesMunkaora.toFixed(1)) : 0}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">munkaóra</td>
                      </tr>
                      <tr className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-mono font-medium text-primary">KSH-05c</td>
                        <td className="py-2.5 px-3 font-medium">Munkaidő-teljesítési arány (Tény / Terv)</td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                          {kshData ? `${Number(kshData.teljesitesiArany.toFixed(1))}%` : "0%"}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">%</td>
                      </tr>
                      <tr className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-mono font-medium text-primary">KSH-06</td>
                        <td className="py-2.5 px-3 font-medium">Teljesített rendkívüli munkaórák (túlóra)</td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                          {kshData ? Number(kshData.tulora.toFixed(1)) : 0}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">munkaóra</td>
                      </tr>
                      <tr className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-mono font-medium text-primary">KSH-07</td>
                        <td className="py-2.5 px-3 font-medium">Fizetett rendes szabadság</td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                          {kshData?.szabadsagNap ?? 0} nap ({kshData ? Number(kshData.szabadsagOra.toFixed(1)) : 0} óra)
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">nap / óra</td>
                      </tr>
                      <tr className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-mono font-medium text-primary">KSH-08</td>
                        <td className="py-2.5 px-3 font-medium">Betegszabadság (munkáltatói teher)</td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                          {kshData?.betegszabadsagNap ?? 0} nap (
                          {kshData ? Number(kshData.betegszabadsagOra.toFixed(1)) : 0} óra)
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">nap / óra</td>
                      </tr>
                      <tr className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-mono font-medium text-primary">KSH-09</td>
                        <td className="py-2.5 px-3 font-medium">Táppénzes állomány (TB teher)</td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                          {kshData?.tappenzNap ?? 0} nap
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">nap</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* RÉSZLEGEK SZERINTI BONTÁS */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    2. Szervezeti Egységek (Részlegek) Szerinti Létszám- és Óramegoszlás
                  </h4>
                  <div className="w-full sm:w-60">
                    <Input
                      placeholder="Szűrés részlegre..."
                      value={kshSearch}
                      onChange={(e) => setKshSearch(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>

                <div className="rounded-md border border-border/70 overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-[11px] border-b">
                      <tr>
                        <th className="py-2.5 px-3 font-medium">Részleg / Szervezeti Egység</th>
                        <th className="py-2.5 px-3 font-medium w-28 text-center">Aktív Létszám</th>
                        <th className="py-2.5 px-3 font-medium w-28 text-center">Átlagos FTE</th>
                        <th className="py-2.5 px-3 font-medium w-36 text-right">Törvényes Norma</th>
                        <th className="py-2.5 px-3 font-medium w-36 text-right">Ténylegesen Ledolgozott</th>
                        <th className="py-2.5 px-3 font-medium w-32 text-right">Távollét Óra</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredKshDepartments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-muted-foreground">
                            Nincs megjeleníthető részlegstatisztika.
                          </td>
                        </tr>
                      ) : (
                        filteredKshDepartments.map((dept, i) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="py-2.5 px-3 font-medium text-foreground">{dept.reszlegNev}</td>
                            <td className="py-2.5 px-3 text-center tabular-nums font-semibold">
                              {dept.aktivLetszam} fő
                            </td>
                            <td className="py-2.5 px-3 text-center tabular-nums">
                              {dept.atlagosFte.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                              {Number(dept.normaOra.toFixed(1))} óra
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums font-medium text-foreground">
                              {Number(dept.ledolgozottOra.toFixed(1))} óra
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                              {Number(dept.tavolletOra.toFixed(1))} óra
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* 3. FÜL: BÉRSZÁMFEJTÉSI CSOMAG EXPORT                      */}
        {/* ========================================================= */}
        <TabsContent value="payroll" className="space-y-6 mt-0">
          <Card className="border border-border/70 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold">Havi Bérszámfejtési Csomag és Jelenlét Export</CardTitle>
                  <CardDescription className="text-xs">
                    Bérprogramok (pl. Nexon, Kulcs-Bér, BaBér) számára előkészített jelenléti, túlóra, távollét és cafeteria adatok.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8 font-medium text-xs"
                    onClick={handleCafeteriaExport}
                  >
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                    Cafeteria Részletező (Excel)
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 h-8 font-medium text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => exportPayrollToXlsx(filteredPayrollItems, month)}
                    disabled={filteredPayrollItems.length === 0}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Bérszámfejtési Export (.xlsx)
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-2 space-y-4">
              <TableToolbar
                searchValue={payrollSearch}
                onSearchChange={setPayrollSearch}
                searchPlaceholder="Keresés munkavállaló, adójel, részleg, munkakör szerint..."
                periodPicker={renderPeriodPicker()}
                filterGroups={[
                  {
                    id: "dolgozo",
                    title: "Munkavállaló",
                    options: [
                      { id: "all", label: "Összes munkavállaló", checked: selectedPayrollEmployeeId === "all" },
                      ...(payrollData?.items.map((p) => ({
                        id: p.dolgozoId,
                        label: p.nev,
                        checked: selectedPayrollEmployeeId === p.dolgozoId,
                      })) || []),
                    ],
                    onToggle: (optId) => setSelectedPayrollEmployeeId(optId),
                  },
                  {
                    id: "zarasStatusz",
                    title: "Jelenlét Zárás Állapota",
                    options: [
                      { id: "all", label: "Mindegyik", checked: payrollStatusFilter === "all" },
                      { id: "jovahagyva", label: "Vezető által jóváhagyva", checked: payrollStatusFilter === "jovahagyva" },
                      { id: "jovahagyasra_var", label: "Jóváhagyásra vár", checked: payrollStatusFilter === "jovahagyasra_var" },
                      { id: "nyitott", label: "Még nyitott", checked: payrollStatusFilter === "nyitott" },
                    ],
                    onToggle: (optId) => setPayrollStatusFilter(optId),
                  },
                ]}
                activeFiltersCount={
                  (payrollStatusFilter !== "all" ? 1 : 0) + (selectedPayrollEmployeeId !== "all" ? 1 : 0)
                }
                onClearFilters={() => {
                  setPayrollStatusFilter("all")
                  setSelectedPayrollEmployeeId("all")
                }}
              />

              {/* Data Table */}
              <div className="rounded-md border border-border/70 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-[11px] border-b">
                    <tr>
                      <th className="py-2.5 px-3 font-medium w-10 text-center">#</th>
                      <th className="py-2.5 px-3 font-medium min-w-[180px]">Munkavállaló Neve</th>
                      <th className="py-2.5 px-3 font-medium w-28">Adóazonosító</th>
                      <th className="py-2.5 px-3 font-medium min-w-[150px]">Szervezeti Egység / Munkakör</th>
                      <th className="py-2.5 px-3 font-medium w-28 text-center">Munkanapok (Tény/Terv)</th>
                      <th className="py-2.5 px-3 font-medium w-32 text-right">Munkaórák (Tény/Terv)</th>
                      <th className="py-2.5 px-3 font-medium w-24 text-right">Túlóra</th>
                      <th className="py-2.5 px-3 font-medium w-28 text-center">Szabadság</th>
                      <th className="py-2.5 px-3 font-medium w-28 text-center">Betegszabadság</th>
                      <th className="py-2.5 px-3 font-medium w-28 text-right">Cafeteria</th>
                      <th className="py-2.5 px-3 font-medium w-32 text-center">Zárás Állapot</th>
                      <th className="py-2.5 px-3 font-medium w-32 text-center">Műveletek</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {loading ? (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-muted-foreground">
                          <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-primary" />
                          Bérszámfejtési adatok előkészítése folyamatban...
                        </td>
                      </tr>
                    ) : filteredPayrollItems.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-muted-foreground">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          Nincs megjeleníthető bérszámfejtési adat ({month}).
                        </td>
                      </tr>
                    ) : (
                      filteredPayrollItems.map((r, idx) => (
                        <tr key={r.dolgozoId} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 text-center text-muted-foreground tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-foreground">
                            {r.nev}
                            <div className="text-[10px] text-muted-foreground font-mono">TAJ: {r.tajSzam}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] tabular-nums">
                            {r.adoazonosito}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="truncate font-medium">{r.reszleg}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{r.munkakor}</div>
                          </td>
                          <td className="py-2.5 px-3 text-center tabular-nums">
                            <span className="font-semibold text-foreground">{r.ledolgozottMunkanap}</span>
                            <span className="text-muted-foreground"> / {r.tervezettMunkanap} nap</span>
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums">
                            <div className="font-semibold text-foreground">{Number(r.ledolgozottMunkaora.toFixed(1))} ó</div>
                            <div className="text-[10px] text-muted-foreground">Terv: {Number(r.tervezettMunkaora.toFixed(1))} ó</div>
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums">
                            {r.tuloraOra > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                +{Number(r.tuloraOra.toFixed(1))} ó
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center tabular-nums">
                            {r.szabadsagNap > 0 ? (
                              <span className="text-emerald-600 font-medium">{r.szabadsagNap} nap</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center tabular-nums">
                            {r.betegszabadsagNap > 0 ? (
                              <span className="text-rose-600 font-medium">{r.betegszabadsagNap} nap</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-medium">
                            {r.cafeteriaHaviBrutto > 0 ? (
                              `${r.cafeteriaHaviBrutto.toLocaleString("hu-HU")} Ft`
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {r.zarasStatusz === "jovahagyva" ? (
                              <Badge
                                variant="outline"
                                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                              >
                                Jóváhagyva
                              </Badge>
                            ) : r.zarasStatusz === "jovahagyasra_var" ? (
                              <Badge
                                variant="outline"
                                className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"
                              >
                                Jóváhagyásra vár
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-muted text-muted-foreground border-border/70 text-[10px]"
                              >
                                Nyitott
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[11px] gap-1 font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                title={`${r.nev} egyéni bérösszesítő letöltése (.xlsx)`}
                                onClick={() => exportSingleEmployeePayrollToXlsx(r, month)}
                              >
                                <Download className="w-3 h-3" />
                                Export
                              </Button>
                              <Link
                                href={`/hr/employee/${r.dolgozoId}`}
                                target="_blank"
                                className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title={`${r.nev} adatlapja és jelenléti íve`}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* 4. FÜL: BEVALLÁS ARCHÍVUM ÉS IGAZOLÁSOK                   */}
        {/* ========================================================= */}
        <TabsContent value="archivum" className="space-y-6 mt-0">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Új feltöltés kártya */}
            <Card className="md:col-span-1 border border-border/70 shadow-xs">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base font-semibold">Új Bevallás Feltöltése</CardTitle>
                <CardDescription className="text-xs">
                  Töltsd fel a beküldött igazolást, PDF nyugtát vagy hatósági XML/CSV fájlt.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Bevallás Típusa</label>
                  <select
                    value={archiveType}
                    onChange={(e) => setArchiveType(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="NAV T1041">NAV T1041 (Biztosítotti bejelentés)</option>
                    <option value="NAV 08">NAV 08-as havi járulékbevallás</option>
                    <option value="KSH">KSH Munkaügyi Jelentés</option>
                    <option value="Bérszámfejtés">Bérszámfejtési Csomag</option>
                    <option value="Egyéb">Egyéb Hatósági Igazolás</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Ügyszám / Iktatószám (opcionális)</label>
                  <Input
                    placeholder="Pl. NAV-2026/09-1234 vagy iktatószám"
                    value={archiveUgyszam}
                    onChange={(e) => setArchiveUgyszam(e.target.value)}
                    disabled={uploadingArchive}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Fájl kiválasztása</label>
                  <Input
                    type="file"
                    accept=".pdf,.xml,.csv,.xlsx"
                    disabled={uploadingArchive}
                    onChange={(e) => setArchiveFile(e.target.files?.[0] || null)}
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">Támogatott: PDF, XML, CSV, XLSX (max. 10 MB)</p>
                </div>

                <Button
                  className="w-full gap-2 text-xs font-medium bg-primary text-primary-foreground"
                  disabled={uploadingArchive || !archiveFile}
                  onClick={handleArchiveUpload}
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingArchive ? "Feltöltés folyamatban..." : "Archiválás és Iktatás"}
                </Button>
              </CardContent>
            </Card>

            {/* Feltöltött archívum lista */}
            <Card className="md:col-span-2 border border-border/70 shadow-xs">
              <CardHeader className="p-4 pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold">Tárolt Hatósági Dokumentumok</CardTitle>
                    <CardDescription className="text-xs">
                      A vállalkozás korábbi időszakainak beküldött bevallásai és nyugtái.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderPeriodPicker()}
                    <div className="w-full sm:w-48">
                      <Input
                        placeholder="Keresés archívum..."
                        value={archiveSearch}
                        onChange={(e) => setArchiveSearch(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {filteredArchiveRecords.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs">Nem található archivált bevallás.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredArchiveRecords.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-3 border border-border/70 rounded-lg bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground">{r.tipus}</span>
                            <Badge variant="outline" className="text-[10px] tabular-nums font-mono">
                              {r.idoszak}
                            </Badge>
                            {r.ugyszam && (
                              <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-mono border">
                                {r.ugyszam}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <span className="tabular-nums">
                              {new Date(r.bekuldes_datuma).toLocaleDateString("hu-HU")}
                            </span>
                            <span>•</span>
                            <span className="truncate max-w-xs">{r.fajl_nev}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Letöltés"
                            onClick={() => handleDownloadArchive(r.fajl_utvonal, r.fajl_nev)}
                          >
                            <Download className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            title="Törlés"
                            onClick={() => setItemToDelete({ id: r.id, filePath: r.fajl_utvonal })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ========================================================= */}
      {/* MODAL 1: NAV T1041 BEFOGADÁSI NYUGTA FELTÖLTÉSE           */}
      {/* ========================================================= */}
      <Dialog open={receiptModalItem !== null} onOpenChange={(open) => !open && setReceiptModalItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">NAV T1041 Nyugta Csatolása</DialogTitle>
            <DialogDescription className="text-xs">
              Csatold a NAV-tól letöltött hivatalos befogadási nyugtát a biztosított bejelentéséhez.
            </DialogDescription>
          </DialogHeader>

          {receiptModalItem && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/40 p-3 rounded-md border text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Munkavállaló:</span>
                  <span className="font-semibold text-foreground">{receiptModalItem.biztositottNeve}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Típus:</span>
                  <span className="font-medium">{receiptModalItem.bejelentesTipusLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TAJ / Adóazonosító:</span>
                  <span className="font-mono tabular-nums">
                    {receiptModalItem.tajSzam} / {receiptModalItem.adoazonositoJel}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Hivatalos Nyugta Fájl (PDF, XML, Kép)</label>
                <Input
                  type="file"
                  accept=".pdf,.xml,.png,.jpg,.jpeg"
                  disabled={uploadingReceipt}
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="text-xs h-9"
                />
                <p className="text-[11px] text-muted-foreground">
                  A feltöltést követően a bejelentés állapota automatikusan zöld „Igazolva” státuszra vált.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReceiptModalItem(null)}
              disabled={uploadingReceipt}
            >
              Mégse
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              onClick={handleReceiptUploadSubmit}
              disabled={uploadingReceipt || !receiptFile}
            >
              <Upload className="w-3.5 h-3.5" />
              {uploadingReceipt ? "Feltöltés folyamatban..." : "Nyugta rögzítése"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 2: DOKUMENTUM ÉS NYUGTA ELŐNÉZET                    */}
      {/* ========================================================= */}
      <Dialog open={previewDoc !== null} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="sm:max-w-4xl md:max-w-5xl w-full h-[85vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="pb-2 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-semibold">{previewDoc?.title || "Dokumentum Előnézet"}</DialogTitle>
                <DialogDescription className="text-xs">
                  Hivatalos elektronikus irat és hatósági nyugta előnézete
                </DialogDescription>
              </div>
              {previewDoc?.url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 mr-6"
                  onClick={() => window.open(previewDoc.url, "_blank")}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Új ablakban
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 w-full min-h-0 pt-2">
            <DocumentPreviewFrame src={previewDoc?.url} title={previewDoc?.title} />
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 3: TÖRLÉS MEGERŐSÍTÉSE                              */}
      {/* ========================================================= */}
      <AlertDialog open={itemToDelete !== null} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Biztosan törölni szeretnéd?</AlertDialogTitle>
            <AlertDialogDescription>
              A törölt bevallás és az ahhoz tartozó fájl véglegesen eltávolításra kerül az archívumból. Ez a művelet nem
              vonható vissza.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDeleteArchive}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Törlés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ========================================================= */}
      {/* MODAL 4: EGYÉNI NAV T1041 GENERÁTOR ÉS ÁNYK MÁSOLÓ        */}
      {/* ========================================================= */}
      <Dialog open={individualT1041Open} onOpenChange={setIndividualT1041Open}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Landmark className="w-4 h-4 text-primary" />
              Egyéni NAV T1041 Bejelentés és Adatlap Generátor
            </DialogTitle>
            <DialogDescription className="text-xs">
              Válassz ki egy munkavállalót a vállalat teljes állományából egyedi hatósági adatlap, ÁNYK másolás vagy bejelentés készítéséhez.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Bejelentendő Munkavállaló</Label>
                <Select value={indivEmpId} onValueChange={(val) => setIndivEmpId(val || "")}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Válassz munkavállalót..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {allEmployees.map((emp) => (
                      <SelectItem key={emp.dolgozoId} value={emp.dolgozoId} className="text-xs">
                        {emp.nev} ({emp.reszleg})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Bejelentés Jellege</Label>
                <Select value={indivType} onValueChange={(val) => setIndivType(val || "U")}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="U" className="text-xs">
                      Új bejelentés (U) – Belépés
                    </SelectItem>
                    <SelectItem value="V" className="text-xs">
                      Változás bejelentés (V) – Módosítás
                    </SelectItem>
                    <SelectItem value="T" className="text-xs">
                      Kijelentés / Törlés (T) – Kilépés
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedIndivEmp ? (
              <div className="bg-muted/40 border border-border/70 rounded-md p-3.5 space-y-2 text-xs">
                <div className="font-semibold text-sm text-foreground flex items-center justify-between">
                  <span>{selectedIndivEmp.nev}</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {indivType === "U" ? "Új (U)" : indivType === "V" ? "Változás (V)" : "Törlés (T)"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1.5 border-t border-border/50">
                  <div>
                    <span className="font-medium text-foreground">Adóazonosító:</span> {selectedIndivEmp.adoazonosito}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">TAJ Szám:</span> {selectedIndivEmp.tajSzam}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">FEOR-08 Kód:</span> {selectedIndivEmp.feorKod}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Munkakör:</span> {selectedIndivEmp.munkakor}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Heti munkaidő:</span>{" "}
                    {selectedIndivEmp.hetiMunkaidoOra} óra/hét
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Belépés dátuma:</span>{" "}
                    {selectedIndivEmp.belepesDatuma || "-"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-muted-foreground border rounded-md">
                Kérjük, válassz ki egy munkavállalót a fenti listából.
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedIndivEmp}
              onClick={handleCopyIndivT1041}
              className="w-full sm:w-auto text-xs gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              ÁNYK Másolás Vágólapra
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIndividualT1041Open(false)}
                className="text-xs"
              >
                Bezárás
              </Button>
              <Button
                size="sm"
                disabled={!selectedIndivEmp || indivGeneratingPdf}
                onClick={handleGenerateIndivT1041Pdf}
                className="text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {indivGeneratingPdf ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                A4 Adatlap Előnézet (PDF)
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
