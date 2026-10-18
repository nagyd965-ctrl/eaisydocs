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
import { User, Users, UserPlus, Key, Clock, Save, ShieldCheck, FileText, Plane, Building, Plus, Settings, Camera, Upload, Crown, Loader2 } from "lucide-react"
import Link from "next/link"
import { updateProfile, createNewUser, updateUserPassword, updateUserRole, uploadAvatar } from "./settings-actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { NotificationSettings } from "./notification-settings"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { DelegationSettingsCard } from "@/components/delegation-manager"
import { MfaSettingsCard } from "@/components/mfa-settings-card"
import { IrattariTervManager } from "@/components/irattari-terv-manager"
import { Archive, ScrollText, Download, Filter, Scale } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { CompanySettingsTab } from "@/components/settings/company-settings-tab"
import { DepartmentsTab } from "@/components/settings/departments-tab"

export function SettingsClient({ 
  initialProfile, 
  email, 
  teamMembers, 
  departments, 
  szabalyok, 
  naplo, 
  helyettesitesek = [], 
  incomingHelyettesitesek = [],
  isAdmin, 
  totpFactor, 
  irattariTervek = [], 
  initialFourEyesRequired = true
}: { 
  initialProfile: any, 
  email: string | undefined, 
  teamMembers: any[], 
  departments?: any[], 
  szabalyok?: any[], 
  naplo?: any[], 
  helyettesitesek?: any[], 
  incomingHelyettesitesek?: any[],
  isAdmin?: boolean, 
  totpFactor?: any, 
  irattariTervek?: any[], 
  initialFourEyesRequired?: boolean
}) {
  const router = useRouter()
  const [timeoutValue, setTimeoutValue] = useState<number>(initialProfile?.munkamenet_idotullepes || 15)
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
  const [selectedMemberClearance, setSelectedMemberClearance] = useState<string>("nyilt")
  const [editRoleLoading, setEditRoleLoading] = useState(false)
  const [fourEyesRequired, setFourEyesRequired] = useState(initialFourEyesRequired)
  const [fourEyesLoading, setFourEyesLoading] = useState(false)
  
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

  const clearanceMap: Record<string, string> = {
    nyilt: "Nyílt",
    belso: "Belső",
    bizalmas: "Bizalmas",
    szigoruan_bizalmas: "Szigorúan Bizalmas"
  }



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
      <TabsContent value="profil" className="space-y-6 outline-none">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Felhasználói profil</CardTitle>
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
                    className="mt-2.5 h-8 text-xs font-medium"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Kép kiválasztása
                  </Button>
                  {avatarFile && (
                    <p className="text-[11px] text-success mt-1.5">{avatarFile.name} kiválasztva</p>
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
              <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {loading ? "Mentés..." : success ? "Sikeres mentés!" : "Profil mentése"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* BIZTONSÁG KÁRTYA */}
        <Card className="border-border shadow-sm">
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
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer disabled:opacity-50"
              >
                <option value={5}>5 perc</option>
                <option value={15}>15 perc</option>
                <option value={30}>30 perc</option>
                <option value={60}>60 perc</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Kétlépcsős azonosítás */}
        <MfaSettingsCard totpFactor={totpFactor ?? null} />

        {/* Távolléti feladat-delegálás (Helyettesítés) */}
        <DelegationSettingsCard
          currentUserId={initialProfile?.id}
          myDelegations={helyettesitesek || []}
          incomingDelegations={incomingHelyettesitesek || []}
          teamMembers={teamMembers || []}
        />

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

      {/* CÉG BEÁLLÍTÁSOK TAB (VISIBILL MINTÁRA) */}
      <TabsContent value="ceg" className="space-y-4 outline-none">
        <CompanySettingsTab />
      </TabsContent>

      {/* 2. TAB: CSAPAT */}
      {isAdmin && (
        <TabsContent value="csapat" className="space-y-4 outline-none">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Csapat</CardTitle>
            <CardDescription>Felhasználók és hozzáférések kezelése</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamMembers?.map((member) => {
              const isSelf = member.id === initialProfile?.id
              return (
              <div 
                key={member.id} 
                className="flex items-center justify-between p-4 bg-card border rounded-xl hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-all group"
                onClick={() => {
                  setSelectedMember(member)
                  setSelectedMemberRole(member.docs_szerepkor || "")
                  setSelectedMemberDepartment(member.szervezeti_egyseg_id || "none")
                  setSelectedMemberClearance(member.max_minosites || "nyilt")
                  setEditRoleDialogOpen(true)
                }}
              >
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 shrink-0 bg-primary rounded-full flex items-center justify-center font-semibold text-sm text-primary-foreground">
                    {member.nev?.substring(0, 1).toUpperCase() || "?"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{member.nev}</p>
                      {isSelf && (
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-medium py-0 h-4">
                          Te
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {member.pozicio || member.docs_szerepkor || "Nincs megadva"} 
                      {departments?.find(d => d.id === member.szervezeti_egyseg_id) && 
                        ` • ${departments.find(d => d.id === member.szervezeti_egyseg_id)?.nev}`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider border-border/80">
                    {clearanceMap[member.max_minosites] || member.max_minosites || "Nyílt"}
                  </Badge>
                  <Badge variant="secondary" className="uppercase font-semibold text-[10px] tracking-wider">
                    {member.docs_szerepkor}
                  </Badge>
                  {!isSelf && (
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
                  )}
                </div>
              </div>
            )})}
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
                  const isSelf = selectedMember.id === initialProfile?.id
                  const isSelfAdmin = isSelf && ['admin', 'rendszergazda'].includes(initialProfile?.docs_szerepkor || initialProfile?.szerepkor)
                  const newRole = (formData.get("role") as string) || selectedMemberRole
                  if (isSelfAdmin && !['admin', 'rendszergazda'].includes(newRole)) {
                    toast.error("Hiba", { description: "Saját adminisztrátori szerepkörödet nem vonhatod vissza!" })
                    return
                  }
                  setEditRoleLoading(true)
                  const newDept = formData.get("departmentId") as string
                  const newClearance = (formData.get("clearance") as string) || selectedMemberClearance || "nyilt"
                  const deptId = newDept === "none" ? null : newDept
                  const res = await updateUserRole(selectedMember.id, newRole, newClearance, deptId)
                  setEditRoleLoading(false)
                  if (res.error) {
                    toast.error("Hiba", { description: res.error })
                  } else {
                    toast.success("Sikeres", { description: "Jogosultságok és biztonsági minősítés módosítva." })
                    setEditRoleDialogOpen(false)
                  }
                }}>
                  <DialogHeader>
                    <DialogTitle>Szerepkör és Jogosultság Módosítása</DialogTitle>
                    <DialogDescription>
                      Módosíthatod a(z) <span className="font-semibold text-foreground">{selectedMember?.nev}</span> fiók szerepkörét és biztonsági szintjét.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    {(() => {
                      const isSelf = selectedMember?.id === initialProfile?.id
                      const isSelfAdmin = isSelf && ['admin', 'rendszergazda'].includes(initialProfile?.docs_szerepkor || initialProfile?.szerepkor)
                      return (
                        <div className="space-y-2">
                          <Label htmlFor="edit-role">Új Szerepkör</Label>
                          <Select 
                            name="role" 
                            value={selectedMemberRole} 
                            onValueChange={(val) => setSelectedMemberRole(val || "")} 
                            disabled={isSelfAdmin}
                            required
                          >
                            <SelectTrigger id="edit-role" className={isSelfAdmin ? "opacity-80 cursor-not-allowed bg-muted/40" : ""}>
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
                          {isSelfAdmin && (
                            <p className="text-[11px] text-amber-500 font-medium">
                              Saját adminisztrátori szerepköröd nem csökkenthető a rendszerből való kizáródás megelőzése érdekében.
                            </p>
                          )}
                        </div>
                      )
                    })()}
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
                    <div className="space-y-2">
                      <Label htmlFor="edit-clearance">Biztonsági Minősítés (Max. Hozzáférési Szint)</Label>
                      <Select name="clearance" value={selectedMemberClearance} onValueChange={(val) => setSelectedMemberClearance(val || "nyilt")}>
                        <SelectTrigger id="edit-clearance">
                          <SelectValue placeholder="Válassz minősítést...">
                            {clearanceMap[selectedMemberClearance] || selectedMemberClearance}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nyilt">Nyílt (Alapszint)</SelectItem>
                          <SelectItem value="belso">Belső</SelectItem>
                          <SelectItem value="bizalmas">Bizalmas</SelectItem>
                          <SelectItem value="szigoruan_bizalmas">Szigorúan Bizalmas</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Meghatározza, hogy a felhasználó milyen minősítésű iratokat és fájlokat tekinthet meg.
                      </p>
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
      )}

      {isAdmin && (
        <TabsContent value="osztalyok" className="space-y-4 outline-none">
          <DepartmentsTab 
            departments={departments || []} 
            teamMembers={teamMembers || []} 
          />
        </TabsContent>
      )}

      

      {/* 5. TAB: ÉRTESÍTÉSEK */}
      <TabsContent value="ertesitesek" className="space-y-4 outline-none">
        <NotificationSettings rules={szabalyok || []} logs={naplo || []} isAdmin={isAdmin} />
      </TabsContent>





      {/* RENDSZERGAZDA TAB — csak adminoknak */}
      {isAdmin && (
        <TabsContent value="rendszergazda" className="space-y-6 outline-none">

          {/* Selejtezési Szabályzat & Négyszem-elv (B10) */}
          <Card className="border-border/50 shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Selejtezési Szabályzat & Négyszem-elv</CardTitle>
                {fourEyesRequired ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-normal">
                    Audit / Megfelelőségi Mód (Szigorú)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-normal">
                    Egyfelhasználós / KKV Mód (Engedékeny)
                  </Badge>
                )}
              </div>
              <CardDescription>
                A lejárt megőrzési idejű ügyiratok selejtezési és megsemmisítési jóváhagyási láncának szabályozása.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
                <div className="space-y-1 pr-4">
                  <Label htmlFor="four-eyes-toggle" className="text-sm font-semibold text-foreground cursor-pointer">
                    Szigorú négyszem-elv megkövetelése selejtezéskor
                  </Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {fourEyesRequired ? (
                      <span>
                        <strong className="text-foreground">Bekapcsolva (Szigorú):</strong> A selejtezési javaslatot felterjesztő iratkezelő munkatárs semmilyen szerepkörben nem hagyhatja jóvá a saját javaslatát. A jóváhagyást kizárólag egy másik, független vezető vagy rendszergazda végezheti el. (Nagyvállalati / államigazgatási megfelelőség).
                      </span>
                    ) : (
                      <span>
                        <strong className="text-foreground">Kikapcsolva (Engedékeny):</strong> A javaslattevő vezető vagy admin a saját maga által felterjesztett ügyiratokat is közvetlenül jóváhagyhatja. A selejtezési jegyzőkönyvben és az audit naplóban rögzítésre kerül az egyfelhasználós jóváhagyás. (Kisvállalkozások és gyorsított tesztelés számára ajánlott).
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    id="four-eyes-toggle"
                    checked={fourEyesRequired}
                    disabled={fourEyesLoading}
                    onCheckedChange={async (checked) => {
                      setFourEyesLoading(true)
                      const { setFourEyesSetting } = await import("./admin-actions")
                      const res = await setFourEyesSetting(checked)
                      setFourEyesLoading(false)
                      if (res.error) {
                        toast.error("Hiba a beállítás mentésekor", { description: res.error })
                      } else {
                        setFourEyesRequired(checked)
                        toast.success("Selejtezési szabályzat frissítve!", {
                          description: checked
                            ? "A szigorú négyszem-elv mostantól kötelező a selejtezésekhez."
                            : "Az egyfelhasználós selejtezési jóváhagyás engedélyezve lett.",
                        })
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Irattári terv */}
          <Card className="border-border/50 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Irattári Terv</CardTitle>
              <CardDescription>
                Irányadó megőrzési idők és selejtezési szabályok kezelése. Az iktatásnál és selejtezésnél ezekre hivatkoznak az ügyiratok.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IrattariTervManager initialTervek={irattariTervek} />
            </CardContent>
          </Card>

        </TabsContent>
      )}
    </>
  )
}
