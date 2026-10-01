"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Loader2, Sparkles, Briefcase, Calendar, Mail, Building2 } from "lucide-react"
import { createManualOnboarding } from "@/app/hr/onboarding/actions"
import { JobOrgSelector } from "@/components/hr/job-org-selector"
import type { OrgUnitOption, JobOption } from "@/app/hr/actions/job-org-actions"
import { toast } from "sonner"

interface AddOnboardingDialogProps {
  triggerButton?: React.ReactNode
  orgUnits?: OrgUnitOption[]
  jobs?: JobOption[]
}

const TEMPLATES = [
  {
    id: "altalanos",
    name: "Általános irodai munkatárs",
    desc: "Szerződés, NAV T1041, Munkaeszközök, Munkavédelmi oktatás, Fiók aktiválás",
  },
  {
    id: "it_fejleszto",
    name: "IT & Szoftverfejlesztő",
    desc: "Laptop & perifériák jkv-vel, VPN & GitHub, T1041, Ergonómia oktatás, Fiók aktiválás",
  },
  {
    id: "vezeto",
    name: "Vezetői / C-Level sablon",
    desc: "Vezetői szerződés & NDA, Laptop & okostelefon jkv, Aláírási címpéldány, T1041",
  },
  {
    id: "fizikai",
    name: "Fizikai / Operatív munkatárs",
    desc: "Munkaruha & EHS védőeszközök, Üzemorvosi alkalmasság, Gépkezelői oktatás, Belépőkártya",
  },
]

export function AddOnboardingDialog({ triggerButton, orgUnits, jobs }: AddOnboardingDialogProps) {
  const [open, setOpen] = useState(false)
  const [nev, setNev] = useState("")
  const [email, setEmail] = useState("")
  const [munkakor, setMunkakor] = useState("")
  const [belepesDatuma, setBelepesDatuma] = useState("")
  const [reszleg, setReszleg] = useState("")
  const [sablon, setSablon] = useState("altalanos")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nev.trim() || !email.trim() || !munkakor.trim()) {
      toast.error("Kérjük töltsd ki a kötelező mezőket (Név, E-mail, Munkakör)!")
      return
    }

    setIsLoading(true)
    try {
      const res = await createManualOnboarding({
        nev: nev.trim(),
        email: email.trim(),
        munkakor: munkakor.trim(),
        belepes_datuma: belepesDatuma || "Hamarosan",
        reszleg: reszleg.trim(),
        sablon,
      })

      if (res.error) {
        toast.error("Hiba a beléptetés indításakor", { description: res.error })
      } else {
        toast.success(`Új beléptetés elindítva: ${nev.trim()}`)
        setOpen(false)
        setNev("")
        setEmail("")
        setMunkakor("")
        setBelepesDatuma("")
        setSablon("altalanos")
      }
    } catch (err: any) {
      toast.error("Váratlan hiba történt", { description: err.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {triggerButton ? (
        <span onClick={() => setOpen(true)}>{triggerButton}</span>
      ) : (
        <Button onClick={() => setOpen(true)} className="gap-2 shadow-xs">
          <UserPlus className="h-4 w-4" />
          Új beléptetés indítása
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 flex flex-col max-h-[92vh] overflow-y-auto">
          {/* Fejléc */}
          <div className="bg-muted/40 p-6 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight">
                  Új Beléptetési Folyamat Indítása
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Közvetlen onboarding folyamat indítása sablonozott feladatlistával és kontrollált fiókkezeléssel.
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Név és E-mail */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nev" className="text-xs font-semibold">
                  Munkatárs neve <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <UserPlus className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nev"
                    placeholder="pl. Kiss Péter"
                    className="pl-9 h-9 text-sm"
                    value={nev}
                    onChange={(e) => setNev(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">
                  Kapcsolattartási E-mail <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="peter.kiss@example.com"
                    className="pl-9 h-9 text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Szervezeti Egység és Munkakör (Összekapcsolt Választó) */}
            <JobOrgSelector
              orgUnits={orgUnits}
              jobs={jobs}
              selectedOrgUnitName={reszleg}
              selectedMunkakor={munkakor}
              onOrgUnitChange={(orgName) => setReszleg(orgName)}
              onMunkakorChange={(jobTitle) => setMunkakor(jobTitle)}
              required
            />

            {/* Tervezett belépési dátum */}
            <div className="space-y-1.5">
              <Label htmlFor="belepes" className="text-xs font-semibold">
                Tervezett Belépési Dátum (Első munkanap)
              </Label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="belepes"
                  type="date"
                  className="pl-9 h-9 text-sm"
                  value={belepesDatuma}
                  onChange={(e) => setBelepesDatuma(e.target.value)}
                />
              </div>
            </div>

            {/* Sablon választó */}
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-semibold">
                Onboarding Feladat Sablon
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {TEMPLATES.map((tmpl) => {
                  const isSelected = sablon === tmpl.id
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => setSablon(tmpl.id)}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border/60 hover:border-primary/40 bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{tmpl.name}</span>
                        {isSelected && (
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                            Kiválasztva
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {tmpl.desc}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Mégse
              </Button>
              <Button type="submit" disabled={isLoading} className="gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Folyamat indítása...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Beléptetés indítása
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
