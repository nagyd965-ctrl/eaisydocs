"use client"

import { useState, useEffect, useRef } from "react"
import { uploadIncomingDocument } from "@/app/inbox/actions"
import { getPartnersLookup } from "@/app/partners/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlusCircle, Loader2, Building2, User, Check, Briefcase } from "lucide-react"
import { type PartnerSuggestion } from "@/types/documents"

export function NewIncomingDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [partners, setPartners] = useState<PartnerSuggestion[]>([])
  const [kuldoNev, setKuldoNev] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [kuldoTipus, setKuldoTipus] = useState("ceg")
  const [erkezesModja, setErkezesModja] = useState("email")
  const [adathordozo, setAdathordozo] = useState("elektronikus_eredeti")
  const [minosites, setMinosites] = useState("nyilt")

  const containerRef = useRef<HTMLDivElement>(null)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      getPartnersLookup().then(setPartners).catch(console.error)
    } else {
      setKuldoNev("")
      setShowSuggestions(false)
      setError(null)
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredPartners = kuldoNev.trim()
    ? partners.filter(p => p.nev.toLowerCase().includes(kuldoNev.toLowerCase())).slice(0, 8)
    : partners.slice(0, 8)

  const handleSelectPartner = (p: PartnerSuggestion) => {
    setKuldoNev(p.nev)
    if (p.tipus) {
      setKuldoTipus(p.tipus)
    }
    setShowSuggestions(false)
  }

  const partnerTipusMap: Record<string, string> = {
    ceg: "Cég / Gazdasági társaság",
    maganszemely: "Magánszemély",
    egyeni_vallalkozo: "Egyéni vállalkozó (EV)",
    intezmeny: "Hivatal / Intézmény"
  }

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
    } catch (_err: unknown) {
      setError("Váratlan hiba történt az érkeztetés során.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="kuldo_tipus">Küldő típusa</Label>
                <Select name="kuldo_tipus" value={kuldoTipus} onValueChange={(val) => setKuldoTipus(val || "ceg")}>
                  <SelectTrigger id="kuldo_tipus">
                    <SelectValue placeholder="Válassz típust...">{partnerTipusMap[kuldoTipus]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ceg" label="Cég / Gazdasági társaság">Cég / Gazdasági társaság</SelectItem>
                    <SelectItem value="maganszemely" label="Magánszemély">Magánszemély</SelectItem>
                    <SelectItem value="egyeni_vallalkozo" label="Egyéni vállalkozó (EV)">Egyéni vállalkozó (EV)</SelectItem>
                    <SelectItem value="intezmeny" label="Hivatal / Intézmény">Hivatal / Intézmény</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 relative" ref={containerRef}>
                <Label htmlFor="kuldo_nev">
                  {kuldoTipus === "maganszemely" ? "Küldő neve (Magánszemély)" : "Küldő cég / partner neve"}
                </Label>
                <Input 
                  id="kuldo_nev" 
                  name="kuldo_nev" 
                  value={kuldoNev}
                  onChange={(e) => {
                    setKuldoNev(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder={kuldoTipus === "maganszemely" ? "Pl. Nagy Dániel" : "Pl. Kovács Autó Kft."} 
                  autoComplete="off"
                />

                {showSuggestions && filteredPartners.length > 0 && (
                  <div className="absolute top-[100%] left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md p-1">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1 tracking-wider">
                      {kuldoNev.trim() ? "Mentett partnerek közül" : "Gyakori / Mentett partnerek"}
                    </div>
                    {filteredPartners.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPartner(p)}
                        className="w-full flex items-center justify-between text-left px-2 py-1.5 text-xs rounded hover:bg-muted/80 transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {p.tipus === "maganszemely" ? (
                            <User className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : (
                            <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                          <span className="font-medium truncate">{p.nev}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                          {p.tipus === "maganszemely" ? "Magánszemély" : "Cég"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
