"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { createMunkakor } from "@/app/hr/settings/actions"

export function JobCreateDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [besorolas, setBesorolas] = useState("")

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    formData.set("besorolasi_szint", besorolas)
    
    const result = await createMunkakor(formData)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Munkakör sikeresen létrehozva!")
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2 bg-[#02b8cc] hover:bg-[#029db0] text-white" />}>
        <Plus className="w-4 h-4" />
        Új Munkakör Létrehozása
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Új Munkakör Létrehozása</DialogTitle>
          <DialogDescription>
            Add meg az új vállalati pozíció alapadatsait.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="megnevezes">Munkakör Megnevezése <span className="text-destructive">*</span></Label>
              <Input id="megnevezes" name="megnevezes" placeholder="pl. Vezető Fejlesztő" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feor_kod">FEOR Kód</Label>
                <Input id="feor_kod" name="feor_kod" placeholder="pl. 2142" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="besorolas">Besorolási Szint</Label>
                <Select value={besorolas} onValueChange={(val) => val && setBesorolas(val)}>
                  <SelectTrigger id="besorolas">
                    <SelectValue placeholder="Válassz..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Medior">Medior</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                    <SelectItem value="Vezető">Vezető (Manager)</SelectItem>
                    <SelectItem value="Igazgató">Igazgató (Director)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kockazat_tipusa">Kockázat Típusa (Munkavédelem)</Label>
              <Input id="kockazat_tipusa" name="kockazat_tipusa" placeholder="pl. Képernyő előtti munkavégzés" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Mégse
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Mentés..." : "Létrehozás"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
