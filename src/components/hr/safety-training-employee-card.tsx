"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  HardHat,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  FileCheck2,
  Eye,
  Download,
  CheckCircle2,
  Clock,
  User,
  Plus
} from "lucide-react"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
import { SafetyTrainingDialog } from "@/components/hr/safety-training-dialog"
import { calculateSafetyTrainingStatus } from "@/utils/hr/safety-compliance-calculator"

export interface SafetyTrainingItem {
  id: string
  dolgozo_id: string | null
  oktatas_tipusa: string
  oktatas_datuma: string
  ervenyesseg_vege?: string | null
  oktato_neve?: string | null
  oktato_beosztasa?: string | null
  tematika?: any
  megjegyzes?: string | null
  dokumentum_id?: string | null
  hr_dokumentum?: {
    id: string
    nev: string
    url: string
    iktatoszam?: string | null
    ugyirat_id?: string | null
  } | null
}

export interface SafetyTrainingEmployeeCardProps {
  employeeId: string
  employeeName: string
  munkakor?: string | null
  reszleg?: string | null
  isHrOrAdmin: boolean
  trainings: SafetyTrainingItem[]
}

const TRAINING_TYPE_LABELS: Record<string, string> = {
  elozetes_munkaba_allasi: "Előzetes munkába állási",
  idoszakos_ismetlo: "Időszakos ismétlődő",
  rendkivuli: "Rendkívüli",
  munkakor_valtozasi: "Munkakör-változási",
}

export function SafetyTrainingEmployeeCard({
  employeeId,
  employeeName,
  munkakor,
  reszleg,
  isHrOrAdmin,
  trainings = [],
}: SafetyTrainingEmployeeCardProps) {
  const router = useRouter()

  // Legfrissebb oktatás meghatározása
  const latestTraining = trainings && trainings.length > 0 ? trainings[0] : null
  const complianceStatus = calculateSafetyTrainingStatus(
    latestTraining?.ervenyesseg_vege || null
  )

  const handleSuccess = () => {
    router.refresh()
  }

  return (
    <Card className="border border-border/80 shadow-none">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <HardHat className="w-5 h-5 text-primary" />
            Munkavédelmi és Tűzvédelmi Oktatások
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Munkavédelmi törvény (Mvt. 55. §) és Tűzvédelmi törvény (Ttv. 22. §) szerinti kötelező oktatási jegyzőkönyvek és lejárati idők.
          </p>
        </div>

        {isHrOrAdmin && (
          <SafetyTrainingDialog
            employeeName={employeeName || "Munkatárs"}
            dolgozoId={employeeId}
            munkakor={munkakor}
            reszleg={reszleg}
            onSuccess={handleSuccess}
            triggerButton={
              <Button
                variant={complianceStatus.status === "hianyzik" || complianceStatus.status === "lejart" ? "default" : "outline"}
                size="sm"
                className="gap-1.5 text-xs h-8"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {complianceStatus.status === "hianyzik"
                    ? "Oktatás rögzítése"
                    : complianceStatus.status === "lejart"
                    ? "Ismétlő oktatás pótlása"
                    : "Új oktatás rögzítése"}
                </span>
              </Button>
            }
          />
        )}
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Aktuális Megfelelőségi Státusz Banner */}
        <div
          className={`p-4 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm ${
            complianceStatus.status === "ervenyess"
              ? "bg-success/5 border-success/20 text-foreground"
              : complianceStatus.status === "hamarosan_lejar"
              ? "bg-warning/5 border-warning/20 text-foreground"
              : "bg-destructive/5 border-destructive/20 text-foreground"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                complianceStatus.status === "ervenyess"
                  ? "bg-success/10 text-success border-success/30"
                  : complianceStatus.status === "hamarosan_lejar"
                  ? "bg-warning/10 text-warning border-warning/30"
                  : "bg-destructive/10 text-destructive border-destructive/30"
              }`}
            >
              {complianceStatus.status === "ervenyess" ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">
                  {complianceStatus.status === "ervenyess" && "Érvényes munkavédelmi és tűzvédelmi felkészítés"}
                  {complianceStatus.status === "hamarosan_lejar" && "Hamarosan lejáró oktatás (30 napon belül)!"}
                  {complianceStatus.status === "lejart" && "Lejárt munkavédelmi és tűzvédelmi oktatás!"}
                  {complianceStatus.status === "hianyzik" && "Hiányzó munkavédelmi oktatás!"}
                </span>

                <Badge
                  variant="outline"
                  className={`text-[11px] font-medium border ${
                    complianceStatus.status === "ervenyess"
                      ? "bg-success/10 text-success border-success/30"
                      : complianceStatus.status === "hamarosan_lejar"
                      ? "bg-warning/10 text-warning border-warning/30"
                      : "bg-destructive/10 text-destructive border-destructive/30"
                  }`}
                >
                  {complianceStatus.statusLabel}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">
                {complianceStatus.status === "ervenyess" && (
                  <>
                    Utolsó oktatás dátuma: <strong className="text-foreground">{latestTraining?.oktatas_datuma}</strong> | Érvényesség vége:{" "}
                    <strong className="text-foreground">{latestTraining?.ervenyesseg_vege || "—"}</strong> ({complianceStatus.daysRemaining} nap van hátra)
                  </>
                )}
                {complianceStatus.status === "hamarosan_lejar" && (
                  <>
                    Lejárat időpontja: <strong className="text-foreground">{latestTraining?.ervenyesseg_vege}</strong>. Már csak{" "}
                    <strong className="text-warning">{complianceStatus.daysRemaining} nap</strong> van hátra az érvényességből. Kérjük, ütemezze az éves ismétlő oktatást!
                  </>
                )}
                {complianceStatus.status === "lejart" && (
                  <>
                    Az oktatás érvényessége lejárt: <strong className="text-destructive">{latestTraining?.ervenyesseg_vege}</strong> ({Math.abs(complianceStatus.daysRemaining || 0)} napja). Az Mvt. 55. § alapján kötelező a pótlás!
                  </>
                )}
                {complianceStatus.status === "hianyzik" && (
                  <>
                    A munkatárs még nem vett részt rögzített munkavédelmi oktatáson. Az Mvt. 55. § értelmében csak az oktatást követően végezhet önálló munkát!
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Oktatási Előzmények Táblázat */}
        {trainings.length === 0 ? (
          <div className="text-center py-10 border border-dashed rounded-lg bg-muted/10 space-y-2">
            <HardHat className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <h4 className="text-sm font-medium text-foreground">Nincsenek rögzített oktatási előzmények</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Ehhez a munkatárshoz még nem lett rögzítve munkavédelmi vagy tűzvédelmi oktatási jegyzőkönyv.
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[130px] text-xs font-semibold">Oktatás dátuma</TableHead>
                  <TableHead className="text-xs font-semibold">Oktatás típusa</TableHead>
                  <TableHead className="text-xs font-semibold">Oktató</TableHead>
                  <TableHead className="text-xs font-semibold">Érvényesség vége</TableHead>
                  <TableHead className="text-xs font-semibold">Státusz</TableHead>
                  <TableHead className="text-xs font-semibold">Iktatott jegyzőkönyv</TableHead>
                  <TableHead className="text-right text-xs font-semibold w-[90px]">Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainings.map((t) => {
                  const itemStatus = calculateSafetyTrainingStatus(t.ervenyesseg_vege || null)
                  const doc = t.hr_dokumentum
                  const docUrl = doc?.url

                  return (
                    <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-xs tabular-nums">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{t.oktatas_datuma}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <span className="font-medium text-foreground">
                          {TRAINING_TYPE_LABELS[t.oktatas_tipusa] || t.oktatas_tipusa}
                        </span>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="space-y-0.5">
                          <div className="font-medium text-foreground">{t.oktato_neve || "—"}</div>
                          {t.oktato_beosztasa && (
                            <div className="text-[11px] text-muted-foreground">{t.oktato_beosztasa}</div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs tabular-nums">
                        {t.ervenyesseg_vege ? (
                          <div className="space-y-0.5">
                            <span className="font-medium">{t.ervenyesseg_vege}</span>
                            {itemStatus.daysRemaining !== null && (
                              <div className="text-[11px] text-muted-foreground">
                                {itemStatus.daysRemaining < 0
                                  ? `${Math.abs(itemStatus.daysRemaining)} napja lejárt`
                                  : `${itemStatus.daysRemaining} nap van hátra`}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-medium border ${
                            itemStatus.status === "ervenyess"
                              ? "bg-success/10 text-success border-success/30"
                              : itemStatus.status === "hamarosan_lejar"
                              ? "bg-warning/10 text-warning border-warning/30"
                              : "bg-destructive/10 text-destructive border-destructive/30"
                          }`}
                        >
                          {itemStatus.statusLabel}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {doc?.iktatoszam ? (
                          <div className="flex items-center gap-1.5">
                            {doc.ugyirat_id ? (
                              <Link href={`/dossiers/${doc.ugyirat_id}`}>
                                <Badge
                                  variant="outline"
                                  className="h-6 gap-1 px-2 text-[11px] font-medium border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                                  title="Megnyitás a dolgozó személyi dossziéjában"
                                >
                                  <FileCheck2 className="w-3 h-3" />
                                  <span>{doc.iktatoszam}</span>
                                </Badge>
                              </Link>
                            ) : (
                              <Badge
                                variant="outline"
                                className="h-6 gap-1 px-2 text-[11px] font-medium border-primary/30 bg-primary/5 text-primary"
                              >
                                <FileCheck2 className="w-3 h-3" />
                                <span>{doc.iktatoszam}</span>
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Vázlat / Nem iktatott</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {docUrl && (
                            <>
                              <PdfViewerDialog
                                url={
                                  docUrl.startsWith("http")
                                    ? docUrl
                                    : `/api/hr/download-document?path=${encodeURIComponent(docUrl)}&bucket=irat_files`
                                }
                                title={`Munkavédelmi Oktatási Jegyzőkönyv - ${employeeName}`}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                                    title="Jegyzőkönyv megtekintése"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                }
                              />

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() =>
                                  window.open(
                                    docUrl.startsWith("http")
                                      ? docUrl
                                      : `/api/hr/download-document?path=${encodeURIComponent(docUrl)}&bucket=irat_files`,
                                    "_blank"
                                  )
                                }
                                title="Letöltés (PDF)"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
