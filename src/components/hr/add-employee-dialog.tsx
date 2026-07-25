"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserPlus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { onboardEmployee } from "@/app/hr/admin/actions"

export function AddEmployeeDialog({ availableUsers, jobs, candidates = [] }: { availableUsers: any[], jobs: any[], candidates?: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const roleMap: Record<string, string> = {
    "munkavallalo": "Munkavállaló (Alap)",
    "vezeto": "Vezető (Közvetlen)",
    "hr_munkatars": "HR Munkatárs",
    "hr_vezeto": "HR Vezető (Igazgató)",
    "berugyi": "Bérügyi / Bérszámfejtő",
    "admin": "Rendszergazda (Admin)"
  }

  const [formData, setFormData] = useState({
    mode: "select_existing", // vagy "create_new"
    userId: "",
    candidateId: "",
    email: "",
    password: "",
    nev: "",
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
      <DialogTrigger className={buttonVariants({ variant: "default", className: "gap-2" })}>
        <UserPlus className="w-4 h-4" />
        Új Dolgozó Felvétele
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Új Dolgozó Felvétele</DialogTitle>
          <DialogDescription>
            Rendelj hozzá HR adatokat egy meglévő felhasználóhoz, vagy hozz létre egy teljesen újat az eaisyHR modulba.
          </DialogDescription>
        </DialogHeader>

        <Tabs 
          defaultValue="select_existing" 
          onValueChange={(val) => setFormData({ ...formData, mode: val })}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="select_candidate">Jelentkezőből (ATS)</TabsTrigger>
            <TabsTrigger value="select_existing">Meglévő fiók</TabsTrigger>
            <TabsTrigger value="create_new">Új fiók</TabsTrigger>
          </TabsList>

          <TabsContent value="select_candidate" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="candidate">Elfogadott Jelentkező</Label>
              <Select 
                value={formData.candidateId} 
                onValueChange={(val) => {
                  const candidate = candidates.find(c => c.id === val)
                  setFormData({ 
                    ...formData, 
                    candidateId: val,
                    munkakorId: candidate?.megpalyazott_munkakor_id || "none"
                  })
                }}
              >
                <SelectTrigger>
                  {formData.candidateId 
                    ? <span>{candidates.find(c => c.id === formData.candidateId)?.nev || "Kiválasztva"}</span>
                    : <span className="text-muted-foreground">Válassz egy elfogadott jelentkezőt...</span>}
                </SelectTrigger>
                <SelectContent>
                  {candidates.map(candidate => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.nev} ({candidate.email})
                    </SelectItem>
                  ))}
                  {candidates.length === 0 && (
                    <SelectItem value="none" disabled>
                      Nincs átemelhető jelentkező!
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {formData.candidateId && (
              <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                A rendszer automatikusan létrehozza az Auth fiókot a jelentkező e-mail címével, és kiküldi neki a belépési adatokat.
              </div>
            )}
          </TabsContent>

          <TabsContent value="select_existing" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user">Regisztrált Felhasználó</Label>
              <Select value={formData.userId} onValueChange={(val) => setFormData({ ...formData, userId: val })}>
                <SelectTrigger>
                  {formData.userId 
                    ? <span>{availableUsers.find(u => u.id === formData.userId)?.nev || "Kiválasztva"}</span>
                    : <span className="text-muted-foreground">Válassz egy felhasználót...</span>}
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.nev} ({user.email})
                    </SelectItem>
                  ))}
                  {availableUsers.length === 0 && (
                    <SelectItem value="none" disabled>
                      Minden felhasználó már dolgozó!
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="create_new" className="space-y-4">
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
            <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
              <SelectTrigger>
                <span>{roleMap[formData.role] || "Válassz szerepkört..."}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="munkavallalo">Munkavállaló (Alap)</SelectItem>
                <SelectItem value="vezeto">Vezető (Közvetlen)</SelectItem>
                <SelectItem value="hr_munkatars">HR Munkatárs</SelectItem>
                <SelectItem value="hr_vezeto">HR Vezető (Igazgató)</SelectItem>
                <SelectItem value="berugyi">Bérügyi / Bérszámfejtő</SelectItem>
                <SelectItem value="admin">Rendszergazda (Admin)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="munkakor">Betöltött Munkakör (Beosztás)</Label>
            <Select value={formData.munkakorId} onValueChange={(val) => setFormData({ ...formData, munkakorId: val })}>
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
            <Label htmlFor="date">Belépés Dátuma (Jogviszony kezdete)</Label>
            <Input 
              id="date" 
              type="date" 
              value={formData.belepes_datuma}
              onChange={(e) => setFormData({ ...formData, belepes_datuma: e.target.value })}
            />
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
