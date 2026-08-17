"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Lock, Eye, EyeOff, ShieldAlert, Edit2 } from "lucide-react"
import { revealEmployeeSecretData, updateEmployeeSecretData } from "../actions"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function PersonalDataTab({ 
  employeeId,
  isHrOrAdmin
}: { 
  employeeId: string,
  isHrOrAdmin: boolean
}) {
  const [isRevealed, setIsRevealed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [secretData, setSecretData] = useState<{ taj_szam?: string, adoazonosito?: string, bankszamla?: string, brutto_ber?: string, netto_ber?: string } | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const handleReveal = async () => {
    if (isRevealed) {
      setIsRevealed(false)
      setSecretData(null)
      return
    }

    setLoading(true)
    const result = await revealEmployeeSecretData(employeeId)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    if (result.data) {
      setSecretData(result.data)
      setIsRevealed(true)
      toast.warning("Szigorúan bizalmas adatok feloldva. A megtekintést naplóztuk.", {
        icon: <ShieldAlert className="h-4 w-4 text-destructive" />
      })
    }
  }

  const handleUpdate = async (formData: FormData) => {
    setLoading(true)
    const result = await updateEmployeeSecretData(employeeId, formData)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Adatok biztonságosan frissítve!")
      setIsEditOpen(false)
      if (isRevealed) {
        handleReveal()
        setTimeout(handleReveal, 100)
      }
    }
  }

  const formatBer = (raw?: string) => {
    if (!raw) return "Nincs megadva"
    const num = parseInt(raw.replace(/\D/g, ""), 10)
    if (isNaN(num)) return raw
    return new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(num)
  }

  if (!isHrOrAdmin) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center">
          <Lock className="w-8 h-8 mb-4 opacity-50" />
          Nincs jogosultságod megtekinteni ezeket az adatokat.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-destructive/20 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-destructive/50"></div>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-destructive" /> Titkosított Személyes Adatok
          </CardTitle>
          <CardDescription>Szigorúan bizalmas, auditált adatok a HR számára</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger className={buttonVariants({ variant: "outline", size: "icon", className: "h-8 w-8" })}>
              <Edit2 className="w-4 h-4" />
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Különleges Adatok Szerkesztése</DialogTitle>
                <DialogDescription>
                  Az alábbi adatok mentése HR szintű jogosultsággal történik és szigorúan auditált!
                </DialogDescription>
              </DialogHeader>
              <form ref={formRef} action={handleUpdate} key={JSON.stringify(secretData)}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="taj_szam" className="text-right text-xs">TAJ Szám</Label>
                    <Input id="taj_szam" name="taj_szam" defaultValue={secretData?.taj_szam || ""} className="col-span-3 font-mono" placeholder="xxx xxx xxx" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="adoazonosito" className="text-right text-xs">Adóazonosító</Label>
                    <Input id="adoazonosito" name="adoazonosito" defaultValue={secretData?.adoazonosito || ""} className="col-span-3 font-mono" placeholder="xxxxxxxxxx" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="bankszamla" className="text-right text-xs">Bankszámla</Label>
                    <Input id="bankszamla" name="bankszamla" defaultValue={secretData?.bankszamla || ""} className="col-span-3 font-mono" placeholder="xxxx-xxxx-xxxx-xxxx" />
                  </div>
                  {/* Béradatok – csak HR írhatja */}
                  <div className="border-t pt-4 mt-1">
                    <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">Béradatok</p>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="brutto_ber" className="text-right text-xs">Bruttó Bér</Label>
                        <Input id="brutto_ber" name="brutto_ber" type="number" defaultValue={secretData?.brutto_ber || ""} className="col-span-3 tabular-nums" placeholder="pl. 500000" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="netto_ber" className="text-right text-xs">Nettó Bér</Label>
                        <Input id="netto_ber" name="netto_ber" type="number" defaultValue={secretData?.netto_ber || ""} className="col-span-3 tabular-nums" placeholder="pl. 335000" />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={loading}>Mégse</Button>
                  <Button type="submit" disabled={loading}>{loading ? "Mentés..." : "Biztonságos Mentés"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Button 
            variant={isRevealed ? "default" : "outline"} 
            size="sm" 
            onClick={handleReveal}
            disabled={loading}
            className="gap-2 h-8"
          >
            {loading ? "Töltés..." : isRevealed ? <><EyeOff className="w-4 h-4" /> Elrejt</> : <><Eye className="w-4 h-4" /> Felfedés</>}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">TAJ Szám</p>
              <p className="font-mono text-sm mt-1">{isRevealed ? (secretData?.taj_szam || "Nincs megadva") : "••• ••• •••"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Adóazonosító</p>
              <p className="font-mono text-sm mt-1">{isRevealed ? (secretData?.adoazonosito || "Nincs megadva") : "••••••••••"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Bankszámlaszám</p>
              <p className="font-mono text-sm mt-1">{isRevealed ? (secretData?.bankszamla || "Nincs megadva") : "•••• •••• •••• •••• •••• ••••"}</p>
            </div>
          </div>
          {/* Béradatok szekció */}
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">Béradatok</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Bruttó Bér</p>
                <p className="font-mono tabular-nums text-sm mt-1">
                  {isRevealed ? formatBer(secretData?.brutto_ber) : "•••••• Ft"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Nettó Bér</p>
                <p className="font-mono tabular-nums text-sm mt-1">
                  {isRevealed ? formatBer(secretData?.netto_ber) : "•••••• Ft"}
                </p>
              </div>
            </div>
          </div>
          {!isRevealed && (
            <div className="bg-muted/50 p-2 rounded-md text-xs text-muted-foreground flex items-start gap-2 mt-4">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <p>Ezeknek az adatoknak a megtekintése GDPR hatálya alá esik. A gombra kattintva a megtekintés ténye visszavonhatatlanul bekerül a központi Eseménynaplóba.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
