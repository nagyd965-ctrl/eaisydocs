"use client"

import { useState, useEffect, useRef } from "react"
import { TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { User, Users, UserPlus, Key, Clock, Save, ShieldCheck, FileText, Plane, Building, Plus, Settings, Camera, Upload } from "lucide-react"
import Link from "next/link"
import { updateProfile, createNewUser, updateUserPassword, updateUserRole, uploadAvatar } from "./settings-actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useTheme } from "next-themes"
import { NotificationSettings } from "./notification-settings"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { createSubstitution, deleteSubstitution } from "./substitution-actions"
import { MfaSettingsCard } from "@/components/mfa-settings-card"
import { IrattariTervManager } from "@/components/irattari-terv-manager"
import { Archive, ScrollText, Download, Filter } from "lucide-react"

export function SettingsClient({ initialProfile, email, teamMembers, departments, szabalyok, naplo, helyettesitesek = [], isAdmin, totpFactor, irattariTervek = [], adminAuditNaplo = [] }: { initialProfile: any, email: string | undefined, teamMembers: any[], departments?: any[], szabalyok?: any[], naplo?: any[], helyettesitesek?: any[], isAdmin?: boolean, totpFactor?: any, irattariTervek?: any[], adminAuditNaplo?: any[] }) {
  const router = useRouter()
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [selectedMemberRole, setSelectedMemberRole] = useState<string>("")
  const [selectedMemberDepartment, setSelectedMemberDepartment] = useState<string>("")
  const [editRoleLoading, setEditRoleLoading] = useState(false)
  const [departmentLoading, setDepartmentLoading] = useState(false)
  
  // Helyettesítés állapotok
  const [substituteUser, setSubstituteUser] = useState("")
  const [substituteFrom, setSubstituteFrom] = useState("")
  const [substituteTo, setSubstituteTo] = useState("")
  const [substituteLoading, setSubstituteLoading] = useState(false)

  // Új állapotok a szervezeti egységhez
  const [addUsersDialogOpen, setAddUsersDialogOpen] = useState(false)
  const [selectedDepartmentForAdd, setSelectedDepartmentForAdd] = useState<string | null>(null)
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<string[]>([])
  const [addUsersLoading, setAddUsersLoading] = useState(false)
  const [addDeptDialogOpen, setAddDeptDialogOpen] = useState(false)
  
  const [profileForm, setProfileForm] = useState({
    nev: initialProfile?.nev || "",
    pozicio: initialProfile?.pozicio || "",
    ceg_neve: initialProfile?.ceg_neve || "",
    telefon: initialProfile?.telefon || ""
  })
  
  // Sync if initialProfile changes from server action (e.g., after save and router.refresh)
  useEffect(() => {
    setProfileForm({
      nev: initialProfile?.nev || "",
      pozicio: initialProfile?.pozicio || "",
      ceg_neve: initialProfile?.ceg_neve || "",
      telefon: initialProfile?.telefon || ""
    })
  }, [initialProfile])

  const roleMap: Record<string, string> = {
    admin: "Szuper Admin (Teszt)",
    rendszergazda: "Rendszergazda",
    vezeto: "Vezető",
    iktato: "Iktató",
    ugyintezo: "Ügyintéző"
  }

  // Handle hydration for next-themes
  useEffect(() => {
    setMounted(true)
  }, [])

  function getInitials(name: string): string {
    return (name || "?")
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  }

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Túl nagy fájl", { description: "A profillkép maximum 5MB lehet." })
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleProfileSave(formData: FormData) {
    setLoading(true)
    if (avatarFile) {
      const avatarData = new FormData()
      avatarData.append("avatar", avatarFile)
      const avatarRes = await uploadAvatar(avatarData)
      if (avatarRes?.error) {
        toast.error("Profilkép hiba", { description: avatarRes.error })
        setLoading(false)
        return
      }
    }
    const res = await updateProfile(formData)
    setLoading(false)
    if (res?.error) {
      toast.error("Hiba", { description: "Hiba a mentés során: " + res.error })
    } else {
      setSuccess(true)
      setAvatarFile(null)
      router.refresh()
      window.dispatchEvent(new Event('sessionTimeoutChanged'))
      window.dispatchEvent(new Event('profileUpdated'))
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

              {/* Profilkép szekció */}
              <div className="flex items-center gap-5 pb-6 border-b border-border">
                <div
                  className="relative h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center cursor-pointer group border-2 border-transparent hover:border-primary/40 transition-colors shrink-0 overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                  ) : initialProfile?.avatar_url ? (
                    <img src={initialProfile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xl font-semibold text-primary">
                      {getInitials(profileForm.nev)}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Profilkép</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Kattints az avatárra vagy a gombra a feltöltéshez. JPG, PNG — max 5MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarSelect}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2.5 h-8 text-xs gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Kép kiválasztása
                  </Button>
                  {avatarFile && (
                    <p className="text-[11px] text-success mt-1.5">✓ {avatarFile.name} kiválasztva</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nev">Teljes név</Label>
                  <Input id="nev" name="nev" value={profileForm.nev} onChange={(e) => setProfileForm(prev => ({...prev, nev: e.target.value}))} className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email cím</Label>
                  <Input id="email" value={email || ""} readOnly className="bg-muted/50 cursor-not-allowed opacity-70" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="pozicio">Pozíció</Label>
                  <Input id="pozicio" name="pozicio" value={profileForm.pozicio} onChange={(e) => setProfileForm(prev => ({...prev, pozicio: e.target.value}))} placeholder="pl. Rendszergazda-iratkezelő" className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ceg_neve">Cég neve</Label>
                  <Input id="ceg_neve" name="ceg_neve" value={profileForm.ceg_neve} onChange={(e) => setProfileForm(prev => ({...prev, ceg_neve: e.target.value}))} className="bg-background" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="telefon">Telefonszám</Label>
                  <Input id="telefon" name="telefon" value={profileForm.telefon} onChange={(e) => setProfileForm(prev => ({...prev, telefon: e.target.value}))} placeholder="+36301234567" className="bg-background" />
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
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <CardTitle className="text-xl">Csapat</CardTitle>
            </div>
            <CardDescription>Felhasználók és hozzáférések kezelése</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamMembers?.map((member) => (
              <div 
                key={member.id} 
                className="flex items-center justify-between p-4 bg-card border rounded-xl hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-all group"
                onClick={() => {
                  setSelectedMember(member)
                  setSelectedMemberRole(member.docs_szerepkor || "")
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
                      {member.pozicio || member.docs_szerepkor || "Nincs megadva"} 
                      {departments?.find(d => d.id === member.szervezeti_egyseg_id) && 
                        ` • ${departments.find(d => d.id === member.szervezeti_egyseg_id)?.nev}`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant="secondary" className="uppercase font-semibold text-[10px] tracking-wider">
                    {member.docs_szerepkor}
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
                        if (res.error) toast.error("Hiba", { description: res.error })
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
                    toast.error("Hiba", { description: res.error })
                  } else {
                    toast.success("Sikeres", { description: "Sikeresen létrehozva!" })
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
                        <option value="admin">Szuper Admin (Teszt)</option>
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
                    toast.error("Hiba", { description: res.error })
                  } else {
                    toast.success("Sikeres", { description: "Szerepkör módosítva." })
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

        <TabsContent value="osztalyok" className="space-y-4 outline-none">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <CardTitle className="text-xl">Szervezeti Egységek</CardTitle>
              </div>
              <CardDescription>
                A cég osztályainak (részlegeinek) kezelése.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Osztályok listája */}
              <div className="space-y-4">
                {departments?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 border rounded-xl border-dashed">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Building className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Még nincsenek szervezeti egységek</p>
                    <p className="text-xs text-muted-foreground mt-1 text-center max-w-sm">
                      Hozz létre osztályokat a fenti mező segítségével, hogy a felhasználókat csoportosíthasd.
                    </p>
                  </div>
                ) : (
                  <Accordion type="multiple" className="w-full space-y-4">
                    {departments?.map((dept) => {
                      const deptUsers = teamMembers?.filter(m => m.szervezeti_egyseg_id === dept.id) || [];
                      return (
                      <AccordionItem key={dept.id} value={dept.id} className="border rounded-xl bg-card overflow-hidden transition-all data-[state=open]:border-primary/50 px-2">
                        <div className="flex items-center w-full justify-between pr-4 group">
                          <AccordionTrigger className="flex-1 hover:no-underline py-4 px-2 justify-start gap-4">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                                <Building className="h-5 w-5" />
                              </div>
                              <div className="text-left">
                                <p className="text-sm font-semibold text-foreground">{dept.nev}</p>
                                <p className="text-xs text-muted-foreground font-normal">{deptUsers.length} tag</p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (confirm(`Biztosan törlöd a(z) ${dept.nev} osztályt?`)) {
                                  const { deleteDepartment } = await import("./settings-actions")
                                  const res = await deleteDepartment(dept.id)
                                  if (res.error) toast.error("Hiba", { description: res.error })
                                  else toast.success("Sikeres", { description: "Szervezeti egység törölve." })
                                }
                              }}
                            >
                              Törlés
                            </Button>
                          </div>
                        </div>
                        <AccordionContent className="px-4 pb-4 pt-0">
                          <div className="border-t pt-4 mt-2">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hozzárendelt tagok</h4>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8 rounded-full text-xs font-semibold"
                                onClick={() => {
                                  setSelectedDepartmentForAdd(dept.id)
                                  setSelectedUsersToAdd([])
                                  setAddUsersDialogOpen(true)
                                }}
                              >
                                Tagok hozzáadása
                              </Button>
                            </div>
                            
                            {deptUsers.length > 0 ? (
                              <div className="grid gap-2">
                                {deptUsers.map(u => (
                                  <div key={u.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors group/item">
                                    <div className="flex items-center gap-3">
                                      <div className="h-8 w-8 shrink-0 bg-secondary rounded-full flex items-center justify-center font-semibold text-xs text-secondary-foreground">
                                        {u.nev?.substring(0, 1).toUpperCase() || "?"}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-foreground">{u.nev}</p>
                                        <p className="text-xs text-muted-foreground">{u.email || ""}</p>
                                      </div>
                                    </div>
                                    <Badge variant="secondary" className="uppercase font-semibold text-[10px] tracking-wider bg-background border">
                                      {u.docs_szerepkor}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="py-6 text-center">
                                <p className="text-sm text-muted-foreground">Ebben az osztályban nincsenek felhasználók.</p>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )})}
                  </Accordion>
                )}
                <Dialog open={addUsersDialogOpen} onOpenChange={setAddUsersDialogOpen}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Felhasználók Hozzáadása</DialogTitle>
                      <DialogDescription>
                        Jelöld ki azokat a felhasználókat, akiket be szeretnél osztani ebbe a szervezeti egységbe.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4 max-h-[300px] overflow-y-auto pr-2">
                      {teamMembers?.filter(u => u.szervezeti_egyseg_id !== selectedDepartmentForAdd).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center">Nincs hozzáadható felhasználó.</p>
                      ) : (
                        teamMembers?.filter(u => u.szervezeti_egyseg_id !== selectedDepartmentForAdd).map((u) => (
                          <div key={u.id} className="flex items-center space-x-3 bg-muted/20 p-2 rounded-md">
                            <Checkbox 
                              id={`user-${u.id}`} 
                              checked={selectedUsersToAdd.includes(u.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedUsersToAdd([...selectedUsersToAdd, u.id])
                                } else {
                                  setSelectedUsersToAdd(selectedUsersToAdd.filter(id => id !== u.id))
                                }
                              }}
                            />
                            <Label htmlFor={`user-${u.id}`} className="flex-1 cursor-pointer">
                              <div className="font-medium text-sm">{u.nev}</div>
                              <div className="text-xs text-muted-foreground uppercase">{u.docs_szerepkor}</div>
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddUsersDialogOpen(false)}>Mégsem</Button>
                      <Button 
                        disabled={addUsersLoading || selectedUsersToAdd.length === 0}
                        onClick={async () => {
                          if (!selectedDepartmentForAdd || selectedUsersToAdd.length === 0) return;
                          setAddUsersLoading(true);
                          const { addUsersToDepartment } = await import("./settings-actions");
                          const res = await addUsersToDepartment(selectedDepartmentForAdd, selectedUsersToAdd);
                          setAddUsersLoading(false);
                          if (res.error) {
                            toast.error("Hiba", { description: res.error });
                          } else {
                            toast.success("Sikeres hozzáadás!");
                            setAddUsersDialogOpen(false);
                            setSelectedUsersToAdd([]);
                          }
                        }}
                      >
                        {addUsersLoading ? "Mentés..." : "Hozzáadás"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={addDeptDialogOpen} onOpenChange={setAddDeptDialogOpen}>
                  <DialogTrigger
                    render={
                      <Button variant="outline" className="w-full border-dashed border-2 py-6 text-muted-foreground hover:text-foreground mt-4" />
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Új szervezeti egység létrehozása
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <form action={async (formData) => {
                      setDepartmentLoading(true)
                      const { createDepartment } = await import("./settings-actions")
                      const res = await createDepartment(formData)
                      setDepartmentLoading(false)
                      if (res.error) toast.error("Hiba", { description: res.error })
                      else {
                        toast.success("Sikeres", { description: "Szervezeti egység létrehozva." })
                        setAddDeptDialogOpen(false)
                      }
                    }}>
                      <DialogHeader>
                        <DialogTitle>Új Szervezeti Egység</DialogTitle>
                        <DialogDescription>
                          Hozz létre új osztályokat (részlegeket) a cégedben.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="nev">Osztály neve</Label>
                          <Input id="nev" name="nev" placeholder="Pl. Pénzügy, HR, Értékesítés" required />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" type="button" onClick={() => setAddDeptDialogOpen(false)}>Mégsem</Button>
                        <Button type="submit" disabled={departmentLoading} className="rounded-full">
                          {departmentLoading ? "Létrehozás..." : "Létrehozás"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

              </div>
            </CardContent>
          </Card>
        </TabsContent>



      {/* 5. TAB: BIZTONSÁG */}
      <TabsContent value="biztonsag" className="space-y-4 outline-none">
        
        <Card className="border-border shadow-sm mb-6">
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

        {/* Kétlépcsős azonosítás (MFA) */}
        <MfaSettingsCard totpFactor={totpFactor ?? null} />

        {/* Hivatalos dokumentumok */}
        <Card className="border-border shadow-sm bg-primary/5 border-primary/20">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl text-primary">Hivatalos Dokumentációk</CardTitle>
            </div>
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
      </TabsContent>

      {/* 5. TAB: ÉRTESÍTÉSEK */}
      <TabsContent value="ertesitesek" className="space-y-4 outline-none">
        <NotificationSettings rules={szabalyok || []} logs={naplo || []} isAdmin={isAdmin} />
      </TabsContent>

      {/* RENDSZER BEÁLLÍTÁSOK */}
      <TabsContent value="rendszer" className="space-y-4 outline-none">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <CardTitle className="text-xl">Rendszer beállítások</CardTitle>
            </div>
            <CardDescription>Téma és megjelenítési beállítások</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="theme-select">Téma</Label>
                <Select value={theme || "system"} onValueChange={(val) => setTheme(val || "system")}>
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
          <CardFooter className="flex justify-end border-t pt-6 pb-6">
            <Button className="bg-[#02b8cc] hover:bg-[#029db0] text-white" onClick={() => {
              setSuccess(true)
              setTimeout(() => setSuccess(false), 2000)
            }}>
              <Save className="h-4 w-4 mr-2" />
              {success ? "Sikeres mentés!" : "Rendszer beállítások mentése"}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      {/* 7. TAB: HELYETTESÍTÉS */}
      <TabsContent value="helyettesites" className="space-y-4 outline-none">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-2">
              <Plane className="h-5 w-5" />
              <CardTitle className="text-xl">Helyettesítés beállítása</CardTitle>
            </div>
            <CardDescription>
              Állítsd be, hogy szabadságod vagy távolléted alatt ki lássa el a feladataidat.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Helyettesítő munkatárs</Label>
                <Select value={substituteUser} onValueChange={(val) => val && setSubstituteUser(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Válassz kollégát...">
                      {substituteUser ? teamMembers.find(u => u.id === substituteUser)?.nev : "Válassz kollégát..."}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.filter(u => u.id !== initialProfile?.id).map((member: any) => (
                      <SelectItem key={member.id} value={member.id}>{member.nev}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mettől</Label>
                <Input type="date" value={substituteFrom} onChange={e => setSubstituteFrom(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="space-y-2">
                <Label>Meddig</Label>
                <Input type="date" value={substituteTo} onChange={e => setSubstituteTo(e.target.value)} min={substituteFrom || new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <Button 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={substituteLoading || !substituteUser || !substituteFrom || !substituteTo}
              onClick={async () => {
                setSubstituteLoading(true)
                const res = await createSubstitution(substituteUser, substituteFrom, substituteTo)
                setSubstituteLoading(false)
                if(res.success) {
                  toast.success("Helyettesítés beállítva!")
                  setSubstituteUser("")
                  setSubstituteFrom("")
                  setSubstituteTo("")
                } else {
                  toast.error(res.error)
                }
              }}
            >
              {substituteLoading ? "Mentés..." : "Helyettesítés rögzítése"}
            </Button>
          </CardContent>
        </Card>

        {helyettesitesek.length > 0 && (
          <Card className="border-border shadow-sm mt-6">
            <CardHeader className="pb-4 border-b">
              <CardTitle>Aktuális és korábbi helyettesítések</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {helyettesitesek.map((h: any) => {
                  const isPast = new Date(h.meddig) < new Date()
                  const isActive = !isPast && new Date(h.mettol) <= new Date()
                  return (
                    <div key={h.id} className="flex items-center justify-between p-4 border rounded-md bg-card">
                      <div>
                        <p className="font-semibold">{h.helyettesito?.nev}</p>
                        <p className="text-sm text-muted-foreground tabular-nums">
                          {new Date(h.mettol).toLocaleDateString("hu-HU")} - {new Date(h.meddig).toLocaleDateString("hu-HU")}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className={isActive ? "text-primary border-primary bg-primary/5" : isPast ? "text-muted-foreground" : "text-blue-500 border-blue-200 bg-blue-50/50"}>
                          {isActive ? "Aktív" : isPast ? "Lejárt" : "Tervezett"}
                        </Badge>
                        {!isPast && (
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={async () => {
                            if(confirm("Biztosan törlöd a helyettesítést?")) {
                              await deleteSubstitution(h.id)
                              toast.success("Törölve")
                            }
                          }}>
                            Törlés
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* RENDSZERGAZDA TAB — csak adminoknak */}
      {isAdmin && (
        <TabsContent value="rendszergazda" className="space-y-6 outline-none">

          {/* Irattári terv */}
          <Card className="border-border/50 shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Irattári Terv</CardTitle>
              </div>
              <CardDescription>
                Irányadó megőrzési idők és selejtezési szabályok kezelése. Az iktatásnál és selejtezésnél ezekre hivatkoznak az ügyiratok.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IrattariTervManager initialTervek={irattariTervek} />
            </CardContent>
          </Card>

          {/* Globális Audit Napló */}
          <Card className="border-border/50 shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">Globális Audit Napló</CardTitle>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border/50"
                  onClick={() => {
                    const rows = adminAuditNaplo.map((e: any) => [
                      e.letrehozva,
                      e.esemeny_tipus,
                      e.felhasznalo_nev || e.user_id,
                      e.entitas_tipus,
                      e.entitas_id,
                      e.ip_cim || "",
                      e.indoklas || "",
                    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
                    const csv = `Dátum,Esemény,Felhasználó,Entìtás típus,Entìtás ID,IP cím,Indoklás\n` + rows
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `audit_naplo_${new Date().toISOString().slice(0,10)}.csv`
                    a.click()
                  }}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  CSV export
                </Button>
              </div>
              <CardDescription>
                Az összes rendszeresemény naplója — append-only, nem módosítható. (Legutolsó 200 bejegyzés)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {adminAuditNaplo.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ScrollText className="h-8 w-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">Nem található naplóbejegyzés.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/30">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Dátum</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Esemény</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Felhasználó</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Entìtás</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">IP cím</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Indoklás</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminAuditNaplo.map((e: any) => (
                        <tr key={e.id} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 tabular-nums text-muted-foreground whitespace-nowrap">
                            {new Date(e.letrehozva).toLocaleString("hu-HU", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge className="text-[10px] px-1.5 py-0 h-4 border-0 bg-primary/10 text-primary font-mono">
                              {e.esemeny_tipus}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 font-medium">{e.felhasznalo_nev || e.user_id?.slice(0,8)}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            <span className="font-mono">{e.entitas_tipus}</span>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground font-mono">{e.ip_cim || "—"}</td>
                          <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">{e.indoklas || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

        </TabsContent>
      )}
    </>
  )
}
