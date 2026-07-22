"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Edit } from "lucide-react"
import { toast } from "sonner"
import { updateJogviszonyData } from "../actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function EmploymentTab({ 
  employeeId,
  isHrOrAdmin,
  adatlap
}: { 
  employeeId: string,
  isHrOrAdmin: boolean,
  adatlap: any
}) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Kontrollált állapotok a selectekhez
  const [munkaviszonyTipusa, setMunkaviszonyTipusa] = useState(adatlap?.munkaviszony_tipusa || "")
  const [munkarend, setMunkarend] = useState(adatlap?.munkarend || "")

  const munkaviszonyLabels: Record<string, string> = {
    teljes: "Teljes munkaidő",
    resz: "Részmunkaidő",
    megbizasi: "Megbízási jogviszony",
    diak: "Diákmunka"
  }

  const munkarendLabels: Record<string, string> = {
    kotetlen: "Kötetlen munkarend",
    torzsudo: "Törzsidős",
    muszakos: "Műszakos",
    rugalmas: "Rugalmas"
  }

  const handleUpdate = async (formData: FormData) => {
    // Kézzel hozzáfűzzük a select értékeket a formData-hoz
    formData.set("munkaviszony_tipusa", munkaviszonyTipusa)
    formData.set("munkarend", munkarend)
    
    setLoading(true)
    const result = await updateJogviszonyData(employeeId, formData)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Jogviszony adatai frissítve!")
      setIsEditOpen(false)
    }
  }

  // Format date safely
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Nincs megadva"
    return new Date(dateString).toLocaleDateString("hu-HU")
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Jogviszony és Besorolás</CardTitle>
        {isHrOrAdmin && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-2`}>
              <Edit className="w-4 h-4" /> Szerkesztés
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Jogviszony adatainak módosítása</DialogTitle>
                <DialogDescription>
                  Itt frissítheted a dolgozó besorolását és munkaidő adatait.
                </DialogDescription>
              </DialogHeader>
              <form action={handleUpdate}>
                <div className="grid gap-4 py-4">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="belepes_datuma">Belépés Dátuma</Label>
                      <Input 
                        id="belepes_datuma" 
                        name="belepes_datuma" 
                        type="date" 
                        defaultValue={adatlap?.belepes_datuma || ""} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="munkaido_fte">Munkaidő (FTE)</Label>
                      <Input 
                        id="munkaido_fte" 
                        name="munkaido_fte" 
                        type="number" 
                        step="0.1"
                        min="0.1"
                        max="1.0"
                        placeholder="Pl. 1.0 vagy 0.5"
                        defaultValue={adatlap?.munkaido_fte || ""} 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Munkaviszony típusa</Label>
                    <Select value={munkaviszonyTipusa} onValueChange={setMunkaviszonyTipusa}>
                      <SelectTrigger>
                        <SelectValue placeholder="Válassz típust..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(munkaviszonyLabels).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Munkarend</Label>
                    <Select value={munkarend} onValueChange={setMunkarend}>
                      <SelectTrigger>
                        <SelectValue placeholder="Válassz munkarendet..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(munkarendLabels).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="berkategoria">Bérkategória</Label>
                      <Input 
                        id="berkategoria" 
                        name="berkategoria" 
                        placeholder="Pl. L3"
                        defaultValue={adatlap?.berkategoria || ""} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="kozvetlen_vezeto">Közvetlen Vezető</Label>
                      <Input 
                        id="kozvetlen_vezeto" 
                        name="kozvetlen_vezeto" 
                        placeholder="Vezető neve"
                        defaultValue={adatlap?.kozvetlen_vezeto || ""} 
                      />
                    </div>
                  </div>

                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={loading}>Mégse</Button>
                  <Button type="submit" disabled={loading}>{loading ? "Mentés..." : "Mentés"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Belépés Dátuma</p>
            <p className="font-medium">{formatDate(adatlap?.belepes_datuma)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Munkaviszony típusa</p>
            <p className="font-medium">
              {munkaviszonyLabels[adatlap?.munkaviszony_tipusa] || adatlap?.munkaviszony_tipusa || "Nincs megadva"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Munkaidő (FTE)</p>
            <p className="font-medium">{adatlap?.munkaido_fte ? `${adatlap.munkaido_fte} FTE` : "Nincs megadva"}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Munkarend</p>
            <p className="font-medium">
              {munkarendLabels[adatlap?.munkarend] || adatlap?.munkarend || "Nincs megadva"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Közvetlen vezető</p>
            <p className="font-medium">{adatlap?.kozvetlen_vezeto || "Nincs megadva"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Besorolás / Bérkategória</p>
            <p className="font-medium">{adatlap?.berkategoria || "Nincs megadva"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
