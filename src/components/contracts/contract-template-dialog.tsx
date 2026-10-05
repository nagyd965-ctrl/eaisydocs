"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, Sparkles, PlusCircle } from "lucide-react"
import { toast } from "sonner"
import { ContractTemplate } from "@/types/contract-templates"
import { createCustomContractTemplateAction } from "@/app/partners/contract-actions"

interface ContractTemplateDialogProps {
  onTemplateCreated?: (newTemplate: ContractTemplate) => void
  triggerVariant?: "default" | "outline" | "secondary" | "ghost"
  triggerSize?: "default" | "sm" | "lg" | "icon"
  triggerClassName?: string
}

export function ContractTemplateDialog({
  onTemplateCreated,
  triggerVariant = "outline",
  triggerSize = "sm",
  triggerClassName,
}: ContractTemplateDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Űrlap mezők
  const [name, setName] = useState("")
  const [category, setCategory] = useState("Szolgáltatás & Megbízás")
  const [defaultTitle, setDefaultTitle] = useState("")
  const [description, setDescription] = useState("")
  const [promptPlaceholder, setPromptPlaceholder] = useState("")
  const [examplePrompt1, setExamplePrompt1] = useState("")
  const [examplePrompt2, setExamplePrompt2] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("A sablon neve kötelező!")
      return
    }

    setIsSubmitting(true)
    try {
      const examplePrompts = [examplePrompt1.trim(), examplePrompt2.trim()].filter(Boolean)

      const res = await createCustomContractTemplateAction({
        name: name.trim(),
        category: category.trim(),
        defaultTitle: defaultTitle.trim() || name.trim(),
        description: description.trim(),
        promptPlaceholder: promptPlaceholder.trim() || `pl. Rögzítsd a(z) ${name} speciális feltételeit...`,
        examplePrompts: examplePrompts.length > 0 ? examplePrompts : undefined,
      })

      if (res.success && res.template) {
        toast.success(`A(z) "${res.template.name}" szerződéssablon sikeresen létrehozva!`)
        onTemplateCreated?.(res.template)
        setOpen(false)

        // Mezők alaphelyzetbe állítása
        setName("")
        setDefaultTitle("")
        setDescription("")
        setPromptPlaceholder("")
        setExamplePrompt1("")
        setExamplePrompt2("")
      } else {
        toast.error(res.error || "Hiba történt a sablon mentésekor.")
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba történt a sablon létrehozásakor.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={triggerVariant}
            size={triggerSize}
            className={triggerClassName}
          />
        }
      >
        <Plus className="h-3.5 w-3.5 mr-1 text-primary" />
        <span>Új szerződéssablon</span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg w-[95vw] p-5 bg-background border-border">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-semibold">
              Új Egyedi Szerződéssablon Létrehozása
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Hozz létre új szerződéstípust egyedi prompt-mintákkal, amelyet az AI azonnal alkalmazni tud a generálásnál.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Sablon neve és Kategória */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tmpl-name" className="text-xs font-medium">
                Sablon megnevezése *
              </Label>
              <Input
                id="tmpl-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (!defaultTitle) setDefaultTitle(e.target.value)
                }}
                placeholder="pl. Bérleti Szerződés"
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tmpl-cat" className="text-xs font-medium">
                Kategória
              </Label>
              <Select value={category} onValueChange={(val) => val && setCategory(val)}>
                <SelectTrigger id="tmpl-cat" className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Szolgáltatás & Megbízás">Szolgáltatás & Megbízás</SelectItem>
                  <SelectItem value="Ingatlan & Bérlet">Ingatlan & Bérlet</SelectItem>
                  <SelectItem value="Kereskedelem & Értékesítés">Kereskedelem & Értékesítés</SelectItem>
                  <SelectItem value="Jogi & Védelem">Jogi & Védelem</SelectItem>
                  <SelectItem value="Munkaügy & Megbízás">Munkaügy & Megbízás</SelectItem>
                  <SelectItem value="Egyedi Szerződések">Egyedi Szerződések</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Alapértelmezett hivatalos cím */}
          <div className="space-y-1.5">
            <Label htmlFor="tmpl-title" className="text-xs font-medium">
              Alapértelmezett szerződéscím (a generált dokumentumon)
            </Label>
            <Input
              id="tmpl-title"
              value={defaultTitle}
              onChange={(e) => setDefaultTitle(e.target.value)}
              placeholder="pl. Helyiségbérleti Szerződés"
              className="text-xs h-9"
            />
          </div>

          {/* Rövid leírás */}
          <div className="space-y-1.5">
            <Label htmlFor="tmpl-desc" className="text-xs font-medium">
              Rövid leírás (a kártyán jelenik meg)
            </Label>
            <Input
              id="tmpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="pl. Irodahelyiség és raktár bérbeadására, óvadék és rezsi elszámolással."
              className="text-xs h-9"
            />
          </div>

          {/* AI Prompt Helyőrző */}
          <div className="space-y-1.5">
            <Label htmlFor="tmpl-placeholder" className="text-xs font-medium">
              Prompt helyőrző szöveg (tipp a felhasználónak)
            </Label>
            <Textarea
              id="tmpl-placeholder"
              rows={2}
              value={promptPlaceholder}
              onChange={(e) => setPromptPlaceholder(e.target.value)}
              placeholder="pl. 12 hónapos határozott idejű bérlet havi 300.000 Ft díjjal, 3 havi kaucióval..."
              className="text-xs resize-none"
            />
          </div>

          {/* Kattintható mintapromptok */}
          <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-muted/20">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Kattintható mintapromptok (gyors kitöltéshez)
            </Label>
            <Input
              value={examplePrompt1}
              onChange={(e) => setExamplePrompt1(e.target.value)}
              placeholder="1. Minta: pl. Határozatlan idejű irodabérlet 30 napos felmondási idővel..."
              className="text-xs h-8 bg-background"
            />
            <Input
              value={examplePrompt2}
              onChange={(e) => setExamplePrompt2(e.target.value)}
              placeholder="2. Minta: pl. Raktárbérleti szerződés 2 havi kaucióval és évi 5% indexálással..."
              className="text-xs h-8 bg-background"
            />
          </div>

          {/* Gombok */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Mégse
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !name.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Mentés...
                </>
              ) : (
                <>
                  <PlusCircle className="h-3.5 w-3.5" />
                  Sablon Mentése
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
