"use client"

import { useState, useTransition } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileOutput, Loader2 } from "lucide-react"
import { generateFromTemplate } from "@/app/dossiers/[id]/template-actions"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SABLONOK = [
  {
    id: "hivatalos_valasz",
    nev: "Hivatalos válaszlevél",
    description: "Formális válaszlevél bejövő iratra",
    defaultTartalom: `Tisztelt Partnerünk!

Hivatkozással a fenti tárgyú levelükre az alábbiakról tájékoztatjuk:



Kérjük szíves visszajelzésüket.`,
  },
  {
    id: "tajekoztatas",
    nev: "Tájékoztató levél",
    description: "Általános tájékoztató kimenő irat",
    defaultTartalom: `Tisztelt Címzett!

Az alábbiakról szeretnénk tájékoztatni:



Megértésüket köszönjük.`,
  },
  {
    id: "felszolitas",
    nev: "Felszólítás",
    description: "Hivatalos felszólító levél",
    defaultTartalom: `Tisztelt Partnerünk!

Felszólítjuk, hogy az alábbiaknak haladéktalanul tegyen eleget:



Amennyiben a fenti határidőig nem kapunk választ, további jogi lépéseket teszünk.`,
  },
  {
    id: "igazolas",
    nev: "Igazolás",
    description: "Hivatalos igazolás kiállítása",
    defaultTartalom: `IGAZOLÁS

Alulírott igazolom, hogy:



Kelt: ${new Date().toLocaleDateString("hu-HU")}`,
  },
  {
    id: "egyedi",
    nev: "Egyedi dokumentum",
    description: "Szabadon szerkeszthető kimenő irat",
    defaultTartalom: "",
  },
]

interface TemplateDialogProps {
  ugyiratId: string
  iktatoszam?: string
}

export function TemplateDialog({ ugyiratId, iktatoszam }: TemplateDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedSablon, setSelectedSablon] = useState("")
  const [targy, setTargy] = useState("")
  const [cimzett, setCimzett] = useState("")
  const [hivatkozas, setHivatkozas] = useState(iktatoszam || "")
  const [tartalom, setTartalom] = useState("")

  const handleSablonChange = (value: string) => {
    setSelectedSablon(value)
    const sablon = SABLONOK.find((s) => s.id === value)
    if (sablon) {
      setTartalom(sablon.defaultTartalom)
      if (!targy && sablon.id !== "egyedi") {
        setTargy(sablon.nev)
      }
    }
  }

  const handleSubmit = () => {
    const formData = new FormData()
    formData.set("targy", targy)
    formData.set("sablon_tipus", selectedSablon)
    formData.set("tartalom", tartalom)
    formData.set("cimzett", cimzett)
    formData.set("hivatkozas", hivatkozas)

    startTransition(async () => {
      const result = await generateFromTemplate(ugyiratId, formData)
      if (result.success) {
        setOpen(false)
        setTargy("")
        setCimzett("")
        setTartalom("")
        setSelectedSablon("")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        <FileOutput className="mr-2 h-3.5 w-3.5" />
        Generálás sablonból
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kimenő irat generálása sablonból</DialogTitle>
          <DialogDescription>
            Válassz sablont, töltsd ki a mezőket, és a rendszer PDF-et generál belőle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Sablon kiválasztás */}
          <div className="space-y-1.5">
            <Label>Sablon típus</Label>
            <Select value={selectedSablon} onValueChange={(val) => val && handleSablonChange(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Válassz sablont..." />
              </SelectTrigger>
              <SelectContent>
                {SABLONOK.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div>
                      <div className="font-medium">{s.nev}</div>
                      <div className="text-xs text-muted-foreground">{s.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tárgy */}
          <div className="space-y-1.5">
            <Label>Tárgy *</Label>
            <Input
              value={targy}
              onChange={(e) => setTargy(e.target.value)}
              placeholder="A kimenő irat tárgya"
            />
          </div>

          {/* Címzett */}
          <div className="space-y-1.5">
            <Label>Címzett</Label>
            <Input
              value={cimzett}
              onChange={(e) => setCimzett(e.target.value)}
              placeholder="Partner vagy szervezet neve"
            />
          </div>

          {/* Hivatkozás */}
          <div className="space-y-1.5">
            <Label>Hivatkozás</Label>
            <Input
              value={hivatkozas}
              onChange={(e) => setHivatkozas(e.target.value)}
              placeholder="Pl. iktatószám, előzmény"
            />
          </div>

          {/* Tartalom */}
          <div className="space-y-1.5">
            <Label>Tartalom *</Label>
            <Textarea
              value={tartalom}
              onChange={(e) => setTartalom(e.target.value)}
              placeholder="A levél törzs szövege..."
              rows={12}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Mégse
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !targy || !tartalom || !selectedSablon}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generálás...
              </>
            ) : (
              <>
                <FileOutput className="mr-2 h-4 w-4" />
                PDF generálása
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
