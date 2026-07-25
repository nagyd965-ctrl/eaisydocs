"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Save } from "lucide-react"
import { updateEmployeeInfo } from "@/app/hr/settings/actions"
import { toast } from "sonner"

export function EmployeeEditDialog({ employee, jobs }: { employee: any, jobs: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const nev = employee.felhasznalo_profil?.nev || "Ismeretlen"
  
  const roleMap: Record<string, string> = {
    "munkavallalo": "Munkavállaló (Alap)",
    "vezeto": "Vezető (Közvetlen)",
    "hr_munkatars": "HR Munkatárs",
    "hr_vezeto": "HR Vezető (Igazgató)",
    "berugyi": "Bérügyi / Bérszámfejtő",
    "admin": "Rendszergazda (Admin)"
  }

  const activeJogviszony = employee.hr_jogviszony?.[0]
  const activeBeosztas = activeJogviszony?.hr_beosztas?.[0]

  const [role, setRole] = useState<string>(employee.felhasznalo_profil?.hr_szerepkor || "munkavallalo")
  const [munkakorId, setMunkakorId] = useState<string>(activeBeosztas?.hr_munkakor?.id || "none")

  const getMunkakorLabel = (id: string) => {
    if (id === "none") return "Nincs munkakör beállítva"
    const job = jobs.find(j => j.id === id)
    return job ? job.megnevezes : "Ismeretlen munkakör"
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.append("employeeId", employee.id)
    if (activeJogviszony?.id) {
      formData.append("jogviszonyId", activeJogviszony.id)
    }

    const result = await updateEmployeeInfo(formData)

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Dolgozó adatai sikeresen frissítve!")
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0" />}>
        <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Dolgozó szerkesztése</DialogTitle>
          <DialogDescription>
            {nev} (ID: {employee.id.substring(0,8)}...)
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="role">Rendszer Szerepkör (Jogosultságok)</Label>
            {/* Rejtett input a form submithoz */}
            <input type="hidden" name="role" value={role} />
            <Select value={role} onValueChange={setRole as any}>
              <SelectTrigger>
                <span>{roleMap[role] || "Válassz szerepkört"}</span>
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
            <Label htmlFor="munkakorId">Betöltött Munkakör</Label>
            <input type="hidden" name="munkakorId" value={munkakorId} />
            <Select value={munkakorId} onValueChange={setMunkakorId as any}>
              <SelectTrigger>
                <span>{getMunkakorLabel(munkakorId)}</span>
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
            <Label htmlFor="entryDate">Belépés Dátuma</Label>
            <Input 
              type="date" 
              name="entryDate" 
              id="entryDate" 
              defaultValue={activeJogviszony?.belepes_datuma || ""}
            />
          </div>

          <div className="flex justify-end pt-4 gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Mégsem
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? "Mentés..." : <><Save className="w-4 h-4" /> Mentés</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
