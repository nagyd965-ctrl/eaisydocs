"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Trash2, CalendarClock } from "lucide-react"
import { toast } from "sonner"
import { saveSubstitute, deleteSubstitute } from "@/app/hr/self-service/actions"
import { Badge } from "@/components/ui/badge"

interface SubstituteSettingsCardProps {
  availableUsers: any[]
  currentSubstitute: any | null
}

export function SubstituteSettingsCard({ availableUsers, currentSubstitute }: SubstituteSettingsCardProps) {
  const [loading, setLoading] = useState(false)
  const [helyettesId, setHelyettesId] = useState(currentSubstitute?.helyettes_id || "")

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    formData.set("helyettes_id", helyettesId)
    
    const result = await saveSubstitute(formData)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Helyettesítés sikeresen mentve!")
    }
  }

  const handleDelete = async () => {
    if (!currentSubstitute) return
    setLoading(true)
    const result = await deleteSubstitute(currentSubstitute.id)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Helyettesítés törölve!")
      setHelyettesId("")
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-primary" /> Helyettesítés
        </CardTitle>
        <CardDescription>
          Állítsd be, ki hagyja jóvá a kérelmeket helyetted, amíg távol vagy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {currentSubstitute ? (
          <div className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-md border text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Aktív helyettes:</span>
                <span className="font-medium">{currentSubstitute.helyettes_profil?.nev}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Időszak:</span>
                <Badge variant="secondary" className="font-normal">
                  {new Date(currentSubstitute.kezdet_datuma).toLocaleDateString("hu-HU")} - {new Date(currentSubstitute.veg_datuma).toLocaleDateString("hu-HU")}
                </Badge>
              </div>
            </div>
            <Button variant="destructive" size="sm" className="w-full" onClick={handleDelete} disabled={loading}>
              <Trash2 className="w-4 h-4 mr-2" />
              Törlés
            </Button>
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Helyettes személye</Label>
              <Select value={helyettesId} onValueChange={setHelyettesId}>
                <SelectTrigger>
                  <SelectValue placeholder="Válassz egy kollégát...">
                    {helyettesId
                      ? (availableUsers.find((u) => u.id === helyettesId)?.nev ?? "Válassz egy kollégát...")
                      : "Válassz egy kollégát..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nev}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="kezdet">Kezdete</Label>
                <Input type="date" id="kezdet" name="kezdet_datuma" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="veg">Vége</Label>
                <Input type="date" id="veg" name="veg_datuma" required />
              </div>
            </div>

            <Button type="submit" size="sm" className="w-full" disabled={loading || !helyettesId}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Mentés..." : "Mentés"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
