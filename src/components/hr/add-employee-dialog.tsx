"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { addEmployee } from "@/app/hr/admin/actions"

export function AddEmployeeDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    nev: "",
    email: "",
    pozicio: "",
    belepes_datuma: ""
  })

  const handleSubmit = async () => {
    if (!formData.nev || !formData.pozicio) {
      toast.error("Kérlek add meg a dolgozó nevét és pozícióját!")
      return
    }

    setLoading(true)
    const result = await addEmployee(formData)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Dolgozó sikeresen létrehozva!")
      setOpen(false)
      // Navigálás a dolgozó adatlapjára
      if (result.employee?.id) {
        router.push(`/hr/employee/${result.employee.id}`)
      }
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
            Töltsd ki az alapvető dolgozói adatokat a profil létrehozásához. A további 7 blokkot később töltheted fel.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Teljes Név</Label>
            <Input 
              id="name" 
              placeholder="Vezeték- és keresztnév" 
              className="col-span-3"
              value={formData.nev}
              onChange={(e) => setFormData({ ...formData, nev: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">E-mail cím</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="munkahelyi@email.hu" 
              className="col-span-3"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">Munkakör</Label>
            <Select onValueChange={(val) => setFormData({ ...formData, pozicio: val })}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Válassz munkakört..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fejlesztő">Fejlesztő</SelectItem>
                <SelectItem value="Projektmenedzser">Projektmenedzser</SelectItem>
                <SelectItem value="HR Munkatárs">HR Munkatárs</SelectItem>
                <SelectItem value="Értékesítő">Értékesítő</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">Belépés Dátuma</Label>
            <Input 
              id="date" 
              type="date" 
              className="col-span-3"
              value={formData.belepes_datuma}
              onChange={(e) => setFormData({ ...formData, belepes_datuma: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Mégse</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Létrehozás és Tovább a Profilra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
