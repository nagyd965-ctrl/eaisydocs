"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  RefreshCw,
  Calendar,
  Download,
  Archive,
  Trash2,
  Clock,
  Building2,
} from "lucide-react"
import { forceExpireAllDossiers } from "@/app/archive/actions"
import { proposeDisposal, approveDisposal, getDisposalProtocolDownloadUrl } from "@/app/archive/disposal-actions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

export function ArchiveClient({
  archivedDossiers,
  scrappingSuggestions,
  pendingApprovals,
  scrappedDossiers,
  disposalBatches = [],
  cutoffDate,
  todayStr,
  currentUserRole = "ugyintezo",
  currentUserId = "",
}: {
  archivedDossiers: any[]
  scrappingSuggestions: any[]
  pendingApprovals: any[]
  scrappedDossiers: any[]
  disposalBatches?: any[]
  cutoffDate: string
  todayStr: string
  currentUserRole?: string
  currentUserId?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [downloadingBatchId, setDownloadingBatchId] = useState<string | null>(null)
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([])
  const [selectedApprovals, setSelectedApprovals] = useState<string[]>([])

  // Fordulónap input state
  const [targetCutoff, setTargetCutoff] = useState(cutoffDate)

  // Protocol Dialog State
  const [protocolOpen, setProtocolOpen] = useState(false)
  const [protocolData, setProtocolData] = useState<any>(null)

  // Prompt Dialog State
  const [approvePromptOpen, setApprovePromptOpen] = useState(false)
  const [approverName, setApproverName] = useState("")

  const handleCutoffApply = (dateValue: string) => {
    setTargetCutoff(dateValue)
    router.push(`/archive?cutoffDate=${dateValue}`)
  }

  const handlePropose = async () => {
    if (selectedSuggestions.length === 0) return
    setLoading(true)
    const result = await proposeDisposal(selectedSuggestions)
    if (result.error) {
      toast.error("Hiba", { description: result.error })
    } else {
      toast.success("Sikeres felterjesztés", {
        description: `${selectedSuggestions.length} db ügyirat felterjesztve jóváhagyásra (Négy szem elve).`,
      })
      setSelectedSuggestions([])
    }
    setLoading(false)
    router.refresh()
  }

  const handleApprove = async () => {
    if (selectedApprovals.length === 0) return
    if (!approverName || approverName.trim() === "") {
      toast.error("Hiba", { description: "Kérlek, add meg a jóváhagyó teljes nevét!" })
      return
    }

    setApprovePromptOpen(false)
    setLoading(true)

    const result = await approveDisposal(selectedApprovals, approverName.trim())
    if (result.error) {
      toast.error("Hiba a jóváhagyás során", { description: result.error })
    } else {
      toast.success("Selejtezés sikeresen jóváhagyva!", {
        description: "A hivatalos Selejtezési Jegyzőkönyv elkészült és archiválásra került.",
      })
      setSelectedApprovals([])

      // Automatikus PDF letöltés indítása a kapott base64-ből
      if (result.pdfBase64) {
        try {
          const byteCharacters = atob(result.pdfBase64)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: "application/pdf" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `Selejtezesi_Jegyzokonyv_${(result.protocolNumber || "SELEJT").replace(/\//g, "-")}.pdf`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        } catch (downloadErr) {
          console.error("Automatikus letöltési hiba:", downloadErr)
        }
      }

      // Dialog adatok beállítása
      setProtocolData({
        protocolNumber: result.protocolNumber,
        date: new Date().toLocaleDateString("hu-HU"),
        approver: approverName.trim(),
        proposer: result.proposer && result.proposer.trim() !== "" ? result.proposer : "Iratkezelő",
        items: result.disposedItems,
        pdfBase64: result.pdfBase64,
        storagePath: result.storagePath,
      })
      setProtocolOpen(true)
    }

    setLoading(false)
    router.refresh()
  }

  const handleDownloadSavedBatch = async (batch: any) => {
    if (!batch.jegyzokonyv_path) {
      toast.error("Ehhez a selejtezéshez nem található elmentett PDF jegyzőkönyv.")
      return
    }

    setDownloadingBatchId(batch.id)
    const res = await getDisposalProtocolDownloadUrl(batch.jegyzokonyv_path)
    if (res.error || !res.signedUrl) {
      toast.error("Nem sikerült letölteni a jegyzőkönyvet", { description: res.error })
    } else {
      window.open(res.signedUrl, "_blank")
    }
    setDownloadingBatchId(null)
  }

  const toggleSuggestion = (id: string) => {
    setSelectedSuggestions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleAllSuggestions = () => {
    if (selectedSuggestions.length === scrappingSuggestions.length) {
      setSelectedSuggestions([])
    } else {
      setSelectedSuggestions(scrappingSuggestions.map((s) => s.id))
    }
  }

  const toggleApproval = (id: string) => {
    setSelectedApprovals((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleAllApprovals = () => {
    if (selectedApprovals.length === pendingApprovals.length) {
      setSelectedApprovals([])
    } else {
      setSelectedApprovals(pendingApprovals.map((p) => p.id))
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="suggestions" className="w-full">
        <TabsList className="h-9 inline-flex w-fit items-center gap-1 p-1 bg-muted/80 rounded-lg">
          <TabsTrigger value="suggestions" className="flex items-center gap-1.5 px-3 h-7 text-xs sm:text-sm font-medium">
            <span>Javaslatok</span>
            {scrappingSuggestions.length > 0 && (
              <span className="inline-flex h-4 min-w-4 px-1.5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {scrappingSuggestions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-1.5 px-3 h-7 text-xs sm:text-sm font-medium">
            <span>Jóváhagyandó</span>
            {pendingApprovals.length > 0 && (
              <span className="inline-flex h-4 min-w-4 px-1.5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {pendingApprovals.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived" className="px-3 h-7 text-xs sm:text-sm font-medium">
            Irattárban
          </TabsTrigger>
          <TabsTrigger value="scrapped" className="px-3 h-7 text-xs sm:text-sm font-medium">
            Selejtezett & Jegyzőkönyvek
          </TabsTrigger>
        </TabsList>

        {/* 1. JAVASLATOK FÜL (Dátumszűrővel) */}
        <TabsContent value="suggestions" className="mt-6">
          <div className="border border-border/50 rounded-md bg-card mb-4">
            <div className="p-4 bg-muted/30 border-b border-border/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold mb-0.5">Selejtezési & Átadási Javaslatok</p>
                    <p className="text-muted-foreground text-xs">
                      Az irattári terv szerinti megőrzési időt elért ügyiratok listája a megadott fordulónapig.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await forceExpireAllDossiers()
                      router.refresh()
                    }}
                    title="Minden lezárt ügyirat megőrzési idejének lejárttá tétele teszteléshez"
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Lejárt generálás
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={selectedSuggestions.length === 0 || loading}
                    onClick={handlePropose}
                  >
                    Felterjesztés Selejtezésre ({selectedSuggestions.length})
                  </Button>
                </div>
              </div>

              {/* Fordulónap szűrősáv */}
              <div className="pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">Fordulónap (eddig lejárt ügyiratok):</span>
                  <Input
                    type="date"
                    value={targetCutoff}
                    onChange={(e) => handleCutoffApply(e.target.value)}
                    className="h-8 w-36 text-xs bg-background"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleCutoffApply(todayStr)}
                  >
                    Mai nap
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      const prevYear = new Date().getFullYear() - 1
                      handleCutoffApply(`${prevYear}-12-31`)
                    }}
                  >
                    Előző év vége
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  Összesen <span className="font-semibold text-foreground">{scrappingSuggestions.length} db</span> lejáró ügyirat a megadott fordulónapig.
                </div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        scrappingSuggestions.length > 0 &&
                        selectedSuggestions.length === scrappingSuggestions.length
                      }
                      onCheckedChange={toggleAllSuggestions}
                      aria-label="Összes kijelölése"
                    />
                  </TableHead>
                  <TableHead>Iktatószám</TableHead>
                  <TableHead>Irattári Tétel</TableHead>
                  <TableHead>Ügy Tárgya</TableHead>
                  <TableHead className="text-center">Iratok</TableHead>
                  <TableHead>Megőrzés Vége</TableHead>
                  <TableHead>Intézkedés Módja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scrappingSuggestions.length > 0 ? (
                  scrappingSuggestions.map((item) => {
                    const terv = Array.isArray(item.irattari_terv) ? item.irattari_terv[0] : item.irattari_terv
                    const isSelejtezheto = terv?.selejtezheto !== false
                    const isSelected = selectedSuggestions.includes(item.id)

                    return (
                      <TableRow
                        key={item.id}
                        className={`hover:bg-muted/50 transition-colors ${isSelected ? "bg-muted/40" : ""}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSuggestion(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link href={`/dossiers/${item.id}`} className="text-primary hover:underline font-mono">
                            {item.iktatoszam}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {terv?.tetelszam ? (
                            <span className="font-mono text-foreground font-medium mr-1.5">{terv.tetelszam}</span>
                          ) : null}
                          {terv?.megnevezes || "Általános"}
                        </TableCell>
                        <TableCell className="text-sm font-normal text-foreground max-w-xs truncate">
                          {item.ugy?.targy || "Nincs megadva"}
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono">
                          {item.irat?.[0]?.count ?? 1} db
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {item.megorzesi_ido_vege ? new Date(item.megorzesi_ido_vege).toLocaleDateString("hu-HU") : "Ismeretlen"}
                        </TableCell>
                        <TableCell>
                          {isSelejtezheto ? (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[11px] gap-1">
                              <Trash2 className="w-3 h-3" />
                              Selejtezhető
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[11px] gap-1">
                              <Building2 className="w-3 h-3" />
                              Levéltári átadás
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Nincs a megadott fordulónapig ({targetCutoff}) lejárt megőrzési idejű ügyirat.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 2. JÓVÁHAGYANDÓ FÜL (Négy-szem elv) */}
        <TabsContent value="approvals" className="mt-6">
          <div className="border border-border/50 rounded-md bg-card mb-4">
            <div className="p-4 bg-muted/30 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold mb-0.5">Jóváhagyandó Selejtezések (Négy-szem elve)</p>
                  <p className="text-muted-foreground text-xs">
                    Az iratkezelő által felterjesztett ügyiratok. Csak az intézményvezető hagyhatja jóvá, és a jóváhagyó nem egyezhet meg a felterjesztővel.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentUserRole === "ugyintezo" ? (
                  <Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-500 border-rose-500/30 py-1 px-2.5">
                    Ügyintézőként nem hagyhatsz jóvá (kizárólag Vezető vagy Admin a 4 szem elve alapján)
                  </Badge>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    disabled={selectedApprovals.length === 0 || loading}
                    onClick={() => setApprovePromptOpen(true)}
                  >
                    Selejtezés Jóváhagyása és Jegyzőkönyvezés ({selectedApprovals.length})
                  </Button>
                )}
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        pendingApprovals.length > 0 &&
                        selectedApprovals.length === pendingApprovals.length
                      }
                      onCheckedChange={toggleAllApprovals}
                      aria-label="Összes jóváhagyandó kijelölése"
                    />
                  </TableHead>
                  <TableHead>Iktatószám</TableHead>
                  <TableHead>Ügy Tárgya</TableHead>
                  <TableHead className="text-center">Iratok</TableHead>
                  <TableHead>Megőrzés Vége</TableHead>
                  <TableHead>Státusz</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingApprovals.length > 0 ? (
                  pendingApprovals.map((item) => {
                    const isSelected = selectedApprovals.includes(item.id)
                    return (
                      <TableRow
                        key={item.id}
                        className={`hover:bg-muted/50 transition-colors ${isSelected ? "bg-muted/40" : ""}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleApproval(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link href={`/dossiers/${item.id}`} className="text-primary hover:underline font-mono">
                            {item.iktatoszam}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">{item.ugy?.targy}</TableCell>
                        <TableCell className="text-center text-xs font-mono">
                          {item.irat?.[0]?.count ?? 1} db
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {item.megorzesi_ido_vege ? new Date(item.megorzesi_ido_vege).toLocaleDateString("hu-HU") : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[11px]">
                            Vezetői jóváhagyásra vár
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                      Nincsenek jóváhagyásra váró selejtezési javaslatok.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 3. IRATTÁRBAN FÜL */}
        <TabsContent value="archived" className="mt-6">
          <div className="border border-border/50 rounded-md bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Iktatószám</TableHead>
                  <TableHead>Ügy Tárgya</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead className="text-center">Iratok</TableHead>
                  <TableHead>Megőrzés Vége</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedDossiers.length > 0 ? (
                  archivedDossiers.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <Link href={`/dossiers/${item.id}`} className="text-primary hover:underline font-mono">
                          {item.iktatoszam}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{item.ugy?.targy}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.statusz === "irattarban" ? "Irattározva" : "Lezárva"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs font-mono">
                        {item.irat?.[0]?.count ?? 1} db
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {item.megorzesi_ido_vege ? new Date(item.megorzesi_ido_vege).toLocaleDateString("hu-HU") : "Folyamatos"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      Nincsenek lezárt ügyiratok.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 4. SELEJTEZETT & JEGYZŐKÖNYVEK FÜL */}
        <TabsContent value="scrapped" className="mt-6 space-y-6">
          {/* Csomagok és Hivatalos Jegyzőkönyvek */}
          <div className="border border-border/50 rounded-md bg-card">
            <div className="p-4 bg-muted/30 border-b border-border/50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold">Hivatalos Selejtezési Jegyzőkönyvek Archívuma</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                A négy-szem elve alapján jóváhagyott, hitelesített és letölthető jegyzőkönyvek.
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dátum</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead>Javaslattevő</TableHead>
                  <TableHead>Jóváhagyó Vezető</TableHead>
                  <TableHead className="text-center">Érintett Iratok</TableHead>
                  <TableHead className="text-right">Jegyzőkönyv</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disposalBatches.length > 0 ? (
                  disposalBatches.map((batch) => {
                    const itemCount = batch.selejtezes_tetel?.length || 0
                    const isApproved = batch.statusz === "jovahagyva"

                    return (
                      <TableRow key={batch.id}>
                        <TableCell className="text-xs font-mono">
                          {new Date(batch.created_at).toLocaleDateString("hu-HU")}
                        </TableCell>
                        <TableCell>
                          {isApproved ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
                              Jóváhagyva & Archív
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs">
                              Jóváhagyásra vár
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{batch.javaslattevo_nev}</TableCell>
                        <TableCell className="text-xs font-medium">{batch.jovahagyo_nev || "—"}</TableCell>
                        <TableCell className="text-center text-xs font-mono">{itemCount} db</TableCell>
                        <TableCell className="text-right">
                          {batch.jegyzokonyv_path ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1.5"
                              disabled={downloadingBatchId === batch.id}
                              onClick={() => handleDownloadSavedBatch(batch)}
                            >
                              <Download className="w-3.5 h-3.5" />
                              {downloadingBatchId === batch.id ? "Letöltés..." : "Jegyzőkönyv (PDF)"}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Nincs PDF</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                      Még nem készült selejtezési jegyzőkönyv a rendszerben.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Megsemmisített ügyiratok táblázata */}
          <div className="border border-border/50 rounded-md bg-card">
            <div className="p-4 bg-muted/30 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-destructive" />
                <h2 className="text-sm font-semibold">Megsemmisített Ügyiratok Nyilvántartása</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Az alábbi ügyiratok digitális fizikai állományai véglegesen törölve lettek, az eseménynapló rögzítve van.
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Iktatószám</TableHead>
                  <TableHead>Ügy Tárgya</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead>Fizikai Állományok</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scrappedDossiers.length > 0 ? (
                  scrappedDossiers.map((item) => (
                    <TableRow key={item.id} className="opacity-70">
                      <TableCell className="font-mono font-medium line-through text-muted-foreground">
                        {item.iktatoszam}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.ugy?.targy}</TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="text-xs">Véglegesen selejtezve</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">Fájlok megsemmisítve</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-xs">
                      Még nem selejteztek le ügyiratokat a rendszerből.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* SIKERES SELEJTEZÉS & JEGYZŐKÖNYV MODAL */}
      <Dialog open={protocolOpen} onOpenChange={setProtocolOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              Sikeres Selejtezés és Hitelesítés
            </DialogTitle>
            <DialogDescription>
              A hivatalos selejtezési folyamat befejeződött, a jegyzőkönyv kiállítva.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3 text-sm">
            <div className="p-3 bg-muted/40 rounded border border-border/50 space-y-1 font-mono text-xs">
              <p><span className="text-muted-foreground">Jegyzőkönyv száma:</span> <span className="font-bold text-foreground">{protocolData?.protocolNumber}</span></p>
              <p><span className="text-muted-foreground">Dátum:</span> {protocolData?.date}</p>
              <p><span className="text-muted-foreground">Javaslattevő:</span> {protocolData?.proposer}</p>
              <p><span className="text-muted-foreground">Jóváhagyó vezető:</span> {protocolData?.approver}</p>
              <p><span className="text-muted-foreground">Érintett ügyiratok:</span> {protocolData?.items?.length || 0} db</p>
            </div>
            <p className="text-xs text-muted-foreground">
              A generált hivatalos PDF jegyzőkönyv automatikusan letöltésre került és elmentődött a rendszer belső archívumában. Bármikor újraletölthető a "Selejtezett & Jegyzőkönyvek" fülről.
            </p>
          </div>

          <DialogFooter className="pt-2 border-t flex sm:justify-between">
            <Button variant="outline" onClick={() => setProtocolOpen(false)}>
              Bezárás
            </Button>
            {protocolData?.pdfBase64 && (
              <Button
                onClick={() => {
                  const byteCharacters = atob(protocolData.pdfBase64)
                  const byteNumbers = new Array(byteCharacters.length)
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i)
                  }
                  const byteArray = new Uint8Array(byteNumbers)
                  const blob = new Blob([byteArray], { type: "application/pdf" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `Selejtezesi_Jegyzokonyv_${(protocolData.protocolNumber || "SELEJT").replace(/\//g, "-")}.pdf`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                }}
                className="gap-2 bg-primary"
              >
                <Download className="w-4 h-4" />
                PDF Újraletöltése
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* JÓVÁHAGYÁSI MEGERŐSÍTŐ MODAL */}
      <Dialog open={approvePromptOpen} onOpenChange={setApprovePromptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selejtezés Jóváhagyása (Négy szem elve)</DialogTitle>
            <DialogDescription>
              Kérlek, add meg az intézményvezető vagy a selejtezési bizottság elnökének nevét a jegyzőkönyv hitelesítéséhez.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approver-name">Jóváhagyó Vezető Neve</Label>
              <Input
                id="approver-name"
                placeholder="pl. Dr. Kiss László"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Figyelem: A négy-szem elve értelmében a jóváhagyó nem egyezhet meg az ügyiratot felterjesztő munkatárssal.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovePromptOpen(false)}>
              Mégsem
            </Button>
            <Button onClick={handleApprove} disabled={loading || !approverName.trim()}>
              {loading ? "Feldolgozás és Jegyzőkönyvezés..." : "Jóváhagyás és PDF Kiállítás"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
