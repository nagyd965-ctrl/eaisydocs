"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Coffee, CheckCircle2, AlertCircle, Trash2, Plus } from "lucide-react"
import { submitCafeteriaDeclaration } from "@/app/hr/cafeteria-actions"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type CatalogItem = {
  id: string
  nev: string
  leiras: string
  szorzo: number
  kategoria: string
}

type DeclarationChoice = {
  katalogus_elem_id: string
  kert_osszeg: number
  levont_keret_osszeg: number
}

export interface ExistingCafeteriaChoice {
  katalogus_elem_id: string
  kert_osszeg: number
  levont_keret_osszeg: number
  [key: string]: unknown
}

export function CafeteriaDeclaration({ 
  employeeId, 
  year, 
  budget, 
  isClosed, 
  catalog,
  existingChoices 
}: { 
  employeeId: string, 
  year: number, 
  budget: number, 
  isClosed: boolean,
  catalog: CatalogItem[],
  existingChoices: ExistingCafeteriaChoice[]
}) {
  const [choices, setChoices] = useState<DeclarationChoice[]>(
    existingChoices.map(c => ({
      katalogus_elem_id: c.katalogus_elem_id,
      kert_osszeg: c.kert_osszeg,
      levont_keret_osszeg: c.levont_keret_osszeg
    }))
  )
  const [loading, setLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<string>("")
  const [amount, setAmount] = useState<string>("")

  const totalUsed = useMemo(() => {
    return choices.reduce((sum, choice) => sum + choice.levont_keret_osszeg, 0)
  }, [choices])

  const remaining = budget - totalUsed

  const handleAdd = () => {
    if (!selectedItem || !amount) return
    const numAmount = parseInt(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Kérlek érvényes összeget adj meg!")
      return
    }

    const item = catalog.find(c => c.id === selectedItem)
    if (!item) return

    const deducted = Math.round(numAmount * item.szorzo)

    if (totalUsed + deducted > budget) {
      toast.error("Nincs ekkora szabad kereted!")
      return
    }

    // Check if item already exists, then update it
    const existingIndex = choices.findIndex(c => c.katalogus_elem_id === selectedItem)
    if (existingIndex >= 0) {
      const newChoices = [...choices]
      newChoices[existingIndex].kert_osszeg += numAmount
      newChoices[existingIndex].levont_keret_osszeg += deducted
      setChoices(newChoices)
    } else {
      setChoices([...choices, {
        katalogus_elem_id: item.id,
        kert_osszeg: numAmount,
        levont_keret_osszeg: deducted
      }])
    }

    setAmount("")
    setSelectedItem("")
  }

  const handleRemove = (id: string) => {
    setChoices(choices.filter(c => c.katalogus_elem_id !== id))
  }

  const handleSubmit = async () => {
    if (choices.length === 0) {
      toast.error("Nem választottál egyetlen elemet sem!")
      return
    }
    
    setLoading(true)
    const result = await submitCafeteriaDeclaration(employeeId, year, choices)
    setLoading(false)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Nyilatkozat sikeresen véglegesítve!")
    }
  }

  const formatFt = (val: number) => {
    return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(val)
  }

  if (isClosed) {
    return (
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Cafeteria Nyilatkozat ({year}) - Leadva
          </CardTitle>
          <CardDescription>Erre az évre már leadtad és véglegesítetted a nyilatkozatodat.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {existingChoices.map((c, index) => {
              const item = catalog.find(k => k.id === c.katalogus_elem_id)
              return (
                <div key={String(c.katalogus_elem_id || index)} className="flex justify-between p-3 bg-background rounded-md border text-sm">
                  <span className="font-medium">{item?.nev || "Ismeretlen elem"}</span>
                  <span className="text-muted-foreground">{formatFt(c.kert_osszeg)}</span>
                </div>
              )
            })}
            <div className="flex justify-between p-3 bg-muted rounded-md font-semibold mt-4 text-sm">
              <span>Felhasznált keret összesen:</span>
              <span>{formatFt(existingChoices.reduce((s, c) => s + c.levont_keret_osszeg, 0))}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Coffee className="w-5 h-5 text-primary" /> Cafeteria Nyilatkozat ({year})
        </CardTitle>
        <CardDescription>Állítsd össze a saját juttatási csomagodat a megadott keretből!</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Keret vizualizáció */}
        <div className="bg-muted/30 p-4 rounded-lg border">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Felhasználható keret</p>
              <p className="text-2xl font-bold text-primary">{formatFt(remaining)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Éves keretösszeg</p>
              <p className="font-semibold">{formatFt(budget)}</p>
            </div>
          </div>
          <Progress value={(totalUsed / budget) * 100} className="h-2.5 mt-4" />
          <p className="text-xs text-muted-foreground text-right mt-2">Felhasznált: {formatFt(totalUsed)}</p>
        </div>

        {/* Hozzáadás form */}
        <div className="grid gap-4 md:grid-cols-12 items-end bg-background p-4 border rounded-lg">
          <div className="md:col-span-5 space-y-2">
            <Label htmlFor="item">Juttatási elem</Label>
            <select 
              id="item"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
            >
              <option value="" disabled>Válassz a katalógusból...</option>
              {catalog.map(c => (
                <option key={c.id} value={c.id}>{c.nev} (Szorzó: {c.szorzo}x)</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-4 space-y-2">
            <Label htmlFor="amount">Kért nettó összeg (Ft)</Label>
            <Input 
              id="amount" 
              type="number" 
              placeholder="pl. 100000" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="1000"
            />
          </div>
          <div className="md:col-span-3">
            <Button type="button" onClick={handleAdd} className="w-full gap-2" variant="secondary">
              <Plus className="w-4 h-4" /> Hozzáad
            </Button>
          </div>
        </div>

        {/* Kiválasztott elemek listája */}
        {choices.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Kiválasztott elemek</h4>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="h-10 px-4 text-left font-medium text-muted-foreground">Elem</th>
                    <th className="h-10 px-4 text-right font-medium text-muted-foreground">Kért összeg</th>
                    <th className="h-10 px-4 text-right font-medium text-muted-foreground">Levont keret</th>
                    <th className="h-10 px-4 text-right font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {choices.map((c) => {
                    const item = catalog.find(k => k.id === c.katalogus_elem_id)
                    return (
                      <tr key={c.katalogus_elem_id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-4 font-medium">{item?.nev}</td>
                        <td className="p-4 text-right">{formatFt(c.kert_osszeg)}</td>
                        <td className="p-4 text-right text-muted-foreground font-medium">{formatFt(c.levont_keret_osszeg)}</td>
                        <td className="p-4 text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleRemove(c.katalogus_elem_id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="bg-muted/20 border-t p-6">
        <div className="flex w-full justify-between items-center">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> A nyilatkozat leadás után nem módosítható.
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger 
              disabled={loading || choices.length === 0}
              className={buttonVariants()}
            >
              {loading ? "Mentés..." : "Nyilatkozat Véglegesítése"}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Biztosan véglegesíted a nyilatkozatot?</AlertDialogTitle>
                <AlertDialogDescription>
                  Utána már nem tudod módosítani a választott cafeteria elemeket. 
                  Gondold át, mert az adatok véglegesek lesznek erre az évre.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>Mégse</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Igen, véglegesítem
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  )
}
