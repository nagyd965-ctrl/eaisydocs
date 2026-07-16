"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { User, Users, UserPlus, ChevronRight, Key, Clock, Shield, Save, BellRing, Smartphone, Mail, CheckCircle2, AlertCircle, ShieldCheck, FileText } from "lucide-react"
import Link from "next/link"
import { updateProfile, createNewUser, updateUserPassword, updateUserRole } from "./settings-actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useTheme } from "next-themes"

export function SettingsClient({ initialProfile, email, teamMembers, departments, szabalyok, naplo }: { initialProfile: any, email: string | undefined, teamMembers: any[], departments?: any[], szabalyok?: any[], naplo?: any[] }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [selectedMemberRole, setSelectedMemberRole] = useState<string>("")
  const [selectedMemberDepartment, setSelectedMemberDepartment] = useState<string>("")
  const [editRoleLoading, setEditRoleLoading] = useState(false)
  const [departmentLoading, setDepartmentLoading] = useState(false)

  const roleMap: Record<string, string> = {
    admin: "Admin",
    rendszergazda: "Rendszergazda",
    vezeto: "Vezető",
    iktato: "Iktató",
    ugyintezo: "Ügyintéző"
  }

  // Handle hydration for next-themes
  useEffect(() => {
    setMounted(true)
  }, [])

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
                  <Input id="nev" name="nev" defaultValue={initialProfile?.nev || ""} className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email cím</Label>
                  <Input id="email" value={email || ""} disabled className="bg-muted/50 cursor-not-allowed opacity-70" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="pozicio">Pozíció</Label>
                  <Input id="pozicio" name="pozicio" defaultValue={initialProfile?.pozicio || ""} placeholder="pl. Rendszergazda-iratkezelő" className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ceg_neve">Cég neve</Label>
                  <Input id="ceg_neve" name="ceg_neve" defaultValue={initialProfile?.ceg_neve || ""} className="bg-background" />
                </div>
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
              <div 
                key={member.id} 
                className="flex items-center justify-between p-4 bg-card border rounded-xl hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-all group"
                onClick={() => {
                  setSelectedMember(member)
                  setSelectedMemberRole(member.szerepkor || "")
                  setSelectedMemberDepartment(member.szervezeti_egyseg_id || "none")
                  setEditRoleDialogOpen(true)
                }}
              >
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 shrink-0 bg-primary rounded-full flex items-center justify-center font-semibold text-sm text-primary-foreground">
                    {member.nev?.substring(0, 1).toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{member.nev}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.pozicio || member.szerepkor || "Nincs megadva"} 
                      {departments?.find(d => d.id === member.szervezeti_egyseg_id) && 
                        ` • ${departments.find(d => d.id === member.szervezeti_egyseg_id)?.nev}`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant="secondary" className="uppercase font-semibold text-[10px] tracking-wider">
                    {member.szerepkor}
                  </Badge>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={async (e) => {
                      e.stopPropagation()
                      if (confirm(`Biztosan törlöd a következő felhasználót: ${member.nev}?`)) {
                        const { deleteUser } = await import("./settings-actions")
                        const res = await deleteUser(member.id)
                        if (res.error) alert(res.error)
                      }
                    }}
                  >
                    Törlés
                  </Button>
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
                      <Label htmlFor="nev">Teljes név</Label>
                      <Input id="nev" name="nev" placeholder="Kovács János" required />
                    </div>
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

            <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <form action={async (formData) => {
                  if (!selectedMember) return
                  setEditRoleLoading(true)
                  const newRole = formData.get("role") as string
                  const newDept = formData.get("departmentId") as string
                  const deptId = newDept === "none" ? null : newDept
                  const res = await updateUserRole(selectedMember.id, newRole, selectedMember.max_minosites, deptId)
                  setEditRoleLoading(false)
                  if (res.error) {
                    alert("Hiba: " + res.error)
                  } else {
                    setEditRoleDialogOpen(false)
                  }
                }}>
                  <DialogHeader>
                    <DialogTitle>Szerepkör Módosítása</DialogTitle>
                    <DialogDescription>
                      Módosíthatod a(z) <span className="font-semibold text-foreground">{selectedMember?.nev}</span> fiók jogosultságát.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-role">Új Szerepkör</Label>
                      <Select name="role" value={selectedMemberRole} onValueChange={(val) => setSelectedMemberRole(val || "")} required>
                        <SelectTrigger id="edit-role">
                          <SelectValue placeholder="Válassz...">{roleMap[selectedMemberRole]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="rendszergazda">Rendszergazda</SelectItem>
                          <SelectItem value="vezeto">Vezető</SelectItem>
                          <SelectItem value="iktato">Iktató</SelectItem>
                          <SelectItem value="ugyintezo">Ügyintéző</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-dept">Szervezeti Egység</Label>
                      <Select name="departmentId" value={selectedMemberDepartment} onValueChange={(val) => setSelectedMemberDepartment(val || "none")}>
                        <SelectTrigger id="edit-dept">
                          <SelectValue placeholder="Nincs beosztva">
                            {selectedMemberDepartment === "none" ? "Nincs beosztva" : departments?.find((d: any) => d.id === selectedMemberDepartment)?.nev}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nincs beosztva</SelectItem>
                          {departments?.map(dept => (
                            <SelectItem key={dept.id} value={dept.id}>{dept.nev}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setEditRoleDialogOpen(false)}>Mégsem</Button>
                    <Button type="submit" disabled={editRoleLoading}>
                      {editRoleLoading ? "Mentés..." : "Mentés"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </Card>
      </TabsContent>

        <TabsContent value="osztalyok" className="space-y-4">
          <Card className="rounded-none shadow-sm">
            <CardHeader>
              <CardTitle>Szervezeti Egységek</CardTitle>
              <CardDescription>
                A cég osztályainak (részlegeinek) kezelése.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <form action={async (formData) => {
                  setDepartmentLoading(true)
                  const { createDepartment } = await import("./settings-actions")
                  const res = await createDepartment(formData)
                  setDepartmentLoading(false)
                  if (res.error) alert(res.error)
                  else (document.getElementById("new-dept-form") as HTMLFormElement)?.reset()
                }} id="new-dept-form" className="flex items-end gap-4">
                  <div className="space-y-2 flex-1 max-w-sm">
                    <Label htmlFor="nev">Új szervezeti egység neve</Label>
                    <Input id="nev" name="nev" placeholder="Pl. Pénzügy, HR, Értékesítés" required />
                  </div>
                  <Button type="submit" disabled={departmentLoading}>Hozzáadás</Button>
                </form>

                <div className="rounded-md border mt-6">
                  <div className="grid grid-cols-1">
                    {departments?.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">Még nincsenek szervezeti egységek.</div>
                    ) : (
                      <Accordion className="w-full">
                        {departments?.map((dept) => {
                          const deptUsers = teamMembers?.filter(m => m.szervezeti_egyseg_id === dept.id) || [];
                          return (
                          <AccordionItem key={dept.id} value={dept.id} className="relative">
                            <div className="flex items-center w-full justify-between pr-4 group">
                              <AccordionTrigger className="flex-1 hover:no-underline py-4 px-4 justify-start gap-4">
                                <div>
                                  <p className="text-sm font-semibold text-foreground text-left">{dept.nev}</p>
                                  <p className="text-xs text-muted-foreground font-normal text-left">{deptUsers.length} tag</p>
                                </div>
                              </AccordionTrigger>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (confirm("Biztosan törlöd ezt a szervezeti egységet?")) {
                                    const { deleteDepartment } = await import("./settings-actions")
                                    const res = await deleteDepartment(dept.id)
                                    if (res.error) alert(res.error)
                                  }
                                }}
                              >
                                Törlés
                              </Button>
                            </div>
                            <AccordionContent className="px-4 pb-4">
                              {deptUsers.length > 0 ? (
                                <ul className="space-y-2 mt-2 border-t pt-4">
                                  {deptUsers.map(u => (
                                    <li key={u.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-md">
                                      <div className="h-8 w-8 shrink-0 bg-primary rounded-full flex items-center justify-center font-semibold text-xs text-primary-foreground">
                                        {u.nev?.substring(0, 1).toUpperCase() || "?"}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">{u.nev}</p>
                                        <p className="text-xs text-muted-foreground uppercase">{u.szerepkor}</p>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-muted-foreground mt-2 border-t pt-4">Ebben az osztályban nincsenek felhasználók.</p>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        )})}
                      </Accordion>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
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
                <div className="h-10 w-10 shrink-0 bg-info/10 text-info rounded-lg flex items-center justify-center">
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

      {/* RENDSZER BEÁLLÍTÁSOK */}
      <TabsContent value="rendszer" className="space-y-4 outline-none">
        <Card className="border-border shadow-sm border-none bg-transparent shadow-none">
          <CardHeader className="px-6 pb-6 pt-0 border-b">
            <CardTitle className="text-xl">Rendszer beállítások</CardTitle>
            <CardDescription>Téma és megjelenítési beállítások</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="theme-select">Téma</Label>
                <Select value={theme || "system"} onValueChange={setTheme}>
                  <SelectTrigger id="theme-select" className="bg-background">
                    <SelectValue placeholder="Válassz témát">
                      {mounted && theme === 'light' && 'Világos'}
                      {mounted && theme === 'dark' && 'Sötét'}
                      {mounted && theme === 'system' && 'Rendszer alapértelmezett'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Világos</SelectItem>
                    <SelectItem value="dark">Sötét</SelectItem>
                    <SelectItem value="system">Rendszer alapértelmezett</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language-select">Nyelv</Label>
                <Select defaultValue="hu" disabled>
                  <SelectTrigger id="language-select" className="bg-muted/50 cursor-not-allowed text-foreground opacity-100">
                    <SelectValue placeholder="Magyar">Magyar</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hu">Magyar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="date-format">Dátum formátum</Label>
                <Select defaultValue="ddmmyyyy" disabled>
                  <SelectTrigger id="date-format" className="bg-muted/50 cursor-not-allowed text-foreground opacity-100">
                    <SelectValue placeholder="DD/MM/YYYY">DD/MM/YYYY</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ddmmyyyy">DD/MM/YYYY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="number-format">Szám formátum</Label>
                <Select defaultValue="space" disabled>
                  <SelectTrigger id="number-format" className="bg-muted/50 cursor-not-allowed text-foreground opacity-100">
                    <SelectValue placeholder="1 234 567,89">1 234 567,89</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="space">1 234 567,89</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="px-6 flex justify-start pt-4">
            <Button className="bg-[#02b8cc] hover:bg-[#029db0] text-white" onClick={() => {
              setSuccess(true)
              setTimeout(() => setSuccess(false), 2000)
            }}>
              {success ? "Sikeres mentés!" : "Rendszer beállítások mentése"}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </>
  )
}
