"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Edit } from "lucide-react"
import { toast } from "sonner"
import { updateGeneralPersonalInfo } from "../actions"

export function GeneralPersonalInfoTab({ 
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

  const handleUpdate = async (formData: FormData) => {
    setLoading(true)
    const result = await updateGeneralPersonalInfo(employeeId, formData)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Személyes adatok frissítve!")
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
        <div>
          <CardTitle className="text-lg">Személyes Adatok</CardTitle>
          <CardDescription>A dolgozó általános elérhetőségei.</CardDescription>
        </div>
        {isHrOrAdmin && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-2`}>
              <Edit className="w-4 h-4" /> Szerkesztés
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Személyes Adatok Szerkesztése</DialogTitle>
                <DialogDescription>
                  Itt frissítheted a dolgozó általános adatait.
                </DialogDescription>
              </DialogHeader>
              <form action={handleUpdate}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="szuletesi_datum">Születési Dátum</Label>
                    <Input 
                      id="szuletesi_datum" 
                      name="szuletesi_datum" 
                      type="date" 
                      defaultValue={adatlap?.szuletesi_datum || ""} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="anyja_neve">Anyja neve</Label>
                    <Input 
                      id="anyja_neve" 
                      name="anyja_neve" 
                      placeholder="Pl. Kovács Mária"
                      defaultValue={adatlap?.anyja_neve || ""} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lakcim">Állandó Lakcím</Label>
                    <Input 
                      id="lakcim" 
                      name="lakcim" 
                      placeholder="Pl. 1111 Budapest, Fő utca 1."
                      defaultValue={adatlap?.lakcim || ""} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="telefonszam">Telefonszám</Label>
                    <Input 
                      id="telefonszam" 
                      name="telefonszam" 
                      placeholder="Pl. +36 30 123 4567"
                      defaultValue={adatlap?.telefonszam || ""} 
                    />
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
            <p className="text-sm text-muted-foreground">Születési Dátum</p>
            <p className="font-medium">{formatDate(adatlap?.szuletesi_datum)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Anyja neve</p>
            <p className="font-medium">{adatlap?.anyja_neve || "Nincs megadva"}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Állandó Lakcím</p>
            <p className="font-medium">{adatlap?.lakcim || "Nincs megadva"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Telefonszám</p>
            <p className="font-medium">{adatlap?.telefonszam || "Nincs megadva"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
