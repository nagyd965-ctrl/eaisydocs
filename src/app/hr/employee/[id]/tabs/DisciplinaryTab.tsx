"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Trash2, 
  AlertTriangle, 
  Scale, 
  Eye, 
  Download, 
  Archive, 
  Loader2, 
  FileCheck, 
  Coins, 
  Calendar, 
  ShieldAlert,
  UploadCloud
} from "lucide-react"
import { addFegyelmi, deleteFegyelmi, fileDisciplinaryAction } from "../actions"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"

export interface DisciplinaryItem {
  id: string
  dolgozo_id: string
  tipus: "figyelmeztetes" | "megrovas" | "karterites" | "egyeb" | string
  datum: string
  indoklas: string
  hatarozat_szam?: string | null
  kar_osszeg?: number | null
  reszletfizetes_leiras?: string | null
  jogorvoslat_hatarido?: string | null
  atvetel_datuma?: string | null
  fajl_url?: string | null
  iktatoszam?: string | null
  ugyirat_id?: string | null
  irat_id?: string | null
  created_at?: string
}

export function DisciplinaryTab({ 
  employeeId, 
  isHrOrAdmin, 
  initialData 
}: { 
  employeeId: string
  isHrOrAdmin: boolean
  initialData: DisciplinaryItem[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filingId, setFilingId] = useState<string | null>(null)
  const [selectedTipus, setSelectedTipus] = useState<string>("figyelmeztetes")
  
  const today = new Date().toISOString().split("T")[0]

  // Kizárólag a jogi fegyelmi és kártérítési ügyeket mutatjuk (a kitüntetések a Fejlődés/Elismerések fülre kerültek)
  const items = initialData.filter((i) => i.tipus !== "kituntetes")

  const tipusMeta: Record<string, { label: string; badgeClass: string; icon: any }> = {
    figyelmeztetes: {
      label: "Írásbeli Figyelmeztetés (Mt. 56. §)",
      badgeClass: "bg-warning/10 text-warning border-warning/20",
      icon: AlertTriangle,
    },
    megrovas: {
      label: "Írásbeli Megrovás (Mt. 56. §)",
      badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
      icon: AlertTriangle,
    },
    karterites: {
      label: "Kártérítési Kötelezés (Mt. 179. §)",
      badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
      icon: Coins,
    },
    egyeb: {
      label: "Egyéb Munkáltatói Intézkedés",
      badgeClass: "bg-muted text-muted-foreground border-border",
      icon: Scale,
    },
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set("tipus", selectedTipus)
    const res = await addFegyelmi(employeeId, formData)
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Munkáltatói határozat sikeresen rögzítve!")
      setOpen(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteFegyelmi(id, employeeId)
    if (res.error) toast.error(res.error)
    else toast.success("Határozat törölve!")
  }

  async function handleFile(disciplinaryId: string) {
    try {
      setFilingId(disciplinaryId)
      toast.info("Fegyelmi határozat iktatása folyamatban...")
      const res = await fileDisciplinaryAction(disciplinaryId, employeeId)
      if (res.success) {
        toast.success(`Sikeresen iktatva! Iktatószám: ${res.iktatoszam}`)
      } else {
        toast.error(res.error || "Hiba történt az iktatás során")
      }
    } catch (e: any) {
      toast.error(e.message || "Váratlan hiba történt")
    } finally {
      setFilingId(null)
    }
  }

  return (
    <Card className="shadow-none border-border/80">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2 font-semibold">
            <Scale className="w-5 h-5 text-primary" /> Fegyelmi és Károkozási Ügyek (Mt. 56. §, 179. §)
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Munkáltatói fegyelmi határozatok, írásbeli intézkedések, kártérítési kötelezések és 30 napos törvényi jogorvoslatok nyilvántartása.
          </p>
        </div>
        {isHrOrAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-2`}>
              <Plus className="w-4 h-4" /> Új határozat rögzítése
            </DialogTrigger>
            <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-destructive" />
                  Új munkáltatói fegyelmi / kártérítési határozat rögzítése
                </DialogTitle>
                <DialogDescription>
                  Az Mt. 56. § szerinti fegyelmi intézkedés vagy az Mt. 179. § szerinti kártérítési kötelezés rögzítése. A rendszer automatikusan biztosítja a 30 napos bírósági jogorvoslati záradékot.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleAdd} className="space-y-4 mt-2">
                {/* 1. Típus és alapadatok */}
                <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5" /> Intézkedés besorolása és határozatszám
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="tipus" className="text-xs font-medium">
                        Intézkedés típusa <span className="text-destructive">*</span>
                      </Label>
                      <Select value={selectedTipus} onValueChange={(val) => { if (val) setSelectedTipus(val) }}>
                        <SelectTrigger id="tipus" className="h-9 text-sm">
                          <SelectValue placeholder="Válassz típust" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="figyelmeztetes">Írásbeli Figyelmeztetés (Mt. 56. §)</SelectItem>
                          <SelectItem value="megrovas">Írásbeli Megrovás (Mt. 56. §)</SelectItem>
                          <SelectItem value="karterites">Kártérítési Kötelezés (Mt. 179. §)</SelectItem>
                          <SelectItem value="egyeb">Egyéb Munkáltatói Intézkedés</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="hatarozat_szam" className="text-xs font-medium">
                        Egyedi határozatszám (opcionális)
                      </Label>
                      <Input
                        id="hatarozat_szam"
                        name="hatarozat_szam"
                        placeholder="Pl. FEGY-2026/001"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="datum" className="text-xs font-medium">
                        Esemény / intézkedés dátuma <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="datum"
                        name="datum"
                        type="date"
                        max={today}
                        defaultValue={today}
                        required
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="atvetel_datuma" className="text-xs font-medium">
                        Kézbesítés / átvétel dátuma
                      </Label>
                      <Input
                        id="atvetel_datuma"
                        name="atvetel_datuma"
                        type="date"
                        max={today}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Kártérítés specifikus mezők */}
                {selectedTipus === "karterites" && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5" /> Kártérítési összeg és levonási megállapodás (Mt. 179. §)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="kar_osszeg" className="text-xs font-medium">
                          Megfizetendő kár összege (Ft) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="kar_osszeg"
                          name="kar_osszeg"
                          type="number"
                          min="1"
                          required={selectedTipus === "karterites"}
                          placeholder="Pl. 85000"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="reszletfizetes_leiras" className="text-xs font-medium">
                          Levonási ütemezés / részletfizetés
                        </Label>
                        <Input
                          id="reszletfizetes_leiras"
                          name="reszletfizetes_leiras"
                          placeholder="Pl. Havi 25 000 Ft munkabérből történő levonással"
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Tényállás és indoklás */}
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <Label htmlFor="indoklas" className="text-xs font-medium">
                    Tényállás és indoklás <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Részletesen mutassa be az elkövetett munkaköri kötelezettségszegést, a bizonyítékokat és a munkavállaló meghallgatásának körülményeit.
                  </p>
                  <Textarea
                    id="indoklas"
                    name="indoklas"
                    required
                    rows={4}
                    placeholder="A munkavállaló a 2026. ... napján munkahelyéről igazolatlanul távol maradt..."
                    className="text-sm resize-y"
                  />
                </div>

                {/* 4. Opcionális: Aláírt dokumentum feltöltése */}
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5" /> Kézbesített / aláírt határozat csatolása (opcionális)
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Amennyiben az átvett vagy postai úton tértivevénnyel kézbesített határozat beszkennelve már rendelkezésre áll, csatolja itt PDF formátumban. Ellenkező esetben a rendszer dinamikusan előállítja a hivatalos határozatot.
                  </p>
                  <Input
                    name="file"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="h-9 text-xs file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>

                <DialogFooter className="mt-4 pt-2 border-t">
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                    Mégse
                  </Button>
                  <Button type="submit" size="sm" disabled={loading} className="gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
                    {loading ? "Rögzítés..." : "Határozat rögzítése"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center p-8 border rounded-lg border-dashed text-muted-foreground">
            <Scale className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
            <p className="text-sm font-medium">Nincsenek rögzített fegyelmi vagy kártérítési ügyek.</p>
            <p className="text-xs mt-1">A munkavállaló aktája fegyelmi szempontból tiszta és rendezett.</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table className="compact-table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold">Intézkedés Típusa</TableHead>
                  <TableHead className="font-semibold">Dátum & Átvétel</TableHead>
                  <TableHead className="font-semibold">Tényállás & Kárérték</TableHead>
                  <TableHead className="font-semibold">Jogorvoslat (30 nap)</TableHead>
                  <TableHead className="font-semibold">Iktatás</TableHead>
                  <TableHead className="text-right font-semibold">Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const meta = tipusMeta[item.tipus] || tipusMeta.figyelmeztetes
                  const isKarterites = item.tipus === "karterites"

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <Badge variant="outline" className={`${meta.badgeClass} gap-1 text-xs font-medium`}>
                          <meta.icon className="w-3 h-3" />
                          {meta.label}
                        </Badge>
                        {item.hatarozat_szam && (
                          <div className="text-[11px] font-mono text-muted-foreground mt-1">
                            {item.hatarozat_szam}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">
                          {new Date(item.datum).toLocaleDateString("hu-HU")}
                        </div>
                        {item.atvetel_datuma ? (
                          <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" /> Átvéve: {new Date(item.atvetel_datuma).toLocaleDateString("hu-HU")}
                          </div>
                        ) : (
                          <div className="text-muted-foreground/70 italic text-[11px]">Nincs átvételi dátum</div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <p className="text-xs text-foreground line-clamp-2" title={item.indoklas}>
                          {item.indoklas}
                        </p>
                        {isKarterites && item.kar_osszeg && (
                          <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-destructive tabular-nums">
                            <Coins className="w-3.5 h-3.5" />
                            Kárérték: {item.kar_osszeg.toLocaleString("hu-HU")} Ft
                            {item.reszletfizetes_leiras && (
                              <span className="text-[11px] font-normal text-muted-foreground">
                                • {item.reszletfizetes_leiras}
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.jogorvoslat_hatarido ? (
                          <span className="text-muted-foreground font-medium">
                            {new Date(item.jogorvoslat_hatarido).toLocaleDateString("hu-HU")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.iktatoszam ? (
                          <Link
                            href={item.ugyirat_id ? `/dossiers?open=${item.ugyirat_id}` : "#"}
                            className="inline-flex items-center gap-1.5"
                            title="Megtekintés a személyi dossziéban"
                          >
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20 hover:bg-success/20 transition-colors cursor-pointer gap-1 text-xs">
                              <FileCheck className="w-3.5 h-3.5" />
                              {item.iktatoszam}
                            </Badge>
                          </Link>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-xs font-normal">
                            Nem iktatott
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* 1. In-browser Megtekintés PDF olvasóban */}
                          <PdfViewerDialog
                            url={`/api/hr/disciplinary-pdf?id=${item.id}&preview=true`}
                            title={`Munkáltatói Határozat - ${meta.label}`}
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
                            onClick={() => window.open(`/api/hr/disciplinary-pdf?id=${item.id}&download=true`, "_blank")}
                            title="Letöltés (PDF)"
                          >
                            <Download className="w-4 h-4" />
                          </Button>

                          {/* 3. Iktatás az eaisyDocs személyi dossziéba */}
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

                          {/* 4. Törlés (csak ha nincs iktatva) */}
                          {isHrOrAdmin && (
                            item.iktatoszam ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled
                                className="h-8 w-8 opacity-30 cursor-not-allowed text-muted-foreground"
                                title="Iktatott fegyelmi határozat a levéltári szabályok szerint nem törölhető!"
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
                                      Ezzel véglegesen törlöd a határozat vázlatát. Csak iktatás előtti piszkozat törölhető.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Mégse</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDelete(item.id)} 
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
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
