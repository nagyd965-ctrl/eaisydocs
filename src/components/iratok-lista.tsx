"use client"

import { useState } from "react"
import { DocumentViewer } from "./document-viewer"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Eye, FileText, Download, Loader2, Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { BorrowDialog } from "./borrow-dialog"
import { PhysicalLocationDialog } from "./physical-location-dialog"
import { toast } from "sonner"
import { getDocumentSignedUrl } from "@/app/dossiers/[id]/viewer-actions"

export interface IratFajlItem {
  id: string
  irat_id?: string
  storage_path: string
  eredeti_fajlnev: string
  meret_byte?: number
  mime_type?: string
  verzio?: number
  pdfa_path?: string | null
}

export interface IratFizikaiHely {
  polc?: string | null
  doboz?: string | null
}

export interface IratTableItem {
  id: string
  targy: string
  erkeztetoszam?: string | null
  irany?: string
  minosites?: string
  irat_fajl?: IratFajlItem[]
  irat_fizikai_hely?: any
  irat_kolcsonzes_naplo?: {
    id?: string
    statusz?: string
    kolcsonvevo_user_id?: string
    kolcsonvevo_nev?: string | null
  }[]
  [key: string]: any
}

interface IratokListaProps {
  iratok: IratTableItem[];
  canEdit?: boolean;
  users?: { id: string, nev: string }[];
  dossierIktatoszam?: string;
  currentUserClearance?: string;
  isAdmin?: boolean;
}

export function IratokLista({ 
  iratok, 
  canEdit = true, 
  users = [], 
  dossierIktatoszam,
  currentUserClearance = "nyilt",
  isAdmin = false
}: IratokListaProps) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedFajl, setSelectedFajl] = useState<IratFajlItem | null>(null)
  const [selectedIratId, setSelectedIratId] = useState<string>("")
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const minositesHierarchy: Record<string, number> = {
    nyilt: 1,
    belso: 2,
    bizalmas: 3,
    szigoruan_bizalmas: 4
  }

  const checkClearance = (docMinosites?: string) => {
    if (isAdmin) return true
    const userLvl = minositesHierarchy[currentUserClearance] || 1
    const docLvl = minositesHierarchy[docMinosites || 'nyilt'] || 1
    return userLvl >= docLvl
  }

  const openViewer = (fajl: IratFajlItem, iratId: string, docMinosites?: string) => {
    if (!checkClearance(docMinosites)) {
      toast.error(`Hozzáférés megtagadva: A te biztonsági szinteddel (${currentUserClearance}) ez a bizalmas irat nem tekinthető meg.`)
      return
    }
    setSelectedFajl(fajl)
    setSelectedIratId(iratId)
    setViewerOpen(true)
  }

  const handleDownload = async (irat: IratTableItem, usePdfa: boolean = false) => {
    if (!checkClearance(irat.minosites)) {
      toast.error(`Hozzáférés megtagadva: A te biztonsági szinteddel (${currentUserClearance}) ez a bizalmas irat nem tölthető le.`)
      return
    }
    // Az első fájlt töltjük le (legújabb verzió)
    const fajl = irat.irat_fajl?.sort((a, b) => (b.verzio || 1) - (a.verzio || 1))?.[0]
    if (!fajl) {
      toast.error("Nincs letölthető fájl ehhez az irathoz.")
      return
    }

    const storagePath = (usePdfa && fajl.pdfa_path) ? fajl.pdfa_path : fajl.storage_path
    setDownloadingId(irat.id + (usePdfa ? "_pdfa" : ""))
    try {
      const result = await getDocumentSignedUrl(storagePath, irat.id, fajl.id)
      if (result.error) {
        toast.error(result.error)
        return
      }

      // Fetch the PDF blob from our secure API
      const response = await fetch(result.signedUrl!)
      if (!response.ok) {
        toast.error("Hiba a fájl letöltésekor.")
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const baseName = fajl.eredeti_fajlnev ? fajl.eredeti_fajlnev.replace(/\.[^/.]+$/, "") : "dokumentum"
      a.download = usePdfa ? `${baseName}_archiv_pdfa.pdf` : (fajl.eredeti_fajlnev || "letoltes.pdf")
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Fájl letöltve!")
    } catch (err) {
      console.error(err)
      toast.error("Váratlan hiba a letöltés során.")
    } finally {
      setDownloadingId(null)
    }
  }

  if (!iratok || iratok.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground border rounded-md bg-card">
        Nincs irat csatolva ehhez az ügyirathoz.
      </div>
    )
  }

  return (
    <div className="border rounded-md bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Iktatószám / Alszám</TableHead>
            <TableHead>Tárgy</TableHead>
            <TableHead>Irány</TableHead>
            <TableHead>Minősítés</TableHead>
            <TableHead>Fájlok & Archiválás</TableHead>
            <TableHead>Fizikai hely</TableHead>
            <TableHead className="text-right">Műveletek</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {iratok.map((irat) => {
            const hasAccess = checkClearance(irat.minosites)
            return (
              <TableRow key={irat.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col gap-0.5">
                    <div className="font-mono text-xs font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                      <span>
                        {dossierIktatoszam ? `${dossierIktatoszam}/${irat.alszam || 1}` : `${irat.alszam || 1}. alszám`}
                      </span>
                      {irat.irany === "kimeno" && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                          Válaszlevél
                        </Badge>
                      )}
                    </div>
                    {irat.erkeztetoszam ? (
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Érk: {irat.erkeztetoszam}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">
                        Helyben keletkezett / Kimenő
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-[220px]">
                  <div className="font-medium text-sm text-foreground truncate" title={irat.targy}>
                    {irat.targy}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize text-xs">
                    {{ bejovo: 'Bejövő', kimeno: 'Kimenő', belso: 'Belső' }[irat.irany as string] || irat.irany}
                  </Badge>
                </TableCell>
                <TableCell>
                  {(() => {
                    const min = irat.minosites || 'nyilt'
                    if (min === 'bizalmas') {
                      return (
                        <Badge className="text-[10px] px-2 py-0.5 bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1 w-fit font-bold shadow-[0_0_8px_rgba(244,63,94,0.15)]">
                          <Lock className="w-3 h-3" /> Bizalmas
                        </Badge>
                      )
                    }
                    if (min === 'szigoruan_bizalmas') {
                      return (
                        <Badge className="text-[10px] px-2 py-0.5 bg-red-600/20 text-red-300 border border-red-500/40 flex items-center gap-1 w-fit font-bold shadow-[0_0_8px_rgba(239,68,68,0.2)]">
                          <Lock className="w-3 h-3" /> Szigorúan bizalmas
                        </Badge>
                      )
                    }
                    if (min === 'belso') {
                      return (
                        <Badge className="text-[10px] px-2 py-0.5 bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1 w-fit font-semibold">
                          Belső
                        </Badge>
                      )
                    }
                    return (
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground border-border/60">
                        Nyílt
                      </Badge>
                    )
                  })()}
                </TableCell>
                <TableCell>
                  {!hasAccess ? (
                    <div 
                      onClick={() => toast.error(`Hozzáférés megtagadva: Az Ön biztonsági minősítése (${currentUserClearance.toUpperCase()}) nem elegendő a bizalmas tartalom megtekintéséhez!`)}
                      className="cursor-pointer flex items-center text-xs text-rose-400 font-semibold gap-1.5 p-2 bg-rose-500/10 border border-rose-500/25 rounded hover:bg-rose-500/20 transition-colors w-fit select-none"
                      title="Kattintson a részletekért"
                    >
                      <Lock className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                      <span>Bizalmas tartalom (Megtekintés zárolva)</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {irat.irat_fajl && irat.irat_fajl.length > 0 ? (
                        irat.irat_fajl.map((fajl: IratFajlItem) => (
                          <div key={fajl.id} className="flex items-center text-sm text-muted-foreground gap-2 group flex-wrap">
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate max-w-[160px]" title={fajl.eredeti_fajlnev}>
                              {fajl.eredeti_fajlnev}
                            </span>
                            {fajl.verzio && fajl.verzio > 1 ? (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 shrink-0">
                                v{fajl.verzio}
                              </Badge>
                            ) : null}
                            {fajl.pdfa_path ? (
                              <Badge 
                                variant="secondary" 
                                className="text-[10px] px-1.5 py-0 h-4 shrink-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium" 
                                title="PDF/A archiválási szabványnak megfelelő hiteles példány elkészült és letölthető"
                              >
                                PDF/A Kész ✓
                              </Badge>
                            ) : (
                              <Badge 
                                variant="outline" 
                                className="text-[10px] px-1.5 py-0 h-4 shrink-0 text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5 font-normal" 
                                title="A PDF/A archiválási formátumra való konvertálás a háttérmunkás sorban van"
                              >
                                PDF/A folyamatban...
                              </Badge>
                            )}
                            <button
                              type="button"
                              onClick={() => openViewer(fajl, irat.id, irat.minosites)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted shrink-0 text-primary"
                              title="Megtekintés"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Nincs fájl csatolva</span>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <div className="flex items-center">
                      {(() => {
                        const fizikai = Array.isArray(irat.irat_fizikai_hely) ? irat.irat_fizikai_hely[0] : irat.irat_fizikai_hely
                        return fizikai ? (
                          <div className="text-xs text-muted-foreground mb-1 flex items-center">
                            <span>Polc: <span className="font-semibold">{fizikai.polc || '-'}</span>, Doboz: <span className="font-semibold">{fizikai.doboz || '-'}</span></span>
                            {canEdit && <PhysicalLocationDialog iratId={irat.id} currentPolc={fizikai.polc || undefined} currentDoboz={fizikai.doboz || undefined} />}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground italic mb-1 flex items-center">
                            Nincs rögzítve
                            {canEdit && <PhysicalLocationDialog iratId={irat.id} />}
                          </div>
                        )
                      })()}
                    </div>
                    {canEdit && (
                      <BorrowDialog 
                        iratId={irat.id} 
                        users={users} 
                        activeBorrowLog={
                          irat.irat_kolcsonzes_naplo?.find((log) => log.statusz === "kikolcsonozve") as any
                        } 
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {!hasAccess ? (
                    <div className="flex items-center justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 text-xs font-medium border-rose-500/40 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                        onClick={() => toast.error(`Hozzáférés megtagadva: Az Ön biztonsági minősítése (${currentUserClearance.toUpperCase()}) nem engedélyezi a bizalmas irat megnyitását vagy letöltését!`)}
                        title={`Hozzáférés megtagadva: Az Ön biztonsági minősítése (${currentUserClearance.toUpperCase()}) nem elegendő`}
                      >
                        <Lock className="h-3.5 w-3.5 text-rose-500" />
                        Zárolva
                      </Button>
                    </div>
                  ) : (
                    irat.irat_fajl && irat.irat_fajl.length > 0 && (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button 
                          onClick={() => handleDownload(irat, false)} 
                          variant="outline" 
                          size="sm"
                          className="h-8 text-xs font-medium"
                          disabled={downloadingId === irat.id}
                          title="Eredeti feltöltött fájl letöltése"
                        >
                          {downloadingId === irat.id 
                            ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            : <Download className="mr-1.5 h-3.5 w-3.5" />
                          }
                          Fájl
                        </Button>
                        {irat.irat_fajl?.some(f => f.pdfa_path) && (
                          <Button 
                            onClick={() => handleDownload(irat, true)} 
                            variant="secondary" 
                            size="sm"
                            className="h-8 text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25"
                            disabled={downloadingId === irat.id + "_pdfa"}
                            title="Archiválási PDF/A hiteles változat letöltése"
                          >
                            {downloadingId === irat.id + "_pdfa" 
                              ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              : <Download className="mr-1.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            }
                            PDF/A
                          </Button>
                        )}
                      </div>
                    )
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <DocumentViewer 
        open={viewerOpen} 
        setOpen={setViewerOpen} 
        fajl={selectedFajl} 
        iratId={selectedIratId} 
      />
    </div>
  )
}
