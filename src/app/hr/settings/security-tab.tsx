"use client"

import { useState } from "react"
import { TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Key, Clock, Save, ShieldCheck } from "lucide-react"
import { updateUserPassword, updateProfile } from "@/app/settings/settings-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { MfaSettingsCard } from "@/components/mfa-settings-card"

export function SecuritySettingsTab({ initialTimeout, totpFactor }: { initialTimeout: number, totpFactor: any }) {
  const router = useRouter()
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleProfileSave(formData: FormData) {
    setLoading(true)
    const res = await updateProfile(formData)
    setLoading(false)
    if (res?.error) {
      toast.error("Hiba", { description: "Hiba a mentés során: " + res.error })
    } else {
      setSuccess(true)
      router.refresh()
      window.dispatchEvent(new Event('sessionTimeoutChanged'))
      setTimeout(() => setSuccess(false), 2000)
    }
  }

  return (
      <TabsContent value="biztonsag" className="space-y-6 outline-none">
        <div className="space-y-6">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5" />
              <CardTitle className="text-xl">Biztonság</CardTitle>
            </div>
            <CardDescription>Jelszó, munkamenet és adatvédelem</CardDescription>
          </CardHeader>
          <form action={handleProfileSave}>
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
                      <Button type="submit" disabled={passwordLoading} className="bg-[#02b8cc] hover:bg-[#029db0] text-white">
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
                <div className="h-10 w-10 shrink-0 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Munkamenet időtúllépés</p>
                  <p className="text-xs text-muted-foreground">inaktivitás után automatikus kijelentkezés</p>
                </div>
              </div>
              <select 
                name="munkamenet_idotullepes" 
                defaultValue={initialTimeout || 15}
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="5">5 perc</option>
                <option value="15">15 perc</option>
                <option value="30">30 perc</option>
                <option value="60">60 perc</option>
              </select>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-6 pb-6">
            <Button type="submit" disabled={loading} className="bg-[#02b8cc] hover:bg-[#029db0] text-white">
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Mentés..." : success ? "Sikeres mentés!" : "Mentés"}
            </Button>
          </CardFooter>
        </form>
         </Card>
         <MfaSettingsCard totpFactor={totpFactor} />
        </div>
      </TabsContent>
  )
}
