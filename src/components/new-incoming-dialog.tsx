"use client"

import { useState } from "react"
import { uploadIncomingDocument } from "@/app/inbox/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlusCircle, Loader2 } from "lucide-react"

export function NewIncomingDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [erkezesModja, setErkezesModja] = useState("email")
  const [adathordozo, setAdathordozo] = useState("elektronikus_eredeti")
  const [minosites, setMinosites] = useState("nyilt")

  const erkezesModjaMap: Record<string, string> = {
    posta: "Posta",
    email: "E-mail",
    szemelyes: "Személyes",
    cegkapu: "Cégkapu",
    fax: "Fax"
  }

  const adathordozoMap: Record<string, string> = {
    elektronikus_eredeti: "E-Eredeti",
    papir_digitalizalt: "Digitalizált (Szkennelt)"
  }

  const minositesMap: Record<string, string> = {
    nyilt: "Nyílt (Normál irat)",
    belso: "Belső használatra",
    bizalmas: "Bizalmas",
    szigoruan_bizalmas: "Szigorúan Bizalmas"
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    
    try {
      const result = await uploadIncomingDocument(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    } catch (err) {
      setError("Váratlan hiba történt az érkeztetés során.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Új érkeztetés
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Új irat érkeztetése</DialogTitle>
            <DialogDescription>
              Töltsd ki a metaadatokat és csatold az irat másolatát.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm font-medium text-destructive">{error}</div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="targy">Tárgy</Label>
              <Input id="targy" name="targy" placeholder="Pl. Bérleti szerződés aláírva" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="kuldo_nev">Küldő (Partner neve)</Label>
              <Input id="kuldo_nev" name="kuldo_nev" placeholder="Kovács Kft." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="erkezes_modja">Érkezés módja</Label>
                <Select name="erkezes_modja" value={erkezesModja} onValueChange={(val) => setErkezesModja(val || "")} required>
                  <SelectTrigger id="erkezes_modja">
                    <SelectValue placeholder="Válassz...">{erkezesModjaMap[erkezesModja]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="posta" label="Posta">Posta</SelectItem>
                    <SelectItem value="email" label="E-mail">E-mail</SelectItem>
                    <SelectItem value="szemelyes" label="Személyes">Személyes</SelectItem>
                    <SelectItem value="cegkapu" label="Cégkapu">Cégkapu</SelectItem>
                    <SelectItem value="fax" label="Fax">Fax</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="adathordozo_tipus">Adathordozó</Label>
                <Select name="adathordozo_tipus" value={adathordozo} onValueChange={(val) => setAdathordozo(val || "")} required>
                  <SelectTrigger id="adathordozo_tipus">
                    <SelectValue placeholder="Válassz...">{adathordozoMap[adathordozo]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elektronikus_eredeti" label="E-Eredeti">E-Eredeti</SelectItem>
                    <SelectItem value="papir_digitalizalt" label="Digitalizált (Szkennelt)">Digitalizált (Szkennelt)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="minosites">Biztonsági Minősítés</Label>
              <Select name="minosites" value={minosites} onValueChange={(val) => setMinosites(val || "")} required>
                <SelectTrigger id="minosites">
                  <SelectValue placeholder="Válassz minősítést...">{minositesMap[minosites]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nyilt" label="Nyílt (Normál irat)">Nyílt (Normál irat)</SelectItem>
                  <SelectItem value="belso" label="Belső használatra">Belső használatra</SelectItem>
                  <SelectItem value="bizalmas" label="Bizalmas">Bizalmas</SelectItem>
                  <SelectItem value="szigoruan_bizalmas" label="Szigorúan Bizalmas">Szigorúan Bizalmas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="file">Fájl csatolása</Label>
              <Input id="file" name="file" type="file" required className="cursor-pointer" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Mégsem
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Érkeztetés
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
