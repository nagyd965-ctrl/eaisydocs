"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { savePartner, checkPartnerDuplicate } from "@/app/partners/actions"
import { 
  Building2, Pencil, Plus, User, Briefcase, Landmark, 
  CreditCard, PhoneCall, AlertCircle, ExternalLink, Globe, CheckCircle2
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"

export interface PartnerData {
  id?: string
  nev?: string
  tipus?: string | null
  szerepkor?: string | null
  statusz?: string | null
  adoszam?: string | null
  kulfoldi_adoszam?: string | null
  cegjegyzekszam?: string | null
  email?: string | null
  telefonszam?: string | null
  cim?: string | null
  bankszamlaszam?: string | null
  fizetesi_hatarido_nap?: number | null
  fizetesi_mod?: string | null
  weboldal?: string | null
  megjegyzes?: string | null
  kapcsolattarto_nev?: string | null
  kapcsolattarto_email?: string | null
  kapcsolattarto_telefon?: string | null
  kapcsolattarto_beosztas?: string | null
}

export function PartnerDialog({ 
  partner, 
  iconOnly = false 
}: { 
  partner?: PartnerData
  iconOnly?: boolean 
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const isEditing = !!partner

  // State-ek
  const [tipus, setTipus] = useState<string>(partner?.tipus || "ceg")
  const [szerepkor, setSzerepkor] = useState<string>(partner?.szerepkor || "vevo")
  const [statusz, setStatusz] = useState<string>(partner?.statusz || "aktiv")
  const [fizetesiMod, setFizetesiMod] = useState<string>(partner?.fizetesi_mod || "atutalas")

  // Élő duplikáció ellenőrzés
  const [nevInput, setNevInput] = useState(partner?.nev || "")
  const [adoszamInput, setAdoszamInput] = useState(partner?.adoszam || "")
  const [kulfoldiInput, setKulfoldiInput] = useState(partner?.kulfoldi_adoszam || "")
  const [duplicateWarning, setDuplicateWarning] = useState<{ id: string; nev: string; reason: string } | null>(null)

  const partnerTypes = [
    { value: "ceg", label: "Cég / Gazdasági társaság", icon: Building2 },
    { value: "maganszemely", label: "Magánszemély", icon: User },
    { value: "egyeni_vallalkozo", label: "Egyéni vállalkozó (EV)", icon: Briefcase },
    { value: "intezmeny", label: "Hivatal / Intézmény / Hatóság", icon: Landmark },
  ]

  const businessRoles = [
    { value: "vevo", label: "Vevő (Ügyfél / Megrendelő)", color: "text-teal-600" },
    { value: "szallito", label: "Szállító (Beszállító / Szolgáltató)", color: "text-blue-600" },
    { value: "mindketto", label: "Mindkettő (Vevő & Szállító)", color: "text-emerald-600" },
    { value: "hatosag", label: "Hatóság / Hivatalos szerv", color: "text-purple-600" },
    { value: "bank", label: "Bank / Pénzintézet", color: "text-amber-600" },
    { value: "egyeb", label: "Egyéb partner / Alvállalkozó", color: "text-slate-600" },
  ]

  // Debounced duplikáció-ellenőrzés
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(async () => {
      if ((adoszamInput && adoszamInput.length >= 8) || (kulfoldiInput && kulfoldiInput.length >= 6) || (nevInput && nevInput.trim().length >= 4)) {
        const res = await checkPartnerDuplicate({
          nev: nevInput,
          adoszam: adoszamInput,
          kulfoldi_adoszam: kulfoldiInput,
          currentId: partner?.id,
        })
        setDuplicateWarning(res.duplicate || null)
      } else {
        setDuplicateWarning(null)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [nevInput, adoszamInput, kulfoldiInput, open, partner?.id])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set("tipus", tipus)
    formData.set("szerepkor", szerepkor)
    formData.set("statusz", statusz)
    formData.set("fizetesi_mod", fizetesiMod)

    setLoading(true)
    const result = await savePartner(formData)
    setLoading(false)

    if (result?.error) {
      toast.error("Hiba történt", { description: result.error })
    } else {
      toast.success("Sikeres mentés", { 
        description: isEditing ? "A partner adatai sikeresen módosultak." : "Az új partner sikeresen rögzítve." 
      })
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (isOpen) {
        setTipus(partner?.tipus || "ceg")
        setSzerepkor(partner?.szerepkor || "vevo")
        setStatusz(partner?.statusz || "aktiv")
        setFizetesiMod(partner?.fizetesi_mod || "atutalas")
        setNevInput(partner?.nev || "")
        setAdoszamInput(partner?.adoszam || "")
        setKulfoldiInput(partner?.kulfoldi_adoszam || "")
        setDuplicateWarning(null)
      }
    }}>
      {isEditing ? (
        iconOnly ? (
          <DialogTrigger 
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Partner szerkesztése"
          >
            <Pencil className="h-4 w-4" />
          </DialogTrigger>
        ) : (
          <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
            <Pencil className="h-3.5 w-3.5" />
            Szerkesztés
          </DialogTrigger>
        )
      ) : (
        <DialogTrigger className={cn(buttonVariants({ variant: "default" }), "gap-1.5")}>
          <Plus className="h-4 w-4" />
          Új Partner
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {isEditing ? "Partner Szerkesztése" : "Új Partner Rögzítése"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing 
              ? "Módosítsd a partner törzsadatait, üzleti szerepkörét és kapcsolattartási beállításait." 
              : "Rögzíts új ügyfelet, beszállítót vagy hivatalt a rendszer partnertörzsébe."}
          </DialogDescription>
        </DialogHeader>

        {/* Duplikáció figyelmeztető sáv */}
        {duplicateWarning && (
          <div className="mx-6 mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Lehetséges duplikátum detektálva:</span>
              <p className="mt-0.5 text-muted-foreground leading-relaxed">
                {duplicateWarning.reason} (<strong>{duplicateWarning.nev}</strong>).
              </p>
            </div>
            <Link 
              href={`/partners/${duplicateWarning.id}`} 
              target="_blank"
              className="text-[11px] font-medium underline flex items-center gap-1 shrink-0 hover:opacity-80"
            >
              Megtekintés <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {isEditing && <input type="hidden" name="id" value={partner.id} />}

          <Tabs defaultValue="alapadatok" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4 w-full h-9">
              <TabsTrigger value="alapadatok" className="text-xs">Alapadatok</TabsTrigger>
              <TabsTrigger value="penzugy" className="text-xs">Pénzügy & Feltételek</TabsTrigger>
              <TabsTrigger value="kapcsolat" className="text-xs">
                {isEditing ? "Belső feljegyzés" : "Kapcsolattartó"}
              </TabsTrigger>
            </TabsList>

            {/* 1. FÜL: ALAPADATOK */}
            <TabsContent value="alapadatok" className="space-y-4 m-0">
              
              {/* Kettős besorolás: Jogi forma és Üzleti szerepkör */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tipus" className="text-xs font-medium">Jogi / Szervezeti forma</Label>
                  <Select value={tipus} onValueChange={(val) => val && setTipus(val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Válassz típust..." />
                    </SelectTrigger>
                    <SelectContent>
                      {partnerTypes.map((t) => {
                        const Icon = t.icon
                        return (
                          <SelectItem key={t.value} value={t.value} label={t.label} className="text-xs">
                            <div className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{t.label}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="szerepkor" className="text-xs font-medium">Üzleti szerepkör</Label>
                  <Select value={szerepkor} onValueChange={(val) => val && setSzerepkor(val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Szerepkör..." />
                    </SelectTrigger>
                    <SelectContent>
                      {businessRoles.map((r) => (
                        <SelectItem key={r.value} value={r.value} label={r.label} className="text-xs">
                          <span>{r.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cégnév / Teljes név + Státusz */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="nev" className="text-xs font-medium">
                    {tipus === "maganszemely" ? "Teljes név (kötelező)" : "Cégnév / Partner megnevezése *"}
                  </Label>
                  <Input 
                    id="nev" 
                    name="nev" 
                    value={nevInput}
                    onChange={(e) => setNevInput(e.target.value)}
                    required 
                    className="h-9 text-xs"
                    placeholder={tipus === "maganszemely" ? "pl. Kovács János" : "pl. Apex Digital Kft."} 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="statusz" className="text-xs font-medium">Státusz</Label>
                  <Select value={statusz} onValueChange={(val) => val && setStatusz(val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aktiv" label="Aktív" className="text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Aktív
                        </span>
                      </SelectItem>
                      <SelectItem value="inaktiv" label="Inaktív" className="text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                          Inaktív
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Elérhetőségek: E-mail és Telefon */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium">Központi e-mail</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    defaultValue={partner?.email || ""} 
                    className="h-9 text-xs"
                    placeholder="iroda@ceg.hu" 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="telefonszam" className="text-xs font-medium">Központi telefon</Label>
                  <Input 
                    id="telefonszam" 
                    name="telefonszam" 
                    defaultValue={partner?.telefonszam || ""} 
                    className="h-9 text-xs"
                    placeholder="+36 1 234 5678" 
                  />
                </div>
              </div>

              {/* Adószámok és Cégjegyzékszám */}
              {tipus !== "maganszemely" && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="adoszam" className="text-xs font-medium">Belföldi adószám</Label>
                      <Input 
                        id="adoszam" 
                        name="adoszam" 
                        value={adoszamInput}
                        onChange={(e) => setAdoszamInput(e.target.value)}
                        className="h-9 text-xs font-mono"
                        placeholder="12345678-2-42" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="kulfoldi_adoszam" className="text-xs font-medium">Külföldi / EU adószám</Label>
                      <Input 
                        id="kulfoldi_adoszam" 
                        name="kulfoldi_adoszam" 
                        value={kulfoldiInput}
                        onChange={(e) => setKulfoldiInput(e.target.value)}
                        className="h-9 text-xs font-mono"
                        placeholder="HU12345678 / DE..." 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cegjegyzekszam" className="text-xs font-medium">
                      {tipus === "intezmeny" ? "Nyilvántartási szám / PIR" : "Cégjegyzékszám"}
                    </Label>
                    <Input 
                      id="cegjegyzekszam" 
                      name="cegjegyzekszam" 
                      defaultValue={partner?.cegjegyzekszam || ""} 
                      className="h-9 text-xs font-mono"
                      placeholder={tipus === "intezmeny" ? "Törzsszám vagy PIR azonosító" : "01-09-123456"} 
                    />
                  </div>
                </div>
              )}

              {/* Székhely / Cím */}
              <div className="space-y-1.5">
                <Label htmlFor="cim" className="text-xs font-medium">
                  {tipus === "maganszemely" ? "Lakcím / Értesítési cím" : "Székhely / Postai cím"}
                </Label>
                <Input 
                  id="cim" 
                  name="cim" 
                  defaultValue={partner?.cim || ""} 
                  className="h-9 text-xs"
                  placeholder="1052 Budapest, Fő utca 1." 
                />
              </div>

            </TabsContent>

            {/* 2. FÜL: PÉNZÜGY & FELTÉTELEK */}
            <TabsContent value="penzugy" className="space-y-4 m-0">
              <div className="space-y-1.5">
                <Label htmlFor="bankszamlaszam" className="text-xs font-medium">Bankszámlaszám (GIRO / IBAN)</Label>
                <Input 
                  id="bankszamlaszam" 
                  name="bankszamlaszam" 
                  defaultValue={partner?.bankszamlaszam || ""} 
                  className="h-9 text-xs font-mono"
                  placeholder="11700000-00000000-00000000 vagy HU..." 
                />
                <p className="text-[11px] text-muted-foreground">
                  Az eaisyBill számlaszinkronhoz és átutalásos szerződésekhez szükséges.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fizetesi_hatarido_nap" className="text-xs font-medium">Fizetési határidő (nap)</Label>
                  <Input 
                    id="fizetesi_hatarido_nap" 
                    name="fizetesi_hatarido_nap" 
                    type="number"
                    defaultValue={partner?.fizetesi_hatarido_nap ?? 8} 
                    className="h-9 text-xs"
                    min={0}
                    max={365}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fizetesi_mod" className="text-xs font-medium">Alapértelmezett fizetési mód</Label>
                  <Select value={fizetesiMod} onValueChange={(val) => val && setFizetesiMod(val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="atutalas" label="Banki átutalás" className="text-xs">Banki átutalás</SelectItem>
                      <SelectItem value="keszpenz" label="Készpénz" className="text-xs">Készpénz</SelectItem>
                      <SelectItem value="bankkartya" label="Bankkártya" className="text-xs">Bankkártya</SelectItem>
                      <SelectItem value="egyeb" label="Egyéb / Kompenzáció" className="text-xs">Egyéb / Kompenzáció</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="weboldal" className="text-xs font-medium">Weboldal / URL</Label>
                <Input 
                  id="weboldal" 
                  name="weboldal" 
                  type="url"
                  defaultValue={partner?.weboldal || ""} 
                  className="h-9 text-xs"
                  placeholder="https://cegnev.hu" 
                />
              </div>
            </TabsContent>

            {/* 3. FÜL: KAPCSOLATTARTÓ / FELJEGYZÉS */}
            <TabsContent value="kapcsolat" className="space-y-4 m-0">
              {!isEditing ? (
                <>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground leading-relaxed">
                    Itt megadhatod a partner <strong>elsődleges kapcsolattartóját</strong>. A partner mentése után további kapcsolattartók is rögzíthetők az adatlapon.
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="kapcsolattarto_nev" className="text-xs font-medium">Kapcsolattartó neve</Label>
                      <Input 
                        id="kapcsolattarto_nev" 
                        name="kapcsolattarto_nev" 
                        className="h-9 text-xs"
                        placeholder="pl. Kiss Anna" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="kapcsolattarto_beosztas" className="text-xs font-medium">Beosztás / Munkakör</Label>
                      <Input 
                        id="kapcsolattarto_beosztas" 
                        name="kapcsolattarto_beosztas" 
                        className="h-9 text-xs"
                        placeholder="pl. Pénzügyi vezető" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="kapcsolattarto_email" className="text-xs font-medium">Közvetlen e-mail</Label>
                      <Input 
                        id="kapcsolattarto_email" 
                        name="kapcsolattarto_email" 
                        type="email"
                        className="h-9 text-xs"
                        placeholder="anna.kiss@ceg.hu" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="kapcsolattarto_telefon" className="text-xs font-medium">Közvetlen telefon</Label>
                      <Input 
                        id="kapcsolattarto_telefon" 
                        name="kapcsolattarto_telefon" 
                        className="h-9 text-xs"
                        placeholder="+36 30 111 2233" 
                      />
                    </div>
                  </div>
                </>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="megjegyzes" className="text-xs font-medium">Belső megjegyzés / Adminisztratív feljegyzés</Label>
                <textarea 
                  id="megjegyzes" 
                  name="megjegyzes" 
                  rows={4}
                  defaultValue={partner?.megjegyzes || ""} 
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Belső sajátosságok, számlázási megjegyzések, ügyféli kérések..." 
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Mégse
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="gap-1.5">
              {loading ? "Mentés folyamatban..." : (isEditing ? "Módosítások mentése" : "Partner mentése")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
