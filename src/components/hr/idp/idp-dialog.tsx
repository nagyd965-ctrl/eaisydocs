"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { createDevelopmentGoal, IDPGoalType } from "@/app/hr/actions/idp-actions"

export function IdpDialog({ tervId, dolgozoId, buttonVariant = "default" }: { tervId: string, dolgozoId: string, buttonVariant?: "default" | "outline" | "ghost" }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Sima state-ek form kezeléshez
  const [tipus, setTipus] = useState<string>("kompetencia")
  const [megnevezes, setMegnevezes] = useState("")
  const [leiras, setLeiras] = useState("")
  const [hatarido, setHatarido] = useState("")
  
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!megnevezes || !hatarido) return

    setIsSubmitting(true)
    
    const result = await createDevelopmentGoal({
      terv_id: tervId,
      dolgozo_id: dolgozoId,
      tipus: tipus as IDPGoalType,
      megnevezes: megnevezes,
      leiras: leiras,
      hatarido: hatarido,
    })

    setIsSubmitting(false)

    if (result.success) {
      setOpen(false)
      // Reset
      setTipus("kompetencia")
      setMegnevezes("")
      setLeiras("")
      setHatarido("")
      router.refresh()
    } else {
      console.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={buttonVariant as any} size="sm" />}>
        <Plus className="w-4 h-4 mr-2" />
        Új Célkitűzés
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Új Fejlesztési Célkitűzés</DialogTitle>
          <DialogDescription>
            Rögzítsen egy új célt a fejlesztési tervhez.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tipus">Cél Típusa</Label>
            <Select value={tipus} onValueChange={(val) => setTipus(val || "")}>
              <SelectTrigger id="tipus">
                <SelectValue placeholder="Válasszon típust" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kompetencia">Kompetencia</SelectItem>
                <SelectItem value="kepzes">Képzés (Tanfolyam)</SelectItem>
                <SelectItem value="nyelv">Nyelvvizsga</SelectItem>
                <SelectItem value="egyeb">Egyéb</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="megnevezes">Megnevezés</Label>
            <Input 
              id="megnevezes" 
              placeholder="pl. Haladó Excel tanfolyam" 
              value={megnevezes}
              onChange={(e) => setMegnevezes(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="hatarido">Határidő</Label>
            <Input 
              id="hatarido" 
              type="date"
              value={hatarido}
              onChange={(e) => setHatarido(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="leiras">Leírás (opcionális)</Label>
            <Textarea 
              id="leiras"
              placeholder="Célkitűzés részletei, mentor neve, stb."
              className="resize-none"
              value={leiras}
              onChange={(e) => setLeiras(e.target.value)}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Mégse
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Mentés
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
