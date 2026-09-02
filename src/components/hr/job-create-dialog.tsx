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

import { ReactElement } from "react"

interface OrgUnit { id: string; nev: string }

export function JobCreateDialog({ customTrigger, orgUnits = [] }: { customTrigger?: ReactElement; orgUnits?: OrgUnit[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [besorolas, setBesorolas] = useState("")
  const [selectedOrgUnit, setSelectedOrgUnit] = useState("none")

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    formData.set("besorolasi_szint", besorolas)
    formData.set("szervezeti_egyseg_id", selectedOrgUnit)
    
    const result = await createMunkakor(formData)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Munkakör sikeresen létrehozva!")
      setOpen(false)
      setBesorolas("")
      setSelectedOrgUnit("none")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {customTrigger ? (
        <DialogTrigger render={customTrigger} />
      ) : (
        <DialogTrigger render={<Button className="gap-2 bg-[#02b8cc] hover:bg-[#029db0] text-white" />}>
          <Plus className="w-4 h-4" />
          Új Munkakör Létrehozása
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
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

            {/* Szervezeti egység hozzárendelés */}
            <div className="space-y-2">
              <Label htmlFor="szervezeti_egyseg">Szervezeti Egység</Label>
              <Select value={selectedOrgUnit} onValueChange={(val) => setSelectedOrgUnit(val ?? "none")}>
                <SelectTrigger id="szervezeti_egyseg">
                  <SelectValue>
                    {selectedOrgUnit === "none"
                      ? <span className="text-muted-foreground">— Nincs besorolva —</span>
                      : orgUnits.find((u) => u.id === selectedOrgUnit)?.nev ?? <span className="text-muted-foreground">— Nincs besorolva —</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nincs besorolva —</SelectItem>
                  {orgUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nev}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kockazat_tipusa">Kockázat Típusa (Munkavédelem)</Label>
              <Input id="kockazat_tipusa" name="kockazat_tipusa" placeholder="pl. Képernyő előtti munkavégzés" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vedoeszkoz_igeny">Védőeszköz Igény</Label>
              <Input id="vedoeszkoz_igeny" name="vedoeszkoz_igeny" placeholder="pl. Védőszemüveg, munkavédelmi cipő" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="feladatok_es_hataskorok">Feladatok és Hatáskörök (soronként egy)</Label>
              <textarea 
                id="feladatok_es_hataskorok" 
                name="feladatok_es_hataskorok" 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="pl. Raktárkészlet ellenőrzése&#10;Áruátvétel adminisztrációja" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="elvart_kompetenciak">Elvárt Kompetenciák és Végzettség (soronként egy)</Label>
              <textarea 
                id="elvart_kompetenciak" 
                name="elvart_kompetenciak" 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="pl. Érettségi&#10;Targoncavezetői jogosítvány" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orvosi_vizsgalat_tipus">Orvosi Vizsgálat Típusa</Label>
                <Input id="orvosi_vizsgalat_tipus" name="orvosi_vizsgalat_tipus" placeholder="pl. Időszakos (Képernyős)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orvosi_vizsgalat_gyakorisag_ho">Gyakoriság (hónapban)</Label>
                <Input id="orvosi_vizsgalat_gyakorisag_ho" name="orvosi_vizsgalat_gyakorisag_ho" type="number" placeholder="pl. 12" />
              </div>
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
