"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Coffee, 
  Settings, 
  FileText, 
  CheckCircle2, 
  RotateCcw, 
  Eye, 
  Download, 
  Archive, 
  Loader2, 
  ExternalLink 
} from "lucide-react"
import { 
  setCafeteriaBudget, 
  reopenCafeteriaDeclaration, 
  fileCafeteriaDeclarationAction 
} from "@/app/hr/cafeteria-actions"
import { toast } from "sonner"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"

export function CafeteriaTab({ 
  employeeId, 
  year, 
  budgetData,
  catalog,
  choices
}: { 
  employeeId: string, 
  year: number,
  budgetData: any,
  catalog: any[],
  choices: any[]
}) {
  const [loading, setLoading] = useState(false)
  const [reopenLoading, setReopenLoading] = useState(false)
  const [filing, setFiling] = useState(false)
  const [budgetAmount, setBudgetAmount] = useState<string>(budgetData?.osszeg?.toString() || "")
  
  const budget = budgetData?.osszeg || 0
  const isClosed = budgetData?.nyilatkozat_lezarva || false
  const iktatoszam = budgetData?.iktatoszam || null
  const totalUsed = choices.reduce((sum, c) => sum + c.levont_keret_osszeg, 0)
  const remaining = budget - totalUsed

  const handleSaveBudget = async () => {
    const numAmount = parseInt(budgetAmount)
    if (isNaN(numAmount) || numAmount < 0) {
      toast.error("Kérlek érvényes összeget adj meg!")
      return
    }

    setLoading(true)
    const result = await setCafeteriaBudget(employeeId, year, numAmount)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Keretösszeg sikeresen beállítva!")
    }
  }

  const handleReopen = async () => {
    setReopenLoading(true)
    const result = await reopenCafeteriaDeclaration(employeeId, year)
    setReopenLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Nyilatkozat sikeresen újranyitva!")
    }
  }

  const handleFile = async () => {
    setFiling(true)
    try {
      const res = await fileCafeteriaDeclarationAction(employeeId, year)
      if (res.success) {
        toast.success(`Cafeteria nyilatkozat sikeresen beiktatva! Iktatószám: ${res.iktatoszam}`)
      } else {
        toast.error(res.error || "Hiba az iktatás során")
      }
    } catch (err: any) {
      toast.error(err?.message || "Nem sikerült az iktatás")
    } finally {
      setFiling(false)
    }
  }

  const formatFt = (val: number) => {
    return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(val)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Bal oldal: Keretösszeg beállítása */}
        <Card className="border border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" /> Cafeteria Keret ({year})
            </CardTitle>
            <CardDescription>Határozd meg a dolgozó éves bruttó cafeteria keretét.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budgetAmount">Éves keretösszeg (Ft)</Label>
              <div className="flex gap-2">
                <Input 
                  id="budgetAmount" 
                  type="number" 
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="pl. 400000"
                />
                <Button onClick={handleSaveBudget} disabled={loading}>
                  {loading ? "Mentés..." : "Beállítás"}
                </Button>
              </div>
            </div>

            {budget > 0 && (
              <div className="bg-muted/30 p-4 rounded-lg border mt-6">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Felhasználható maradt</p>
                    <p className="text-2xl font-bold text-primary">{formatFt(remaining)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Teljes keret</p>
                    <p className="font-semibold">{formatFt(budget)}</p>
                  </div>
                </div>
                <Progress value={(totalUsed / budget) * 100} className="h-2.5 mt-4" />
                <p className="text-xs text-muted-foreground text-right mt-2">Felhasznált: {formatFt(totalUsed)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Jobb oldal: Dolgozó nyilatkozata */}
        <Card className="border border-border/50">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:justify-between lg:items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> Leadott Nyilatkozat
                </CardTitle>
                <div className="mt-1.5 space-y-1">
                  {isClosed ? (
                    <>
                      <div className="flex items-center gap-1.5 text-xs text-success font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>A dolgozó véglegesítette a nyilatkozatát.</span>
                      </div>
                      {iktatoszam && (
                        <div className="flex items-center gap-2 pt-0.5">
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30 font-mono text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Iktatva: {iktatoszam}
                          </Badge>
                          <a 
                            href={`/documents?search=${encodeURIComponent(iktatoszam)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                            title="Megnyitás az eaisyDocs személyi dossziéban"
                          >
                            <span>Dosszié megnyitása</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-warning">A dolgozó még nem adta le a nyilatkozatot.</span>
                  )}
                </div>
              </div>

              {isClosed && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* 1. In-browser Megtekintés modalban */}
                  <PdfViewerDialog
                    url={`/api/hr/cafeteria-pdf?employeeId=${employeeId}&year=${year}&preview=true`}
                    title={`Cafeteria Nyilatkozat (${year})`}
                    trigger={
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10 h-8"
                        title="Nyilatkozat megtekintése a böngészőben"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Megtekintés</span>
                      </Button>
                    }
                  />

                  {/* 2. Közvetlen Letöltés */}
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-1.5 h-8 text-muted-foreground hover:text-foreground"
                    onClick={() => window.open(`/api/hr/cafeteria-pdf?employeeId=${employeeId}&year=${year}&download=true`, '_blank')}
                    title="PDF letöltése közvetlenül lemezre"
                  >
                    <Download className="w-4 h-4" />
                    <span>Letöltés</span>
                  </Button>

                  {/* 3. Iktatás az eaisyDocs-ba (ha még nincs iktatva) */}
                  {!iktatoszam ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1.5 h-8 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={handleFile}
                      disabled={filing}
                      title="Hivatalos iktatás a dolgozó személyi dossziéjába (50 év megőrzés, bizalmas)"
                    >
                      {filing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                      <span>{filing ? "Iktatás..." : "Iktatás"}</span>
                    </Button>
                  ) : null}

                  {/* 4. Újranyitás */}
                  <AlertDialog>
                    <AlertDialogTrigger 
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-warning/30 bg-transparent hover:bg-warning/10 text-warning h-8 px-2.5" 
                      disabled={reopenLoading}
                      title="Nyilatkozat újranyitása módosításhoz"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Újranyitás
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Nyilatkozat újranyitása (Év közbeni módosítás)</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p>
                            Biztosan újranyitod a dolgozó nyilatkozatát? Ezzel a dolgozó újra módosíthatja és beküldheti a cafeteria választásait.
                          </p>
                          {iktatoszam && (
                            <div className="p-3 bg-muted/60 border rounded-md text-xs text-foreground font-medium">
                              ⚠️ <strong>Levéltári figyelem:</strong> Ez a nyilatkozat már hivatalosan be lett iktatva a személyi dossziéba (<strong>{iktatoszam}</strong>). A korábbi iktatott irat megőrzött archívumként megmarad, és az új nyilatkozat leadásakor új iratként iktatható.
                            </div>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Mégse</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReopen} className="bg-warning hover:bg-warning/90 text-warning-foreground">
                          Igen, Újranyitás
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {choices.length > 0 ? (
              <div className="space-y-3">
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="h-10 px-4 text-left font-medium text-muted-foreground">Elem</th>
                        <th className="h-10 px-4 text-right font-medium text-muted-foreground">Kért összeg</th>
                        <th className="h-10 px-4 text-right font-medium text-muted-foreground">Levont</th>
                      </tr>
                    </thead>
                    <tbody>
                      {choices.map((c) => {
                        const item = catalog.find(k => k.id === c.katalogus_elem_id)
                        return (
                          <tr key={c.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                            <td className="p-4 font-medium">{item?.nev || "Ismeretlen elem"}</td>
                            <td className="p-4 text-right">{formatFt(c.kert_osszeg)}</td>
                            <td className="p-4 text-right text-muted-foreground font-medium">{formatFt(c.levont_keret_osszeg)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between p-3 bg-muted rounded-md font-semibold mt-4 text-sm">
                  <span>Összesen levont:</span>
                  <span className="text-primary">{formatFt(totalUsed)}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border rounded-lg bg-background border-dashed">
                <Coffee className="w-8 h-8 mb-3 opacity-20" />
                <p>Nincsenek választott elemek.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
