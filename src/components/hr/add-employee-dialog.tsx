"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserPlus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { onboardEmployee } from "@/app/hr/admin/actions"
import { ReactElement } from "react"

import { type CandidateJobOption } from "./add-candidate-dialog"

export interface AvailableUserItem {
  id: string
  nev?: string | null
  email?: string | null
  docs_szerepkor?: string | null
  isAlreadyAssigned?: boolean
  [key: string]: unknown
}

const docsRoleMap: Record<string, string> = {
  "admin": "Adminisztrátor",
  "iktato": "Iktató",
  "vezeto": "Vezető",
  "ugyintezo": "Ügyintéző",
  "betekinto": "Betekintő",
  "auditor": "Auditor"
}

export interface CandidateOptionItem {
  id: string
  nev?: string | null
  email?: string | null
  telefonszam?: string | null
  megpalyazott_munkakor_id?: string | null
  [key: string]: unknown
}

export function AddEmployeeDialog({ 
  availableUsers, 
  jobs, 
  candidates = [], 
  customTrigger
}: { 
  availableUsers: AvailableUserItem[]
  jobs: CandidateJobOption[]
  candidates?: CandidateOptionItem[]
  customTrigger?: ReactElement
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const roleMap: Record<string, string> = {
    "munkavallalo": "Munkavállaló (Alap)",
    "vezeto": "Vezető (Közvetlen)",
    "hr_munkatars": "HR Munkatárs",
    "hr_vezeto": "HR Vezető (Igazgató)",
    "berugyi": "Bérügyi / Bérszámfejtő",
    "admin": "Admin",
    "toborzo": "Toborzó (ATS)",
    "munkavedelmi": "Munkavédelmi Felelős",
    "rendszergazda": "Rendszergazda (IT)",
    "auditor": "Auditor (Könyvvizsgáló)"
  }

  const [formData, setFormData] = useState({
    mode: "select_existing", // vagy "create_new"
    userId: "",
    candidateId: "",
    email: "",
    password: "",
    nev: "",
    telefon: "",
    role: "munkavallalo",
    munkakorId: "none",
    belepes_datuma: new Date().toISOString().split("T")[0]
  })

  const handleSubmit = async () => {
    if (formData.mode === "select_existing" && !formData.userId) {
      toast.error("Kérlek válassz ki egy felhasználót!")
      return
    }

    if (formData.mode === "select_candidate" && !formData.candidateId) {
      toast.error("Kérlek válassz ki egy jelentkezőt!")
      return
    }

    if (formData.mode === "create_new" && (!formData.email || !formData.password || !formData.nev)) {
      toast.error("Kérlek töltsd ki az e-mailt, jelszót és nevet!")
      return
    }

    setLoading(true)
    const result = await onboardEmployee(formData)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Dolgozó sikeresen felvéve!")
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {customTrigger ? (
        <DialogTrigger render={customTrigger} />
      ) : (
        <DialogTrigger className={buttonVariants({ variant: "default" })}>
          Új Dolgozó Felvétele
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Új Dolgozó Felvétele</DialogTitle>
          <DialogDescription>
            Rendelj hozzá eaisyHR jogosultságot egy meglévő eaisyDocs felhasználóhoz, vagy hozz létre egy dedikált új munkatársi fiókot.
          </DialogDescription>
        </DialogHeader>

        <Tabs 
          defaultValue="select_existing" 
          onValueChange={(val) => setFormData({ ...formData, mode: val })}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="select_existing">Meglévő eaisyDocs fiók</TabsTrigger>
            <TabsTrigger value="create_new">Új fiók (Csak eaisyHR)</TabsTrigger>
          </TabsList>

          <TabsContent value="select_existing" className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground/85 leading-relaxed">
              Ha a meglévő eaisyDocs fiókok közül választasz munkatársat, a felhasználó hozzáférést kap az eaisyHR modulhoz is.
            </div>

            <div className="space-y-2">
              <Label htmlFor="user">eaisyDocs Felhasználó Kiválasztása ({availableUsers.length} fiók)</Label>
              <Select value={formData.userId} onValueChange={(val) => setFormData({ ...formData, userId: val || "" })}>
                <SelectTrigger>
                  {formData.userId 
                    ? (() => {
                        const selected = availableUsers.find(u => u.id === formData.userId)
                        return selected ? (
                          <span>{selected.nev} {selected.email ? `(${selected.email})` : ""}</span>
                        ) : <span>Kiválasztva</span>
                      })()
                    : <span className="text-muted-foreground">Válassz eaisyDocs felhasználót...</span>}
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map(user => {
                    const roleName = user.docs_szerepkor ? (docsRoleMap[user.docs_szerepkor as string] || user.docs_szerepkor) : null
                    return (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center justify-between gap-3 w-full py-0.5">
                          <span className="font-medium text-foreground">{user.nev}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {user.email && <span>{user.email}</span>}
                            {roleName && (
                              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
                                {roleName}
                              </span>
                            )}
                            {user.isAlreadyAssigned && (
                              <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded font-medium">
                                Már HR dolgozó
                              </span>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    )
                  })}
                  {availableUsers.length === 0 && (
                    <SelectItem value="none" disabled>
                      Nem található felhasználó!
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="create_new" className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
              Ez a fiók kizárólag az eaisyHR rendszerhez kap hozzáférést, az eaisyDocs iratkezelőt nem éri el.
            </div>

            <div className="space-y-2">
              <Label htmlFor="nev">Teljes Név</Label>
              <Input 
                id="nev" 
                placeholder="Pl. Kis József" 
                value={formData.nev}
                onChange={(e) => setFormData({ ...formData, nev: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail (Bejelentkezéshez)</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="email@ceg.hu" 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Jelszó</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="******" 
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="grid gap-4 py-2 border-t mt-2">
          
          <div className="space-y-2">
            <Label htmlFor="role">HR Rendszer Szerepkör</Label>
            <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val || "" })}>
              <SelectTrigger>
                <span>{roleMap[formData.role] || "Válassz szerepkört..."}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="munkavallalo">Munkavállaló (Alap)</SelectItem>
                <SelectItem value="vezeto">Vezető (Közvetlen)</SelectItem>
                <SelectItem value="hr_munkatars">HR Munkatárs</SelectItem>
                <SelectItem value="hr_vezeto">HR Vezető (Igazgató)</SelectItem>
                <SelectItem value="berugyi">Bérügyi / Bérszámfejtő</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="toborzo">Toborzó (ATS)</SelectItem>
                <SelectItem value="munkavedelmi">Munkavédelmi Felelős</SelectItem>
                <SelectItem value="rendszergazda">Rendszergazda (IT)</SelectItem>
                <SelectItem value="auditor">Auditor (Könyvvizsgáló)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="munkakor">Betöltött Munkakör (Beosztás)</Label>
            <Select value={formData.munkakorId} onValueChange={(val) => setFormData({ ...formData, munkakorId: val || "" })}>
              <SelectTrigger>
                {formData.munkakorId === "none" || !formData.munkakorId
                  ? <span>Nincs munkakör beállítva</span>
                  : <span>{jobs.find(j => j.id === formData.munkakorId)?.megnevezes || "Kiválasztva"}</span>}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nincs munkakör beállítva</SelectItem>
                {jobs.map(job => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.megnevezes}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefon">Telefonszám</Label>
            <Input 
              id="telefon" 
              placeholder="+36301234567" 
              value={formData.telefon}
              onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Belépés Dátuma (Jogviszony kezdete)</Label>
            <Input 
              id="date" 
              type="date" 
              value={formData.belepes_datuma}
              onChange={(e) => setFormData({ ...formData, belepes_datuma: e.target.value })}
            />
            <div className="text-xs text-warning bg-warning/10 p-2 rounded border border-warning/20">
              Figyelem: A T1041 biztosítotti bejelentés határideje a munkába állás megkezdése előtt van!
            </div>
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Mégse</Button>
          <Button onClick={handleSubmit} disabled={loading || (formData.mode === 'select_existing' && !formData.userId) || (formData.mode === 'create_new' && (!formData.email || !formData.password || !formData.nev))}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Felvétel és Mentés
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
