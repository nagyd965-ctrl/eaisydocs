"use client"

import { useState } from "react"
import { TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { User, Users, UserPlus, ChevronRight, Key, Clock, Shield, Save, BellRing, Smartphone, Mail, CheckCircle2, AlertCircle, ShieldCheck, FileText } from "lucide-react"
import Link from "next/link"
import { updateProfile, createNewUser, updateUserPassword, simulateNotification } from "./settings-actions"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SettingsClient({ initialProfile, email, teamMembers, szabalyok, naplo }: { initialProfile: any, email: string | undefined, teamMembers: any[], szabalyok?: any[], naplo?: any[] }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [simulateLoading, setSimulateLoading] = useState(false)

  async function handleProfileSave(formData: FormData) {
    setLoading(true)
    const res = await updateProfile(formData)
    setLoading(false)
    if (res?.error) {
      alert("Hiba a mentés során: " + res.error)
    } else {
      setSuccess(true)
      window.dispatchEvent(new Event('sessionTimeoutChanged'))
      setTimeout(() => setSuccess(false), 2000)
    }
  }

  return (
    <>
      {/* 1. TAB: PROFIL */}
      <TabsContent value="profil" className="space-y-4 outline-none">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <CardTitle className="text-xl">Felhasználói profil</CardTitle>
            </div>
            <CardDescription>Személyes információk és avatar kezelése</CardDescription>
          </CardHeader>
          <form action={handleProfileSave}>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nev">Teljes név</Label>
                  <Input id="nev" name="nev" defaultValue={initialProfile?.nev || ""} className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pozicio">Pozíció</Label>
                  <Input id="pozicio" name="pozicio" defaultValue={initialProfile?.pozicio || ""} placeholder="pl. Rendszergazda-iratkezelő" className="bg-muted/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ceg_neve">Cég neve</Label>
                <Input id="ceg_neve" name="ceg_neve" defaultValue={initialProfile?.ceg_neve || ""} className="bg-muted/50" />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loading} className="bg-[#02b8cc] hover:bg-[#029db0] text-white">
                {loading ? "Mentés..." : success ? "Sikeres mentés!" : "Profil mentése"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>

      {/* 2. TAB: CSAPAT */}
      <TabsContent value="csapat" className="space-y-4 outline-none">
        <Card className="border-border shadow-sm border-none bg-transparent shadow-none">
          <CardHeader className="px-0 pb-6 pt-0 border-b">
            <CardTitle className="text-xl">Csapat</CardTitle>
            <CardDescription>Felhasználók és hozzáférések kezelése</CardDescription>
          </CardHeader>
          <CardContent className="px-0 py-4 space-y-3">
            {teamMembers?.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 bg-card border rounded-xl hover:border-border/80 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 shrink-0 bg-[#02b8cc] rounded-full flex items-center justify-center font-bold text-sm text-white">
                    {member.nev?.substring(0, 1).toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{member.nev}</p>
                    <p className="text-xs text-muted-foreground">{member.pozicio || member.szerepkor || "Nincs megadva"}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="px-2 py-1 bg-muted rounded-md text-[10px] font-semibold tracking-wider text-[#02b8cc] uppercase">
                    {member.szerepkor}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </CardContent>
          <div className="px-0 py-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger
                render={
                  <Button variant="outline" className="w-full border-dashed border-2 py-6 text-muted-foreground hover:text-foreground" />
                }
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Új felhasználó létrehozása
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form action={async (formData) => {
                  setCreateLoading(true)
                  const res = await createNewUser(formData)
                  setCreateLoading(false)
                  if (res.error) {
                    alert("Hiba: " + res.error)
                  } else {
                    alert("Sikeresen létrehozva!")
                    setOpen(false)
                  }
                }}>
                  <DialogHeader>
                    <DialogTitle>Felhasználó létrehozása</DialogTitle>
                    <DialogDescription>
                      Hozz létre egy új munkatársat a rendszerben.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email cím</Label>
                      <Input id="email" name="email" type="email" placeholder="munkatars@ceg.hu" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Jelszó</Label>
                      <Input id="password" name="password" type="password" placeholder="Min. 6 karakter" required minLength={6} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Szerepkör</Label>
                      <select id="role" name="role" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        <option value="rendszergazda">Rendszergazda</option>
                        <option value="iktato">Iratkezelő / iktató</option>
                        <option value="vezeto">Vezető / szignáló</option>
                        <option value="ugyintezo">Ügyintéző</option>
                        <option value="betekinto">Betekintő</option>
                        <option value="auditor">Auditor</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clearance">Biztonsági minősítés</Label>
                      <select id="clearance" name="clearance" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        <option value="nyilt">Nyílt</option>
                        <option value="belso">Belső</option>
                        <option value="bizalmas">Bizalmas</option>
                        <option value="szigoruan_bizalmas">Szigorúan Bizalmas</option>
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createLoading}>
                      {createLoading ? "Létrehozás..." : "Felhasználó létrehozása"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </Card>
      </TabsContent>

      {/* 4. TAB: ÉRTESÍTÉSEK */}
      <TabsContent value="ertesitesek" className="space-y-6 outline-none">
        
        {/* Szabályok Card */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Értesítési Szabályok</CardTitle>
              <CardDescription>Mikor, milyen csatornán küldjön a rendszer automatikus üzenetet?</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {szabalyok && szabalyok.length > 0 ? (
                szabalyok.map((szabaly) => (
                  <div key={szabaly.id} className="flex items-center justify-between p-4 bg-muted/30 border rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 shrink-0 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                        <BellRing className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground uppercase">{szabaly.trigger_tipus.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">Aktív szabály</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {szabaly.csatorna === 'sms' ? <Smartphone className="h-4 w-4 text-muted-foreground" /> : <Mail className="h-4 w-4 text-muted-foreground" />}
                      <span className="text-sm font-medium uppercase">{szabaly.csatorna}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                  Nincs még beállítva értesítési szabály.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Napló Card */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Kiküldési Napló</CardTitle>
              <CardDescription>A rendszer által generált és elküldött valós üzenetek (Audit trail)</CardDescription>
            </div>
            <Button 
              onClick={async () => {
                setSimulateLoading(true)
                await simulateNotification()
                setSimulateLoading(false)
              }}
              disabled={simulateLoading}
              variant="outline" 
              className="bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
            >
              {simulateLoading ? "Szimulálás..." : "Teszt SMS Szimulálása"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="px-4 py-3">Időpont</th>
                    <th className="px-4 py-3">Csatorna</th>
                    <th className="px-4 py-3">Címzett</th>
                    <th className="px-4 py-3">Státusz</th>
                    <th className="px-4 py-3 w-1/3">Üzenet Szövege</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {naplo && naplo.length > 0 ? (
                    naplo.map((sor) => (
                      <tr key={sor.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 whitespace-nowrap">{new Date(sor.kikuldes_ideje).toLocaleString("hu-HU")}</td>
                        <td className="px-4 py-3 uppercase text-xs font-semibold">{sor.csatorna}</td>
                        <td className="px-4 py-3">{sor.cimzett || "-"}</td>
                        <td className="px-4 py-3">
                          {sor.statusz === 'sikeres' ? (
                            <span className="flex items-center text-success"><CheckCircle2 className="h-4 w-4 mr-1"/> Sikeres</span>
                          ) : (
                            <span className="flex items-center text-destructive"><AlertCircle className="h-4 w-4 mr-1"/> Hiba</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">{sor.szoveg || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        Nincs még kiküldött üzenet a naplóban.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </TabsContent>

      {/* 5. TAB: BIZTONSÁG */}
      <TabsContent value="biztonsag" className="space-y-4 outline-none">
        
        {/* Hivatalos dokumentumok */}
        <Card className="border-border shadow-sm mb-6 bg-primary/5 border-primary/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Hivatalos Dokumentációk
            </CardTitle>
            <CardDescription>A rendszer adatkezelési és IT biztonsági garanciái (Audit dokumentumok)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-background border rounded-xl shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 shrink-0 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">IT Biztonsági Szabályzat</p>
                  <p className="text-xs text-muted-foreground">Hozzáférés-szabályozás, naplózás, jelszópolitika</p>
                </div>
              </div>
              <Link 
                href="/security-policy" 
                className={cn(buttonVariants({ variant: "outline" }), "border-primary/50 hover:bg-primary/10")}
              >
                Megtekintés
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Biztonság</CardTitle>
            <CardDescription>Jelszó, munkamenet és adatvédelem</CardDescription>
          </CardHeader>
          <form action={handleProfileSave}>
            <CardContent className="space-y-4">
              {/* Jelszó módosítás */}
            <div className="flex items-center justify-between p-4 bg-muted/30 border rounded-xl hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 shrink-0 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Jelszó módosítás</p>
                  <p className="text-xs text-muted-foreground">Új jelszó beállítása a fiókodhoz</p>
                </div>
              </div>
              <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogTrigger
                  render={
                    <Button variant="outline" size="sm" className="bg-background" />
                  }
                >
                  Módosítás
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <form action={async (formData) => {
                    setPasswordLoading(true)
                    const res = await updateUserPassword(formData)
                    setPasswordLoading(false)
                    if (res.error) {
                      alert("Hiba: " + res.error)
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
                defaultValue={initialProfile?.munkamenet_idotullepes || 15}
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
      </TabsContent>
    </>
  )
}
