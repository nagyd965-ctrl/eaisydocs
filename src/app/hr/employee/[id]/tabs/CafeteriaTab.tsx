"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Coffee, Settings, FileText, CheckCircle2, RotateCcw } from "lucide-react"
import { setCafeteriaBudget, reopenCafeteriaDeclaration } from "@/app/hr/cafeteria-actions"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

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
  const [budgetAmount, setBudgetAmount] = useState<string>(budgetData?.osszeg?.toString() || "")
  
  const budget = budgetData?.osszeg || 0
  const isClosed = budgetData?.nyilatkozat_lezarva || false
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

  const formatFt = (val: number) => {
    return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(val)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Bal oldal: Keretösszeg beállítása */}
        <Card className="border shadow-sm">
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
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> Leadott Nyilatkozat
                </CardTitle>
                <CardDescription className="mt-1.5">
                  {isClosed 
                    ? <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-4 h-4"/> A dolgozó véglegesítette a nyilatkozatát.</span>
                    : <span className="text-amber-600">A dolgozó még nem adta le a nyilatkozatot.</span>
                  }
                </CardDescription>
              </div>
              {isClosed && (
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-amber-200 bg-transparent shadow-sm hover:bg-amber-50 text-amber-600 h-8 px-3" disabled={reopenLoading}>
                      <RotateCcw className="w-4 h-4 mr-2" /> Újranyitás
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Nyilatkozat újranyitása (Év közbeni módosítás)</AlertDialogTitle>
                        <AlertDialogDescription>
                          Biztosan újranyitod a dolgozó nyilatkozatát? Ezzel a korábbi (már lezárt és esetleg bérszámfejtett) nyilatkozat érvényét veszti, a dolgozónak újat kell leadnia, amiről új PDF fog készülni.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Mégse</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReopen} className="bg-amber-600 hover:bg-amber-700 text-white">
                          Igen, Újranyitás
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(`/api/hr/cafeteria-pdf?employeeId=${employeeId}&year=${year}`, '_blank')}
                  >
                    <FileText className="w-4 h-4 mr-2" /> PDF letöltése
                  </Button>
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
                          <tr key={c.id} className="border-b last:border-0">
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
                  <span>{formatFt(totalUsed)}</span>
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
