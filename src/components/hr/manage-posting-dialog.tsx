"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"

export function ManagePostingDialog({ jobs, existingData = null, onSaved, children }: { jobs: any[], existingData?: any, onSaved: (data: any) => void, children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [munkakorId, setMunkakorId] = useState<string>(existingData?.munkakor_id || "")
  const [isInternal, setIsInternal] = useState<boolean>(existingData?.is_internal || false)
  
  const isEditing = !!existingData
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      cim: formData.get("cim") as string,
      munkakor_id: formData.get("munkakor_id") as string,
      rovid_leiras: formData.get("rovid_leiras") as string,
      reszletes_leiras: formData.get("reszletes_leiras") as string,
      is_internal: isInternal,
    }

    if (!data.cim || !data.munkakor_id) {
      toast.error("Cím és Munkakör megadása kötelező!")
      setLoading(false)
      return
    }

    try {
      if (isEditing) {
        const { data: updated, error } = await supabase
          .from("hr_allashirdetes")
          .update(data)
          .eq("id", existingData.id)
          .select()
          .single()
          
        if (error) throw error
        toast.success("Álláshirdetés módosítva")
        onSaved(updated)
      } else {
        const { data: inserted, error } = await supabase
          .from("hr_allashirdetes")
          .insert(data)
          .select()
          .single()
          
        if (error) throw error
        toast.success("Új álláshirdetés létrehozva")
        onSaved(inserted)
      }
      setOpen(false)
    } catch (error: any) {
      toast.error("Hiba történt a mentés során")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        children ? (
          children as React.ReactElement
        ) : (
          <Button><Plus className="w-4 h-4 mr-2" /> Új hirdetés feladása</Button>
        )
      } />
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Álláshirdetés módosítása" : "Új Álláshirdetés feladása"}</DialogTitle>
          <DialogDescription>
            Töltsd ki az adatokat a publikus karrieroldalhoz. A publikálást a listában tudod majd bekapcsolni.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="cim">Hirdetés Nyilvános Címe <span className="text-red-500">*</span></Label>
            <Input id="cim" name="cim" required defaultValue={existingData?.cim} placeholder="pl. Senior Full-Stack Fejlesztő" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="munkakor_id">Belső Munkakör <span className="text-red-500">*</span></Label>
            <Select name="munkakor_id" value={munkakorId} onValueChange={(val) => val && setMunkakorId(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Válassz munkakört...">
                  {jobs.find(j => j.id === munkakorId)?.megnevezes}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {jobs.map(job => (
                  <SelectItem key={job.id} value={job.id} label={job.megnevezes}>{job.megnevezes}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">A jelentkezők ehhez a belső munkakörhöz fognak tartozni.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rovid_leiras">Rövid leírás (Kártyán jelenik meg)</Label>
            <Textarea 
              id="rovid_leiras" 
              name="rovid_leiras" 
              defaultValue={existingData?.rovid_leiras} 
              placeholder="1-2 mondatos kedvcsináló..." 
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reszletes_leiras">Részletes leírás (HTML vagy Markdown)</Label>
            <Textarea 
              id="reszletes_leiras" 
              name="reszletes_leiras" 
              defaultValue={existingData?.reszletes_leiras} 
              className="min-h-[150px]"
              placeholder="Elvárások, feladatok, juttatások..." 
            />
          </div>

          <div className="flex items-center space-x-2 pt-2 pb-2">
            <Switch
              id="is_internal"
              checked={isInternal}
              onCheckedChange={setIsInternal}
            />
            <Label htmlFor="is_internal" className="flex flex-col space-y-1">
              <span>Csak Belső Hirdetés</span>
              <span className="font-normal text-sm text-muted-foreground">
                Ha be van kapcsolva, a hirdetés nem jelenik meg a publikus karrieroldalon, csak a belépett dolgozók láthatják.
              </span>
            </Label>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" className="mr-2" onClick={() => setOpen(false)}>Mégsem</Button>
            <Button type="submit" disabled={loading}>{loading ? "Mentés..." : (isEditing ? "Módosítás" : "Létrehozás")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
