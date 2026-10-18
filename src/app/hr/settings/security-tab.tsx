"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Key, Clock, Loader2 } from "lucide-react"
import { updateUserPassword, updateProfile } from "@/app/settings/settings-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { MfaSettingsCard } from "@/components/mfa-settings-card"

export function SecuritySettingsTab({ initialTimeout, totpFactor }: { initialTimeout: number, totpFactor: any }) {
  const router = useRouter()
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const [timeoutValue, setTimeoutValue] = useState<number>(initialTimeout || 15)
  const [savingTimeout, setSavingTimeout] = useState(false)

  async function handleTimeoutChange(newTimeout: number) {
    setSavingTimeout(true)
    const formData = new FormData()
    formData.append("munkamenet_idotullepes", String(newTimeout))
    const res = await updateProfile(formData)
    setSavingTimeout(false)
    if (res?.error) {
      toast.error("Hiba", { description: "Nem sikerült menteni a munkamenet időtúllépést: " + res.error })
    } else {
      toast.success("Munkamenet időtúllépés mentve", { 
        description: `${newTimeout} perc inaktivitás után a rendszer automatikusan kijelentkeztet.` 
      })
      router.refresh()
      window.dispatchEvent(new Event('sessionTimeoutChanged'))
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Biztonság</CardTitle>
          <CardDescription>Jelszó, munkamenet és adatvédelem</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Jelszó módosítás */}
          <div className="flex items-center justify-between p-4 bg-muted/30 border rounded-xl hover:bg-muted/50 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 shrink-0 bg-info/10 text-info rounded-lg flex items-center justify-center">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Jelszó módosítás</p>
                <p className="text-xs text-muted-foreground">Új jelszó beállítása a fiókodhoz</p>
              </div>
            </div>
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" className="bg-background" />}>
                Módosítás
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form action={async (formData) => {
                  setPasswordLoading(true)
                  const res = await updateUserPassword(formData)
                  setPasswordLoading(false)
                  if (res.error) {
                    toast.error("Hiba", { description: res.error })
                  } else {
                    setPasswordSuccess(true)
                    setTimeout(() => {
                      setPasswordSuccess(false)
                      setPasswordDialogOpen(false)
                    }, 1500)
                  }
                }}>
                  <DialogHeader>
                    <DialogTitle>Jelszó módosítás</DialogTitle>
                    <DialogDescription>
                      Add meg az új jelszavadat. Biztonsági okokból legalább 6 karakter hosszúnak kell lennie.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Új jelszó</Label>
                      <Input id="password" name="password" type="password" required minLength={6} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Új jelszó megerősítése</Label>
                      <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={6} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={passwordLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      {passwordLoading ? "Mentés..." : passwordSuccess ? "Sikeres módosítás!" : "Jelszó mentése"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Munkamenet időtúllépés */}
          <div className="flex items-center justify-between p-4 bg-muted/30 border rounded-xl hover:bg-muted/50 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 shrink-0 bg-warning/10 text-warning border border-warning/20 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">Munkamenet időtúllépés</p>
                  {savingTimeout && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                </div>
                <p className="text-xs text-muted-foreground">inaktivitás után automatikus kijelentkezés</p>
              </div>
            </div>
            <select 
              name="munkamenet_idotullepes" 
              value={timeoutValue}
              disabled={savingTimeout}
              onChange={async (e) => {
                const val = Number(e.target.value)
                setTimeoutValue(val)
                await handleTimeoutChange(val)
              }}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer disabled:opacity-50"
            >
              <option value={5}>5 perc</option>
              <option value={15}>15 perc</option>
              <option value={30}>30 perc</option>
              <option value={60}>60 perc</option>
            </select>
          </div>
        </CardContent>
      </Card>
      <MfaSettingsCard totpFactor={totpFactor} />
    </div>
  )
}
