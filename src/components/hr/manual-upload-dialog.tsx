"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload } from "lucide-react"
import { toast } from "sonner"
import { uploadHrDocument } from "@/app/hr/employee/[id]/actions"

export function ManualUploadDialog({ employeeId }: { employeeId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState("")
  const [category, setCategory] = useState("Bizonyítvány")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Set the file name input to the actual file's name by default (without extension)
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
      setFileName(nameWithoutExt)
    }
  }

  const handleUpload = async (formData: FormData) => {
    const file = formData.get("file") as File
    if (!file || file.size === 0) {
      toast.error("Kérlek válassz ki egy fájlt!")
      return
    }

    formData.set("nev", fileName)
    formData.set("kategoria", category)

    setLoading(true)
    const result = await uploadHrDocument(employeeId, formData)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Dokumentum sikeresen feltöltve!")
      setOpen(false)
      // Reset form
      setFileName("")
      setCategory("Bizonyítvány")
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="gap-2" />}>
        <Upload className="w-4 h-4" />
        Fájl feltöltése
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Dokumentum Feltöltése</DialogTitle>
          <DialogDescription>
            Tölts fel hivatalos dokumentumokat (pl. bizonyítvány, orvosi igazolás, szerződés) a dolgozó profiljához.
          </DialogDescription>
        </DialogHeader>

        <form action={handleUpload} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="file">Fájl kiválasztása *</Label>
            <Input 
              id="file" 
              name="file" 
              type="file" 
              required 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nev">Dokumentum neve *</Label>
            <Input 
              id="nev" 
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Pl. Érettségi bizonyítvány"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Kategória *</Label>
            <Select value={category} onValueChange={(val) => val && setCategory(val as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Válassz kategóriát..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bizonyítvány">Bizonyítvány</SelectItem>
                <SelectItem value="Orvosi igazolás">Orvosi igazolás</SelectItem>
                <SelectItem value="Munkaszerződés">Munkaszerződés</SelectItem>
                <SelectItem value="Munkaköri leírás">Munkaköri leírás</SelectItem>
                <SelectItem value="Tájékoztató">Tájékoztató</SelectItem>
                <SelectItem value="Egyéb">Egyéb</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t mt-6">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
              Mégse
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? "Feltöltés..." : (
                <>
                  <Upload className="w-4 h-4" /> Feltöltés
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
