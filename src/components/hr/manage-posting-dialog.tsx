"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { generateJobPostingWithAiAction } from "@/app/hr/recruitment/ai-posting-actions"

export interface JobOptionItem {
  id: string
  megnevezes: string
  [key: string]: unknown
}

export interface PostingFormData {
  id?: string
  cim?: string
  munkakor_id?: string
  rovid_leiras?: string | null
  reszletes_leiras?: string | null
  is_internal?: boolean
  [key: string]: unknown
}

export function ManagePostingDialog({ 
  jobs, 
  existingData = null, 
  onSaved, 
  children 
}: { 
  jobs: JobOptionItem[]
  existingData?: PostingFormData | null
  onSaved: (data: PostingFormData) => void
  children?: React.ReactNode 
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [cim, setCim] = useState(existingData?.cim || "")
  const [munkakorId, setMunkakorId] = useState<string>(existingData?.munkakor_id || "")
  const [rovidLeiras, setRovidLeiras] = useState(existingData?.rovid_leiras || "")
  const [reszletesLeiras, setReszletesLeiras] = useState(existingData?.reszletes_leiras || "")
  const [isInternal, setIsInternal] = useState<boolean>(existingData?.is_internal || false)

  // Külön felugró AI ablak állapota
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiInstructions, setAiInstructions] = useState("")
  const [aiGenerating, setAiGenerating] = useState(false)
  
  const isEditing = !!existingData
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      setCim(existingData?.cim || "")
      setMunkakorId(existingData?.munkakor_id || "")
      setRovidLeiras(existingData?.rovid_leiras || "")
      setReszletesLeiras(existingData?.reszletes_leiras || "")
      setIsInternal(existingData?.is_internal || false)
      setIsAiModalOpen(false)
      setAiInstructions("")
    }
  }, [open, existingData])

  function handleOpenAiModal() {
    if (!cim.trim()) {
      toast.error("Kérlek, először add meg a hirdetés nyilvános címét a felső mezőben!")
      return
    }
    setAiInstructions("")
    setIsAiModalOpen(true)
  }

  async function handleGenerateWithAi() {
    if (!cim.trim()) {
      toast.error("Kérlek, add meg a hirdetés nyilvános címét!")
      return
    }

    setAiGenerating(true)
    try {
      const selectedJobName = jobs.find(j => j.id === munkakorId)?.megnevezes
      const result = await generateJobPostingWithAiAction({
        cim: cim.trim(),
        munkakorNev: selectedJobName,
        instructions: aiInstructions.trim(),
      })

      if (!result.success) {
        toast.error(result.error || "Hiba történt a generálás során.")
        return
      }

      if (result.reszletes_leiras) {
        setReszletesLeiras(result.reszletes_leiras)
      }
      if (result.rovid_leiras && !rovidLeiras.trim()) {
        setRovidLeiras(result.rovid_leiras)
      }

      toast.success("Álláshirdetés sikeresen legenerálva és beillesztve!")
      setIsAiModalOpen(false)
    } catch (err: unknown) {
      console.error(err)
      toast.error("Váratlan hiba történt az AI generáláskor.")
    } finally {
      setAiGenerating(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const data = {
      cim: cim.trim(),
      munkakor_id: munkakorId,
      rovid_leiras: rovidLeiras.trim(),
      reszletes_leiras: reszletesLeiras.trim(),
      is_internal: isInternal,
    }

    if (!data.cim || !data.munkakor_id) {
      toast.error("Cím és Munkakör megadása kötelező!")
      setLoading(false)
      return
    }

    try {
      if (isEditing) {
        const { data: updated, error } = await supabase
          .from("hr_allashirdetes")
          .update(data)
          .eq("id", existingData.id)
          .select()
          .single()
          
        if (error) throw error
        toast.success("Álláshirdetés módosítva")
        onSaved(updated)
      } else {
        const { data: inserted, error } = await supabase
          .from("hr_allashirdetes")
          .insert(data)
          .select()
          .single()
          
        if (error) throw error
        toast.success("Új álláshirdetés létrehozva")
        onSaved(inserted)
      }
      setOpen(false)
    } catch (error: unknown) {
      toast.error("Hiba történt a mentés során")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={
          children ? (
            children as React.ReactElement
          ) : (
            <Button>Új hirdetés feladása</Button>
          )
        } />
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Álláshirdetés módosítása" : "Új Álláshirdetés feladása"}</DialogTitle>
            <DialogDescription>
              Töltsd ki az adatokat a publikus karrieroldalhoz. A publikálást a listában tudod majd bekapcsolni.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="cim">Hirdetés Nyilvános Címe <span className="text-destructive">*</span></Label>
              <Input 
                id="cim" 
                name="cim" 
                required 
                value={cim} 
                onChange={(e) => setCim(e.target.value)} 
                placeholder="pl. Senior Full-Stack Fejlesztő" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="munkakor_id">Belső Munkakör <span className="text-destructive">*</span></Label>
              <Select name="munkakor_id" value={munkakorId} onValueChange={(val) => val && setMunkakorId(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Válassz munkakört...">
                    {jobs.find(j => j.id === munkakorId)?.megnevezes}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {jobs.map(job => (
                    <SelectItem key={job.id} value={job.id} label={job.megnevezes}>{job.megnevezes}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">A jelentkezők ehhez a belső munkakörhöz fognak tartozni.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rovid_leiras">Rövid leírás (Kártyán jelenik meg)</Label>
              <Textarea 
                id="rovid_leiras" 
                name="rovid_leiras" 
                value={rovidLeiras} 
                onChange={(e) => setRovidLeiras(e.target.value)} 
                placeholder="1-2 mondatos kedvcsináló a kártyákhoz..." 
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="reszletes_leiras">Részletes leírás (HTML vagy Markdown)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAiModal}
                  className="h-7 text-xs font-medium text-primary hover:text-primary gap-1.5 px-2.5 border-primary/30 hover:bg-primary/5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Generálás AI-val</span>
                </Button>
              </div>

              <Textarea 
                id="reszletes_leiras" 
                name="reszletes_leiras" 
                value={reszletesLeiras} 
                onChange={(e) => setReszletesLeiras(e.target.value)} 
                className="min-h-[160px] font-mono text-xs leading-relaxed"
                placeholder="Elvárások, feladatok, juttatások..." 
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3.5 transition-colors hover:border-border">
              <div className="space-y-0.5 pr-4 text-left">
                <Label htmlFor="is_internal" className="text-sm font-medium text-foreground cursor-pointer">
                  Csak Belső Hirdetés
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ha be van kapcsolva, a hirdetés kizárólag a belépett munkatársak számára látható, a publikus karrieroldalról rejtve marad.
                </p>
              </div>
              <Switch
                id="is_internal"
                checked={isInternal}
                onCheckedChange={setIsInternal}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" className="mr-2" onClick={() => setOpen(false)}>Mégsem</Button>
              <Button type="submit" disabled={loading}>{loading ? "Mentés..." : (isEditing ? "Módosítás" : "Létrehozás")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Külön felugró kis AI Hirdetésíró ablak */}
      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="w-4 h-4 text-primary" />
              Álláshirdetés Generálása AI-val
            </DialogTitle>
            <DialogDescription>
              A pozíció címe és szakterülete alapján a Google Gemini automatikusan összeállítja a strukturált hirdetést.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Kontextus kártya */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pozíció megnevezése:</span>
                <span className="font-semibold text-foreground text-right">{cim || "–"}</span>
              </div>
              {munkakorId && (
                <div className="flex items-center justify-between border-t border-border/40 pt-1.5">
                  <span className="text-muted-foreground">Belső munkakör:</span>
                  <span className="font-medium text-foreground text-right">
                    {jobs.find(j => j.id === munkakorId)?.megnevezes}
                  </span>
                </div>
              )}
            </div>

            {/* Egyedi szempontok */}
            <div className="space-y-2">
              <Label htmlFor="ai_instructions" className="text-xs font-medium text-foreground">
                Egyedi szempontok vagy elvárások (opcionális):
              </Label>
              <Textarea
                id="ai_instructions"
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                placeholder="pl. 4 év tapasztalat, React + Node.js, heti 2 nap home office, cafeteria, összetartó csapat..."
                className="min-h-[90px] text-xs leading-relaxed"
                disabled={aiGenerating}
              />
              <p className="text-[11px] text-muted-foreground">
                Ha üresen hagyod, az AI automatikusan az iparági standardnak megfelelő leírást állítja össze.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAiModalOpen(false)}
              disabled={aiGenerating}
            >
              Mégsem
            </Button>
            <Button
              type="button"
              onClick={handleGenerateWithAi}
              disabled={aiGenerating}
              className="gap-1.5 bg-primary text-primary-foreground font-medium"
            >
              {aiGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI fogalmazza a hirdetést...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Hirdetés elkészítése</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
