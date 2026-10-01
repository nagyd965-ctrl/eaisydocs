"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Trash2, 
  GraduationCap, 
  Eye, 
  Download, 
  Archive, 
  Loader2, 
  FileCheck, 
  Building2, 
  Clock, 
  HelpCircle,
  UploadCloud
} from "lucide-react"
import { addStudyContract, deleteStudyContract, fileStudyContractAction } from "../actions"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"

export interface StudyContractItem {
  id: string
  dolgozo_id: string
  kepzes_neve: string
  intezmeny_neve?: string | null
  kepzes_szintje?: string | null
  koltseg?: number | null
  vallalt_munkaviszony_honap?: number | null
  lejarat_datuma?: string | null
  visszafizetesi_kotelezettseg?: boolean | null
  munkaido_kedvezmeny?: string | null
  fajl_url?: string | null
  iktatoszam?: string | null
  ugyirat_id?: string | null
  irat_id?: string | null
  created_at?: string
}

export function StudyContractTab({ 
  employeeId, 
  isHrOrAdmin, 
  initialData 
}: { 
  employeeId: string
  isHrOrAdmin: boolean
  initialData: StudyContractItem[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filingId, setFilingId] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const res = await addStudyContract(employeeId, formData)
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Tanulmányi szerződés sikeresen rögzítve!")
      setOpen(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteStudyContract(id, employeeId)
    if (res.error) toast.error(res.error)
    else toast.success("Tanulmányi szerződés törölve!")
  }

  async function handleFile(contractId: string) {
    try {
      setFilingId(contractId)
      toast.info("Tanulmányi szerződés iktatása folyamatban...")
      const res = await fileStudyContractAction(contractId, employeeId)
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
            <GraduationCap className="w-5 h-5 text-primary" /> Tanulmányi Szerződések (Mt. 229. §)
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Munkáltatói támogatással megvalósuló képzések, tanulmányi munkaidő-kedvezmények és jogszabályi kötelezettségvállalások.
          </p>
        </div>
        {isHrOrAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-2`}>
              <Plus className="w-4 h-4" /> Új szerződés rögzítése
            </DialogTrigger>
            <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  Új tanulmányi szerződés rögzítése
                </DialogTitle>
                <DialogDescription>
                  A Munka Törvénykönyve 229. § szerinti szerződés feltételeinek rögzítése. A rendszer automatikusan elkészíti a nyomtatható szerződésmintát, vagy feltölthető az aláírt szkennelt példány is.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleAdd} className="space-y-4 mt-2">
                {/* 1. Képzés adatai */}
                <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> Képzés és intézmény adatai
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="kepzes_neve" className="text-xs font-medium">
                        Képzés megnevezése <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="kepzes_neve"
                        name="kepzes_neve"
                        required
                        placeholder="Pl. Haladó Szoftverarchitektúra Mesterképzés"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="intezmeny_neve" className="text-xs font-medium">
                        Képző intézmény / Szervező
                      </Label>
                      <Input
                        id="intezmeny_neve"
                        name="intezmeny_neve"
                        placeholder="Pl. Budapesti Műszaki Egyetem"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="kepzes_szintje" className="text-xs font-medium">
                      Képzés jellege / szintje
                    </Label>
                    <Input
                      id="kepzes_szintje"
                      name="kepzes_szintje"
                      placeholder="Pl. Szakmai továbbképzés, Hatósági képesítés, Egyetemi képzés"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* 2. Anyagi feltételek és vállalt időtartam */}
                <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Támogatás és munkaviszony-vállalás (Mt. 229. §)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="koltseg" className="text-xs font-medium">
                        Támogatás összege (Ft)
                      </Label>
                      <Input
                        id="koltseg"
                        name="koltseg"
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="Pl. 450000"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="vallalt_munkaviszony_honap" className="text-xs font-medium">
                        Vállalt munkaviszony (hó)
                      </Label>
                      <Input
                        id="vallalt_munkaviszony_honap"
                        name="vallalt_munkaviszony_honap"
                        type="number"
                        min="1"
                        max="36"
                        defaultValue="24"
                        placeholder="Max. 36 hónap"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lejarat_datuma" className="text-xs font-medium">
                        Tanulmányok vége / Lejárat
                      </Label>
                      <Input
                        id="lejarat_datuma"
                        name="lejarat_datuma"
                        type="date"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="munkaido_kedvezmeny" className="text-xs font-medium">
                      Tanulmányi munkaidő-kedvezmény
                    </Label>
                    <Input
                      id="munkaido_kedvezmeny"
                      name="munkaido_kedvezmeny"
                      placeholder="Pl. Heti 4 óra tanulmányi idő és vizsganapokra 2 nap mentesülés távolléti díjjal"
                      defaultValue="A kötelező konzultációk és vizsganapok idejére munkavégzés alóli mentesülés távolléti díj fizetése mellett."
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="flex items-start space-x-2 pt-1">
                    <Checkbox id="visszafizetesi_kotelezettseg" name="visszafizetesi_kotelezettseg" defaultChecked className="mt-0.5" />
                    <div className="grid gap-1 leading-none">
                      <Label htmlFor="visszafizetesi_kotelezettseg" className="text-xs font-medium cursor-pointer">
                        Időarányos visszafizetési kötelezettség (Mt. 229. § (5) bek.)
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Ha a dolgozó a képzést nem fejezi be, vagy a vállalt idő előtt kilép, a le nem dolgozott idővel arányosan visszatéríti a támogatást.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Opcionális: Aláírt dokumentum feltöltése */}
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5" /> Aláírt szerződés csatolása (opcionális)
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Ha már rendelkezésre áll a mindkét fél által aláírt és beszkennelt tanulmányi szerződés, csatolja itt PDF formátumban. Ellenkező esetben a rendszer dinamikusan generálja a hivatalos szerződéspéldányt.
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
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                    {loading ? "Rögzítés..." : "Szerződés rögzítése"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {initialData.length === 0 ? (
          <div className="text-center p-8 border rounded-lg border-dashed text-muted-foreground">
            <GraduationCap className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
            <p className="text-sm font-medium">Még nincsenek felrögzítve tanulmányi szerződések.</p>
            <p className="text-xs mt-1">Az Mt. 229. § szerinti képzési támogatásokat a jobb felső gombbal adhatja hozzá.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold">Képzés és Intézmény</TableHead>
                  <TableHead className="font-semibold">Támogatás</TableHead>
                  <TableHead className="font-semibold">Vállalt Időtartam</TableHead>
                  <TableHead className="font-semibold">Lejárat</TableHead>
                  <TableHead className="font-semibold">Visszafizetés</TableHead>
                  <TableHead className="font-semibold">Iktatás</TableHead>
                  <TableHead className="text-right font-semibold">Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="font-medium text-sm text-foreground">{item.kepzes_neve}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3" />
                        {item.intezmeny_neve || "Akkreditált képző intézmény"}
                        {item.kepzes_szintje && <span className="text-[11px] opacity-75">• {item.kepzes_szintje}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.koltseg ? `${item.koltseg.toLocaleString("hu-HU")} Ft` : "Költségmentes"}
                    </TableCell>
                    <TableCell>
                      {item.vallalt_munkaviszony_honap ? (
                        <span className="font-medium">{item.vallalt_munkaviszony_honap} hónap</span>
                      ) : (
                        "–"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.lejarat_datuma || "–"}
                    </TableCell>
                    <TableCell>
                      {item.visszafizetesi_kotelezettseg !== false ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs">
                          Időarányos
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs font-normal">
                          Mentes
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.iktatoszam ? (
                        <Link
                          href={item.ugyirat_id ? `/dossiers?open=${item.ugyirat_id}` : "#"}
                          className="inline-flex items-center gap-1.5"
                          title="Megtekintés a személyi dossziéban"
                        >
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer gap-1 text-xs">
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
                        {/* 1. In-browser Megtekintés a PdfViewerDialog segítségével */}
                        <PdfViewerDialog
                          url={`/api/hr/study-contract-pdf?id=${item.id}&preview=true`}
                          title={`Tanulmányi Szerződés - ${item.kepzes_neve}`}
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
                          onClick={() => window.open(`/api/hr/study-contract-pdf?id=${item.id}&download=true`, "_blank")}
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

                        {/* 4. Törlés (ha nincs iktatva - az iktatott irat védett) */}
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
                                    Ezzel véglegesen törlöd a "{item.kepzes_neve}" tanulmányi szerződés vázlatát.
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
