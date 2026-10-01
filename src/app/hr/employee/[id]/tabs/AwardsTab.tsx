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
  Award, 
  Trophy, 
  Sparkles, 
  Eye, 
  Download, 
  Archive, 
  Loader2, 
  FileCheck, 
  Coins, 
  Calendar, 
  Building2,
  UploadCloud,
  CheckCircle2,
  Medal
} from "lucide-react"
import { addKituntetes, deleteKituntetes, fileKituntetesAction } from "../actions"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"

export interface AwardItem {
  id: string
  dolgozo_id: string
  megnevezes: string
  kategoria: string
  datum: string
  adomanyozo?: string | null
  indoklas: string
  jutalom_osszeg?: number | null
  dokumentum_id?: string | null
  fajl_url?: string | null
  iktatoszam?: string | null
  ugyirat_id?: string | null
  irat_id?: string | null
  created_at?: string
}

export function AwardsTab({ 
  employeeId, 
  isHrOrAdmin, 
  initialData 
}: { 
  employeeId: string
  isHrOrAdmin: boolean
  initialData: AwardItem[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filingId, setFilingId] = useState<string | null>(null)
  const [selectedKategoria, setSelectedKategoria] = useState<string>("vallalati_dij")
  
  const today = new Date().toISOString().split("T")[0]

  const kategoriaMeta: Record<string, { label: string; badgeClass: string; icon: any }> = {
    vallalati_dij: {
      label: "Vállalati Kiválósági Díj",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      icon: Trophy,
    },
    szakmai_innovacio: {
      label: "Szakmai és Technológiai Innováció",
      badgeClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
      icon: Sparkles,
    },
    projekt_kivalosag: {
      label: "Kiemelkedő Projekt Teljesítmény",
      badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      icon: Award,
    },
    jubileum: {
      label: "Törzsgárda és Jubileumi Elismerés",
      badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      icon: Medal,
    },
    csapatmunka: {
      label: "Kiemelkedő Csapatmunka",
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      icon: CheckCircle2,
    },
    vezeto_dicseret: {
      label: "Vezérigazgatói Dicséret",
      badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      icon: Trophy,
    },
    egyeb: {
      label: "Szakmai Elismerés",
      badgeClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
      icon: Award,
    },
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set("kategoria", selectedKategoria)
    const res = await addKituntetes(employeeId, formData)
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Szakmai elismerés sikeresen rögzítve!")
      setOpen(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteKituntetes(id, employeeId)
    if (res.error) toast.error(res.error)
    else toast.success("Elismerés törölve!")
  }

  async function handleFile(awardId: string) {
    try {
      setFilingId(awardId)
      toast.info("Elismerő oklevél iktatása folyamatban...")
      const res = await fileKituntetesAction(awardId, employeeId)
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
            <Trophy className="w-5 h-5 text-amber-500" /> Kitüntetések és Szakmai Elismerések
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Vállalati díjak, jubileumi törzsgárda elismerések, innovációs nívódíjak és formális elismerő oklevelek.
          </p>
        </div>
        {isHrOrAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-2`}>
              <Plus className="w-4 h-4" /> Új elismerés adományozása
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Új szakmai kitüntetés és elismerés adományozása
                </DialogTitle>
                <DialogDescription>
                  Rögzítse a munkavállaló kiváló teljesítményét elismerő díjat. A rendszer reprezentatív díszoklevelet generál, amely közvetlenül beiktatható a dolgozó személyi dossziéjába.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleAdd} className="space-y-4 mt-2">
                {/* 1. Elismerés alapadatok */}
                <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" /> Elismerés és Díjazás adatai
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="megnevezes" className="text-xs font-medium">
                        Díj / Elismerés megnevezése <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="megnevezes"
                        name="megnevezes"
                        required
                        placeholder="Pl. Az Év Fejlesztője Kiválósági Díj 2026"
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="kategoria" className="text-xs font-medium">
                        Kategória
                      </Label>
                      <Select value={selectedKategoria} onValueChange={(val) => { if (val) setSelectedKategoria(val) }}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Válasszon kategóriát" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vallalati_dij">Vállalati Kiválósági Díj</SelectItem>
                          <SelectItem value="szakmai_innovacio">Szakmai és Technológiai Innováció</SelectItem>
                          <SelectItem value="projekt_kivalosag">Kiemelkedő Projekt Teljesítmény</SelectItem>
                          <SelectItem value="jubileum">Törzsgárda és Jubileumi Elismerés</SelectItem>
                          <SelectItem value="csapatmunka">Kiemelkedő Csapatmunka</SelectItem>
                          <SelectItem value="vezeto_dicseret">Vezérigazgatói Dicséret</SelectItem>
                          <SelectItem value="egyeb">Egyéb Szakmai Elismerés</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="datum" className="text-xs font-medium">
                        Adományozás / Elismerés dátuma <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="datum"
                        name="datum"
                        type="date"
                        defaultValue={today}
                        required
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="adomanyozo" className="text-xs font-medium">
                        Adományozó szervezet / Vezető
                      </Label>
                      <Input
                        id="adomanyozo"
                        name="adomanyozo"
                        placeholder="Pl. Vezérigazgató és Menedzsment"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="jutalom_osszeg" className="text-xs font-medium flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-500" />
                      Kapcsolódó pénzjutalom összege (Ft, opcionális)
                    </Label>
                    <Input
                      id="jutalom_osszeg"
                      name="jutalom_osszeg"
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="Pl. 250000 (üresen hagyható)"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* 2. Indoklás és méltatás */}
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <Label htmlFor="indoklas" className="text-xs font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Hivatalos indoklás és méltatás <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="indoklas"
                    name="indoklas"
                    required
                    rows={4}
                    placeholder="Írja le a kitüntetés indoklását, az elért kiemelkedő mérföldköveket, a kolléga példamutató hozzáállását és a vállalat iránti elkötelezettségét..."
                    className="text-sm resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Ez a méltatás fog megjelenni a reprezentatív Elismerő Oklevél központi részeként.
                  </p>
                </div>

                {/* 3. Opcionális szkennelt oklevél feltöltése */}
                <div className="rounded-lg border border-dashed p-3 space-y-1.5 bg-muted/10">
                  <Label htmlFor="file" className="text-xs font-medium flex items-center gap-1.5 cursor-pointer">
                    <UploadCloud className="w-4 h-4 text-primary" />
                    Már aláírt / átadott díszoklevél szkennelt példánya (opcionális PDF)
                  </Label>
                  <Input
                    id="file"
                    name="file"
                    type="file"
                    accept=".pdf,image/*"
                    className="h-9 text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Ha nem tölt fel fájlt, a rendszer automatikusan kiállítja a formális elismerő oklevelet.
                  </p>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                    Mégse
                  </Button>
                  <Button type="submit" disabled={loading} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Elismerés Rögzítése
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>

      <CardContent>
        {initialData.length === 0 ? (
          <div className="text-center py-10 border border-dashed rounded-lg bg-muted/10">
            <Trophy className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Még nem rögzítettek szakmai kitüntetést vagy elismerést</p>
            <p className="text-xs text-muted-foreground/75 mt-1">
              A kiemelkedő teljesítmények, projekt sikerek és jubileumok elismerései itt jelennek meg.
            </p>
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead className="font-semibold">Elismerés / Díj</TableHead>
                  <TableHead className="font-semibold">Kategória</TableHead>
                  <TableHead className="font-semibold">Dátum</TableHead>
                  <TableHead className="font-semibold">Adományozó</TableHead>
                  <TableHead className="font-semibold">Jutalom</TableHead>
                  <TableHead className="font-semibold">Iktatás</TableHead>
                  <TableHead className="text-right font-semibold">Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialData.map((item) => {
                  const meta = kategoriaMeta[item.kategoria] || kategoriaMeta.egyeb
                  const Icon = meta.icon
                  return (
                    <TableRow key={item.id} className="text-sm hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="font-medium text-foreground flex items-center gap-2">
                          <Icon className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>{item.megnevezes}</span>
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5 pl-6" title={item.indoklas}>
                          {item.indoklas}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${meta.badgeClass} text-xs font-normal gap-1`}>
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.datum ? new Date(item.datum).toLocaleDateString("hu-HU") : "–"}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {item.adomanyozo || "Vállalatvezetés"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.jutalom_osszeg ? (
                          <span className="text-amber-600 dark:text-amber-400 font-mono text-xs">
                            {item.jutalom_osszeg.toLocaleString("hu-HU")} Ft
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Erkölcsi</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.iktatoszam ? (
                          <Link
                            href={item.ugyirat_id ? `/dossiers?open=${item.ugyirat_id}` : "#"}
                            className="inline-flex items-center gap-1.5"
                            title="Megtekintés a személyi dossziéban"
                          >
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer gap-1 text-xs font-mono">
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
                          {/* 1. In-browser Megtekintés PdfViewerDialog segítségével */}
                          <PdfViewerDialog
                            url={`/api/hr/award-pdf?id=${item.id}&preview=true`}
                            title={`Elismerő Oklevél - ${item.megnevezes}`}
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

                          {/* 2. Letöltés PDF formátumban */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                            onClick={() => window.open(`/api/hr/award-pdf?id=${item.id}&download=true`, "_blank")}
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

                          {/* 4. Törlés (iktatott irat védett) */}
                          {isHrOrAdmin && (
                            item.iktatoszam ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled
                                className="h-8 w-8 opacity-30 cursor-not-allowed text-muted-foreground"
                                title="Iktatott irat a levéltári szabályzat értelmében nem törölhető!"
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
                                      Ezzel véglegesen törlöd a "{item.megnevezes}" szakmai elismerés bejegyzését.
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
