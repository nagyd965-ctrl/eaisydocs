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
  isHrOrAdmin, 
  currentUserRole,
  initialData 
}: { 
  employeeId: string, 
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
        {isHrOrAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-2`}>
              <Plus className="w-4 h-4" /> Hozzáadás
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Új orvosi vizsgálat rögzítése</DialogTitle>
              </DialogHeader>
              <form action={handleAdd} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vizsgálat típusa</Label>
                    <Select name="tipus" value={tipus} onValueChange={(val) => val && setTipus(val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Válassz típust">{tipusLabels[tipus]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="elozetes">Előzetes</SelectItem>
                        <SelectItem value="idoszakos">Időszakos</SelectItem>
                        <SelectItem value="soron_kivuli">Soron Kívüli</SelectItem>
                        <SelectItem value="zaro">Záró</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Eredmény</Label>
                    <Select name="eredmeny" value={eredmeny} onValueChange={(val) => val && setEredmeny(val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Válassz eredményt">{eredmenyLabels[eredmeny]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alkalmas">Alkalmas</SelectItem>
                        <SelectItem value="fetelekkel_alkalmas">Feltételekkel alkalmas</SelectItem>
                        <SelectItem value="nem_alkalmas">Nem alkalmas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vizsgálat dátuma</Label>
                    <Input name="vizsgalat_datuma" type="date" max={today} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Érvényesség dátuma</Label>
                    <Input name="ervenyesseg_datuma" type="date" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kiadó orvos neve (Opcionális)</Label>
                    <Input name="orvos_neve" placeholder="Pl. Dr. Kovács István" />
                  </div>
                  <div className="space-y-2">
                    <Label>Foglalkozás-egészségügyi szolgálat</Label>
                    <Input name="szakrendeles" placeholder="Pl. MediCare Foglalkozás-egészségügy" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Megjegyzés / Korlátozás (Opcionális)</Label>
                  <Input name="megjegyzes" placeholder="Pl. Szemüveg viselése kötelező..." />
                </div>

                {/* Fájl feltöltés vagy automata generálás */}
                <div className="space-y-2 p-3.5 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-primary" />
                    <Label className="font-semibold text-xs uppercase tracking-wide text-foreground">
                      Hivatalos lelet / igazolás csatolása (PDF vagy kép)
                    </Label>
                  </div>
                  <Input 
                    type="file" 
                    name="file" 
                    accept=".pdf,image/*" 
                    className="cursor-pointer file:cursor-pointer text-xs" 
                    onChange={(e) => setSelectedFileName(e.target.files?.[0]?.name || null)}
                  />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {selectedFileName ? (
                      <span className="text-primary font-medium">Kiválasztott fájl: {selectedFileName}</span>
                    ) : (
                      "Opcionális. Ha feltöltesz fájlt, a rendszer azt tárolja; ha nem töltesz fel semmit, a rendszer a hatályos 33/1998. NM rendelet szerinti hivatalos alkalmassági véleményt generálja automatikusan."
                    )}
                  </p>
                </div>
                
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Mégse</Button>
                  <Button type="submit" disabled={loading}>{loading ? "Mentés..." : "Mentés"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center p-8 border rounded-lg border-dashed text-muted-foreground">
            Még nincsenek felrögzítve orvosi vizsgálatok.
          </div>
        ) : (
          <Table>
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
                    <TableCell>{new Date(item.vizsgalat_datuma).toLocaleDateString("hu-HU")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={isExpired ? "text-destructive font-semibold" : isExpiringSoon ? "text-warning font-semibold" : ""}>
                          {new Date(item.ervenyesseg_datuma).toLocaleDateString("hu-HU")}
                        </span>
                        {isExpired && (
                          <span className="text-[11px] font-semibold text-destructive bg-destructive/10 border border-destructive/30 px-1.5 py-0.5 rounded">
                            Lejárt!
                          </span>
                        )}
                        {isExpiringSoon && (
                          <span className="text-[11px] font-semibold text-warning bg-warning-subtle border border-warning/30 px-1.5 py-0.5 rounded">
                            Hamarosan lejár
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {showDetails ? (
                        item.eredmeny === "alkalmas" ? <Badge variant="default" className="bg-green-600 hover:bg-green-700">Alkalmas</Badge> : 
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
        )}
      </CardContent>
    </Card>
  )
}
