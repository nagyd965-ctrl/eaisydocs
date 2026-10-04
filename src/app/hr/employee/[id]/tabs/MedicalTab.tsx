"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Stethoscope, Eye, Download, Archive, FileCheck, Loader2, Upload } from "lucide-react"
import { addOrvosiVizsgalat, deleteOrvosiVizsgalat, fileMedicalExaminationAction } from "../actions"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
import { SafetyTrainingDialog } from "@/components/hr/safety-training-dialog"
import { HardHat } from "lucide-react"

export interface OrvosiVizsgalatRecord {
  id: string
  dolgozo_id: string
  tipus: string
  vizsgalat_datuma: string
  ervenyesseg_datuma: string
  eredmeny: string
  megjegyzes?: string | null
  orvos_neve?: string | null
  szakrendeles?: string | null
  fajl_url?: string | null
  dokumentum_id?: string | null
  iktatoszam?: string | null
  ugyirat_id?: string | null
  irat_id?: string | null
}

export function MedicalTab({ 
  employeeId, 
  employeeName,
  isHrOrAdmin, 
  currentUserRole,
  initialData 
}: { 
  employeeId: string, 
  employeeName?: string,
  isHrOrAdmin: boolean,
  currentUserRole: string,
  initialData: OrvosiVizsgalatRecord[]
}) {
  const showDetails = currentUserRole !== 'munkavedelmi'
  const [items, setItems] = useState<OrvosiVizsgalatRecord[]>(initialData)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filingId, setFilingId] = useState<string | null>(null)
  const [tipus, setTipus] = useState("idoszakos")
  const [eredmeny, setEredmeny] = useState("alkalmas")
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  
  const today = new Date().toISOString().split("T")[0]

  const tipusLabels: Record<string, string> = {
    elozetes: "Előzetes",
    idoszakos: "Időszakos",
    soron_kivuli: "Soron Kívüli",
    zaro: "Záró"
  }

  const eredmenyLabels: Record<string, string> = {
    alkalmas: "Alkalmas",
    fetelekkel_alkalmas: "Feltételekkel alkalmas",
    nem_alkalmas: "Nem alkalmas"
  }

  async function handleAdd(formData: FormData) {
    setLoading(true)
    const res = await addOrvosiVizsgalat(employeeId, formData)
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Orvosi vizsgálat sikeresen rögzítve!")
      setOpen(false)
      setSelectedFileName(null)
      // Oldal frissítése a szerver oldali szinkronhoz
      window.location.reload()
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteOrvosiVizsgalat(id, employeeId)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Orvosi vizsgálat törölve!")
      setItems(prev => prev.filter(i => i.id !== id))
    }
  }

  async function handleFile(id: string) {
    setFilingId(id)
    try {
      const res = await fileMedicalExaminationAction(id, employeeId)
      if (res.success) {
        toast.success(`Orvosi alkalmassági vélemény beiktatva a személyi dossziéba! (${res.iktatoszam})`)
        setItems(prev => prev.map(item => {
          if (item.id === id) {
            return {
              ...item,
              iktatoszam: res.iktatoszam,
              ugyirat_id: res.ugyirat_id,
              dokumentum_id: res.docId
            }
          }
          return item
        }))
      } else {
        toast.error(res.error || "Hiba történt az iktatás során.")
      }
    } catch (err: any) {
      toast.error("Váratlan hiba az iktatás során: " + (err?.message || "Ismeretlen hiba"))
    } finally {
      setFilingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary"/> Orvosi Alkalmassági Vizsgálatok
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Foglalkozás-egészségügyi vizsgálatok nyilvántartása, hivatalos alkalmassági vélemények generálása és iktatása (33/1998. NM rendelet).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SafetyTrainingDialog
            employeeName={employeeName || "Munkatárs"}
            dolgozoId={employeeId}
            triggerButton={
              <Button variant="outline" size="sm" className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10">
                <HardHat className="w-3.5 h-3.5 text-primary" />
                Munkavédelmi Oktatás
              </Button>
            }
          />

          {isHrOrAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-2`}>
                <Plus className="w-4 h-4" /> Hozzáadás
              </DialogTrigger>
            <DialogContent className="sm:max-w-[720px] w-full p-6 max-h-[92vh] overflow-y-auto">
              <DialogHeader className="pb-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-semibold">Új orvosi vizsgálat rögzítése</DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Foglalkozás-egészségügyi vizsgálati adatok rögzítése és alkalmassági vélemény kezelése (33/1998. NM rendelet).
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <form action={handleAdd} className="space-y-5 pt-3">
                {/* 1. Szekció: Vizsgálat és Eredmény */}
                <div className="rounded-lg border bg-card/60 p-4 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" /> 1. Vizsgálat Alapadatok
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Vizsgálat típusa</Label>
                      <Select name="tipus" value={tipus} onValueChange={(val) => val && setTipus(val)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Válassz típust">{tipusLabels[tipus]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="elozetes">Előzetes (Munkába lépéskor)</SelectItem>
                          <SelectItem value="idoszakos">Időszakos (Éves / Kétéves)</SelectItem>
                          <SelectItem value="soron_kivuli">Soron Kívüli (Visszatérés/Áthelyezés)</SelectItem>
                          <SelectItem value="zaro">Záró (Munkaviszony végén)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Orvosi eredmény</Label>
                      <Select name="eredmeny" value={eredmeny} onValueChange={(val) => val && setEredmeny(val)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Válassz eredményt">{eredmenyLabels[eredmeny]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alkalmas">Alkalmas</SelectItem>
                          <SelectItem value="fetelekkel_alkalmas">Feltételekkel alkalmas (Korlátozással)</SelectItem>
                          <SelectItem value="nem_alkalmas">Nem alkalmas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Vizsgálat elvégzésének dátuma</Label>
                      <Input name="vizsgalat_datuma" type="date" max={today} required className="w-full" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Érvényesség lejárata (Következő vizsgálat)</Label>
                      <Input name="ervenyesseg_datuma" type="date" required className="w-full" />
                    </div>
                  </div>
                </div>

                {/* 2. Szekció: Kiállító orvos és megjegyzések */}
                <div className="rounded-lg border bg-card/60 p-4 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground" /> 2. Orvos és Rendelő adatai (Opcionális)
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Vizsgáló szakorvos neve</Label>
                      <Input name="orvos_neve" placeholder="Pl. Dr. Kovács István" className="w-full" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Foglalkozás-egészségügyi szolgálat</Label>
                      <Input name="szakrendeles" placeholder="Pl. MediCare Foglalkozás-egészségügyi Kft." className="w-full" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Orvosi záradék / Megjegyzés / Korlátozás</Label>
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
                    onChange={(e) => setSelectedFileName(e.target.files?.[0]?.name || null)}
                  />

                  {selectedFileName ? (
                    <div className="text-xs text-primary font-medium flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-2 rounded-md">
                      <FileCheck className="w-4 h-4 shrink-0" />
                      <span>Feltöltésre kijelölt dokumentum: <strong>{selectedFileName}</strong></span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      💡 <strong>Nincs külön szkennelt leleted?</strong> Nem probléma! Ha nem választasz ki fájlt, a rendszer a mentéskor <strong>automatikusan kiállítja</strong> a hatályos <strong>33/1998. (VI. 24.) NM rendelet</strong> szerinti, A4-es hivatalos alkalmassági véleményt a dolgozó adataival és munkakörével.
                    </p>
                  )}
                </div>
                
                <DialogFooter className="pt-2 border-t flex flex-row items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Mégse
                  </Button>
                  <Button type="submit" disabled={loading} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stethoscope className="w-4 h-4" />}
                    <span>{loading ? "Rögzítés..." : "Vizsgálat mentése"}</span>
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center p-8 border rounded-lg border-dashed text-muted-foreground">
            Még nincsenek felrögzítve orvosi vizsgálatok.
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table className="compact-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Típus</TableHead>
                  <TableHead>Vizsgálat Dátuma</TableHead>
                  <TableHead>Érvényes Eddig</TableHead>
                  <TableHead>Eredmény</TableHead>
                  <TableHead>Megjegyzés</TableHead>
                  <TableHead>Iratkezelés</TableHead>
                  <TableHead className="text-right">Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const diff = new Date(item.ervenyesseg_datuma).getTime() - new Date().getTime()
                  const isExpired = diff < 0
                  const isExpiringSoon = diff >= 0 && diff < 30 * 24 * 60 * 60 * 1000

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{tipusLabels[item.tipus] || item.tipus}</TableCell>
                      <TableCell className="tabular-nums">{new Date(item.vizsgalat_datuma).toLocaleDateString("hu-HU")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className={`tabular-nums ${isExpired ? "text-destructive font-semibold" : isExpiringSoon ? "text-warning font-semibold" : ""}`}>
                            {new Date(item.ervenyesseg_datuma).toLocaleDateString("hu-HU")}
                          </span>
                          {isExpired && (
                            <span className="text-[11px] font-semibold text-destructive bg-destructive/10 border border-destructive/30 px-1.5 py-0.5 rounded">
                              Lejárt!
                            </span>
                          )}
                          {isExpiringSoon && (
                            <span className="text-[11px] font-semibold text-warning bg-warning/10 border border-warning/30 px-1.5 py-0.5 rounded">
                              Hamarosan lejár
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {showDetails ? (
                          item.eredmeny === "alkalmas" ? <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90 border-transparent">Alkalmas</Badge> : 
                          item.eredmeny === "fetelekkel_alkalmas" ? <Badge variant="secondary">Feltételes</Badge> : 
                          <Badge variant="destructive">Nem alkalmas</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">— (Rejtett)</span>
                        )}
                      </TableCell>
                    <TableCell>
                      {showDetails ? (
                        <div className="max-w-[200px] truncate" title={item.megjegyzes || ""}>
                          {item.megjegyzes || <span className="text-muted-foreground italic text-xs">-</span>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">— (Rejtett)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.iktatoszam ? (
                        <Link href={item.ugyirat_id ? `/dossiers/${item.ugyirat_id}` : `/dossiers`}>
                          <Badge 
                            variant="outline" 
                            className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 gap-1 text-xs cursor-pointer py-0.5"
                            title="Megnyitás a dolgozó személyi dossziéjában"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            Iktatva: {item.iktatoszam}
                          </Badge>
                        </Link>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-xs font-normal">
                          Vázlat / Nem iktatott
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* 1. In-browser Megtekintés PDF Viewer modalban */}
                        <PdfViewerDialog
                          url={`/api/hr/medical-pdf?id=${item.id}&preview=true`}
                          title={`Foglalkozás-egészségügyi Alkalmassági Vélemény - ${tipusLabels[item.tipus] || item.tipus}`}
                          trigger={
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                              title="Megtekintés a böngészőben"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          }
                        />

                        {/* 2. Közvetlen Letöltés */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                          onClick={() => window.open(`/api/hr/medical-pdf?id=${item.id}&download=true`, "_blank")}
                          title="Letöltés (PDF)"
                        >
                          <Download className="w-4 h-4" />
                        </Button>

                        {/* 3. Iktatás az eaisyDocs személyi dossziéba (ha még nincs iktatva) */}
                        {isHrOrAdmin && !item.iktatoszam && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => handleFile(item.id)}
                            disabled={filingId === item.id}
                            title="Iktatás a személyi dossziéba"
                          >
                            {filingId === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Archive className="w-4 h-4" />
                            )}
                          </Button>
                        )}

                        {/* 4. Törlés (csak ha nincs iktatva - iktatott irat védett!) */}
                        {isHrOrAdmin && (
                          item.iktatoszam ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled
                              className="h-8 w-8 opacity-30 cursor-not-allowed text-muted-foreground"
                              title="Iktatott irat a levéltári törvény értelmében nem törölhető!"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger className={`${buttonVariants({ variant: "ghost", size: "icon" })} h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors`} title="Törlés">
                                <Trash2 className="w-4 h-4" />
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Biztosan törlöd?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Ezzel véglegesen törlöd ezt az orvosi vizsgálati feljegyzést. (Csak iktatás előtti piszkozat törölhető.)
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Mégse</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Törlés
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )
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
