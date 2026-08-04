"use client"

import { useState } from "react"
import { submitApplication } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { UploadCloud, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

export function ApplicationForm({ allashirdetesId, munkakorId }: { allashirdetesId: string, munkakorId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [gdprConsent, setGdprConsent] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    
    if (!gdprConsent) {
      toast.error("Az adatkezelési tájékoztató elfogadása kötelező!")
      setIsSubmitting(false)
      return
    }

    // Alapvető validáció
    const cvFile = formData.get("cv") as File
    if (!cvFile || cvFile.size === 0) {
      toast.error("Kérjük, csatolja az önéletrajzát!")
      setIsSubmitting(false)
      return
    }

    if (cvFile.type !== "application/pdf") {
      toast.error("Az önéletrajz csak PDF formátumú lehet!")
      setIsSubmitting(false)
      return
    }

    if (cvFile.size > 5 * 1024 * 1024) {
      toast.error("A fájl mérete nem haladhatja meg az 5 MB-ot!")
      setIsSubmitting(false)
      return
    }

    try {
      formData.append("allashirdetesId", allashirdetesId)
      formData.append("munkakorId", munkakorId)
      
      const result = await submitApplication(formData)
      
      if (result.error) {
        toast.error(result.error)
      } else {
        setIsSuccess(true)
        toast.success("Sikeres jelentkezés!")
      }
    } catch (error) {
      toast.error("Váratlan hiba történt a küldés során.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="bg-green-50 text-green-800 p-8 rounded-lg text-center border border-green-200">
        <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
        <h3 className="text-2xl font-bold mb-2">Köszönjük jelentkezését!</h3>
        <p>Pályázata sikeresen beérkezett rendszerünkbe. Munkatársaink hamarosan felveszik Önnel a kapcsolatot.</p>
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border shadow-sm">
      <h3 className="text-xl font-semibold mb-4">Jelentkezési űrlap</h3>
      
      <div className="space-y-2">
        <Label htmlFor="nev">Teljes név <span className="text-red-500">*</span></Label>
        <Input id="nev" name="nev" required placeholder="Kovács János" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail cím <span className="text-red-500">*</span></Label>
        <Input id="email" name="email" type="email" required placeholder="kovacs.janos@example.com" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="telefon">Telefonszám</Label>
        <Input id="telefon" name="telefon" type="tel" placeholder="+36 30 123 4567" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="uzenet">Bemutatkozás / Motiváció (opcionális)</Label>
        <Textarea id="uzenet" name="uzenet" placeholder="Írjon néhány sort magáról..." className="min-h-[100px]" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cv">Önéletrajz feltöltése (PDF, max 5MB) <span className="text-red-500">*</span></Label>
        <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
          <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
          <Input id="cv" name="cv" type="file" accept=".pdf" className="max-w-[250px] cursor-pointer" required />
          <p className="text-xs text-muted-foreground mt-2">Csak PDF formátum elfogadott.</p>
        </div>
      </div>

      <div className="flex items-start space-x-2 pt-2">
        <Checkbox 
          id="gdpr" 
          className="mt-1 shrink-0"
          checked={gdprConsent} 
          onCheckedChange={(checked) => setGdprConsent(checked as boolean)} 
        />
        <label htmlFor="gdpr" className="text-sm font-normal leading-snug cursor-pointer text-slate-700">
          Elfogadom az{" "}
          <Dialog>
            <DialogTrigger className="text-primary hover:underline cursor-pointer bg-transparent border-none p-0 outline-none inline">
              Adatvédelmi Tájékoztatót
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adatvédelmi Tájékoztató (Toborzás)</DialogTitle>
                <DialogDescription>
                  Kérjük, olvassa el figyelmesen adatkezelési irányelveinket.
                </DialogDescription>
              </DialogHeader>
              <div className="text-sm space-y-4 text-slate-700 mt-4">
                <h4 className="font-semibold text-base text-slate-900">1. Az adatkezelés célja</h4>
                <p>A megadott személyes adatokat (név, e-mail cím, telefonszám, önéletrajz) kizárólag a kiválasztási folyamat lebonyolítása, a jelentkező értékelése és kapcsolattartás céljából kezeljük.</p>
                
                <h4 className="font-semibold text-base text-slate-900">2. Kezelt adatok köre</h4>
                <p>A jelentkezés során megadott kötelező adatok, valamint az önéletrajzban szereplő minden további önkéntesen megadott személyes adat. Rendszerünk mesterséges intelligenciát (AI) is használhat az önéletrajzából származó készségek (skillek) automatikus kinyerésére a hatékonyabb keresés érdekében.</p>

                <h4 className="font-semibold text-base text-slate-900">3. Adatkezelés időtartama</h4>
                <p>A személyes adatait a jelentkezés benyújtásától számított <strong>6 hónapig</strong> tároljuk (talent pool). Ezt követően adatai automatikusan törlésre vagy végleges anonimizálásra kerülnek, kivéve, ha Ön meghosszabbítja a hozzájárulását, vagy ha a sikeres felvételt követően munkaviszony jön létre (ez esetben a munkavállalói adatkezelés szabályai lépnek életbe).</p>

                <h4 className="font-semibold text-base text-slate-900">4. Az Ön jogai</h4>
                <p>Ön bármikor jogosult tájékoztatást kérni adatai kezeléséről, kérheti azok helyesbítését, vagy a 6 hónapos időtartam lejárta előtt is kérheti adatai azonnali törlését a rendszerből.</p>
              </div>
            </DialogContent>
          </Dialog>
          , és hozzájárulok ahhoz, hogy a cég az önéletrajzomat és a megadott adataimat a kiválasztási folyamat céljából <strong>6 hónapig</strong> kezelje. <span className="text-red-500">*</span>
        </label>
      </div>

      <div className="pt-2 text-sm text-muted-foreground">
        A "Jelentkezés beküldése" gombra kattintva Ön elfogadja az Adatkezelési Tájékoztatót.
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Beküldés folyamatban..." : "Jelentkezés beküldése"}
      </Button>
    </form>
  )
}
