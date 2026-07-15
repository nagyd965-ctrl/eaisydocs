"use client"

import { useState } from "react"
import { fileIncomingDocument } from "@/app/inbox/filing-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, FileDown } from "lucide-react"

export function FilingDialog({ 
  irat, 
  tervek,
  ugyiratok
}: { 
  irat: any, 
  tervek: any[],
  ugyiratok: any[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<"new" | "existing">("new")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    formData.append("irat_id", irat.id)
    formData.append("mode", mode)
    
    try {
      const result = await fileIncomingDocument(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    } catch (err) {
      setError("Váratlan hiba történt az iktatás során.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <FileDown className="mr-2 h-4 w-4" />
            Iktatás
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Érkeztetett irat iktatása</DialogTitle>
            <DialogDescription>
              Érkeztetőszám: <strong>{irat.erkeztetoszam}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm font-medium text-destructive">{error}</div>
            )}
            
            <Tabs defaultValue="new" value={mode} onValueChange={(v) => setMode(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="new">Új ügyirat nyitása</TabsTrigger>
                <TabsTrigger value="existing">Meglévőhöz csatolás</TabsTrigger>
              </TabsList>
              
              <TabsContent value="new" className="space-y-4 pt-4">
                <div className="grid gap-2">
                  <Label htmlFor="prefix">Szervezeti Egység Prefix</Label>
                  <Select name="prefix" defaultValue="PENZUGY" required={mode === "new"}>
                    <SelectTrigger id="prefix">
                      <SelectValue placeholder="Válassz..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENZUGY">Pénzügy (PENZUGY)</SelectItem>
                      <SelectItem value="HR">HR és Munkaügy (HR)</SelectItem>
                      <SelectItem value="JOGI">Jogi osztály (JOGI)</SelectItem>
                      <SelectItem value="UGYFELSZOLGALAT">Ügyfélszolgálat (UGYFELSZOLGALAT)</SelectItem>
                      <SelectItem value="IT">Informatika (IT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="targy">Ügy tárgya</Label>
                  <Input id="targy" name="targy" defaultValue={irat.targy} required={mode === "new"} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="ugytipus_id">Irattári Tétel (Ügytípus)</Label>
                  <Select name="ugytipus_id" required={mode === "new"}>
                    <SelectTrigger id="ugytipus_id">
                      <SelectValue placeholder="Válassz típust..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tervek.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.tetelszam} - {t.megnevezes}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="existing" className="space-y-4 pt-4">
                <div className="grid gap-2">
                  <Label htmlFor="existing_ugyirat_id">Keresés a folyamatban lévő ügyiratok között</Label>
                  <Select name="existing_ugyirat_id" required={mode === "existing"}>
                    <SelectTrigger id="existing_ugyirat_id">
                      <SelectValue placeholder="Válassz egy meglévő ügyiratot..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ugyiratok.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.iktatoszam} - {(u.ugy as any)?.targy}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Az irat új alszámot kap a kiválasztott ügyiraton belül.</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Mégsem
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Iktatás
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
