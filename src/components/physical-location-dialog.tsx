"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { setPhysicalLocation, getPhysicalLocationSuggestions } from "@/app/dossiers/borrow-actions"
import { toast } from "sonner"
import {
  Archive,
  Package,
  Layers,
  Pencil,
  Trash2,
  Loader2,
  Search,
  X,
  Check,
  Plus,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface LocationComboboxProps {
  id: string
  label: string
  icon: React.ElementType
  placeholder: string
  value: string
  onChange: (value: string) => void
  options: string[]
  itemNameSingular?: string
}

function LocationCombobox({
  id,
  label,
  icon: Icon,
  placeholder,
  value,
  onChange,
  options,
  itemNameSingular = "hely",
}: LocationComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setSearch("")
    }
  }

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const q = search.trim().toLowerCase()
    return options.filter((opt) => opt.toLowerCase().includes(q))
  }, [options, search])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (filteredOptions.length === 1) {
        onChange(filteredOptions[0])
        setOpen(false)
      } else if (search.trim()) {
        onChange(search.trim())
        setOpen(false)
      }
    }
  }

  const hasExactMatch = options.some(
    (o) => o.toLowerCase() === search.trim().toLowerCase()
  )

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs font-medium flex items-center gap-1.5 text-foreground">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{label}</span>
        </Label>
        {options.length > 0 && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {options.length} korábbi {itemNameSingular}
          </span>
        )}
      </div>

      <div className="relative flex items-center">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="text-xs h-9 font-medium pr-16 bg-background border-border/80 focus-visible:border-primary"
        />

        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              title="Mező törlése"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}

          <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger
              className={cn(
                "h-7 px-1.5 flex items-center gap-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border/60 transition-colors cursor-pointer text-xs",
                open && "bg-muted text-foreground border-border/60"
              )}
              title="Meglévők böngészése és szűrése"
            >
              {options.length > 0 && (
                <span className="text-[10px] text-muted-foreground font-mono font-medium">
                  {options.length}
                </span>
              )}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-150", open && "rotate-180")} />
            </PopoverTrigger>

            <PopoverContent
              align="end"
              side="bottom"
              sideOffset={6}
              className="w-[320px] sm:w-[430px] p-0 gap-0 shadow-lg border border-border/80 z-[100] bg-popover overflow-hidden rounded-lg"
            >
              {/* Kereső fejléc */}
              <div className="p-2 border-b border-border/60 flex items-center gap-2 bg-muted/20">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder={`Szűrés a meglévő ${itemNameSingular}ek között...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/70 text-foreground"
                  autoFocus
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="h-4 w-4 flex items-center justify-center rounded text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Lista */}
              <ScrollArea className="max-h-[200px]">
                <div className="p-1 space-y-0.5">
                  {filteredOptions.length === 0 ? (
                    <div className="py-4 px-3 text-center text-xs text-muted-foreground">
                      {options.length === 0 ? (
                        <span>Még nincs korábban rögzített {itemNameSingular}. Írj be egyet közvetlenül a fenti mezőbe!</span>
                      ) : (
                        <span>Nincs találat a(z) „{search}” szűrésre.</span>
                      )}
                    </div>
                  ) : (
                    filteredOptions.map((opt) => {
                      const isSelected = value.trim().toLowerCase() === opt.trim().toLowerCase()
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            onChange(opt)
                            setOpen(false)
                          }}
                          className={cn(
                            "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-left text-xs transition-colors cursor-pointer",
                            isSelected
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{opt}</span>
                          </div>
                          {isSelected && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-primary font-medium shrink-0">
                              Kiválasztva
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              </ScrollArea>

              {/* Gyors gomb új értékhez keresés alapján */}
              {search.trim() && !hasExactMatch && (
                <div className="p-1 border-t border-border/60 bg-muted/10">
                  <button
                    type="button"
                    onClick={() => {
                      onChange(search.trim())
                      setOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer text-left"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      Használat új értékként: <strong className="font-semibold text-foreground">„{search.trim()}”</strong>
                    </span>
                  </button>
                </div>
              )}

              {/* Lábléc aktuális értékkel és törléssel */}
              {value && (
                <div className="px-2.5 py-1.5 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground truncate max-w-[260px]">
                    Aktuális: <span className="font-medium text-foreground">{value}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onChange("")
                      setOpen(false)
                    }}
                    className="text-destructive hover:underline font-medium cursor-pointer"
                  >
                    Kijelölés törlése
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}

interface PhysicalLocationDialogProps {
  iratId: string
  currentPolc?: string
  currentDoboz?: string
  currentMegjegyzes?: string
  iratTargy?: string
  canEdit?: boolean
  trigger?: React.ReactNode
}

export function PhysicalLocationDialog({ 
  iratId, 
  currentPolc, 
  currentDoboz,
  currentMegjegyzes,
  iratTargy,
  canEdit = true,
  trigger
}: PhysicalLocationDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [polc, setPolc] = useState(currentPolc || "")
  const [doboz, setDoboz] = useState(currentDoboz || "")
  const [megjegyzes, setMegjegyzes] = useState(currentMegjegyzes || "")
  const [suggestions, setSuggestions] = useState<{ polcok: string[], dobozok: string[] }>({
    polcok: [],
    dobozok: []
  })

  useEffect(() => {
    if (open) {
      setPolc(currentPolc || "")
      setDoboz(currentDoboz || "")
      setMegjegyzes(currentMegjegyzes || "")
      getPhysicalLocationSuggestions().then((res) => {
        if (res) setSuggestions(res)
      })
    }
  }, [open, currentPolc, currentDoboz, currentMegjegyzes])

  const handleSave = async () => {
    setIsLoading(true)
    const res = await setPhysicalLocation(iratId, doboz, polc, megjegyzes)
    setIsLoading(false)

    if (res.success) {
      toast.success("Fizikai irattári helyzet sikeresen mentve!")
      setOpen(false)
    } else {
      toast.error(res.error || "Hiba történt a mentés során")
    }
  }

  const handleClear = async () => {
    setIsClearing(true)
    const res = await setPhysicalLocation(iratId, "", "", "")
    setIsClearing(false)

    if (res.success) {
      toast.success("Fizikai helyzet törölve!")
      setPolc("")
      setDoboz("")
      setMegjegyzes("")
      setOpen(false)
    } else {
      toast.error(res.error || "Hiba történt a törlés során")
    }
  }

  const hasLocation = Boolean(currentPolc || currentDoboz || currentMegjegyzes)

  const defaultTrigger = hasLocation ? (
    <button
      type="button"
      onClick={() => canEdit && setOpen(true)}
      disabled={!canEdit}
      className={cn(
        "group/loc inline-flex flex-col items-start gap-0.5 px-2 py-1 rounded text-xs font-medium border transition-colors text-left",
        canEdit 
          ? "bg-muted/40 hover:bg-muted text-foreground border-border/60 hover:border-primary/40 cursor-pointer" 
          : "bg-muted/20 text-muted-foreground border-border/30 cursor-default"
      )}
      title={currentMegjegyzes ? `Megjegyzés: ${currentMegjegyzes}` : (canEdit ? "Fizikai irattári koordináták módosítása" : "Fizikai irattári koordináták")}
    >
      <div className="flex items-center gap-1.5 w-full">
        <Archive className="h-3 w-3 text-primary shrink-0" />
        <span className="truncate max-w-[200px]">
          Polc: <span className="font-semibold text-foreground">{currentPolc || "—"}</span>
          <span className="text-muted-foreground/40 mx-1">•</span>
          Doboz: <span className="font-semibold text-foreground">{currentDoboz || "—"}</span>
        </span>
        {canEdit && (
          <Pencil className="h-2.5 w-2.5 opacity-0 group-hover/loc:opacity-100 text-muted-foreground transition-opacity shrink-0 ml-auto" />
        )}
      </div>
      {currentMegjegyzes && (
        <div 
          className="text-[10px] text-muted-foreground/90 truncate max-w-[220px] pl-4.5 font-normal italic" 
          title={`Megjegyzés: ${currentMegjegyzes}`}
        >
          „{currentMegjegyzes}”
        </div>
      )}
    </button>
  ) : canEdit ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground border border-dashed border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer shrink-0"
      title="Fizikai irattári hely megadása"
    >
      <Package className="h-3 w-3 text-muted-foreground/80 shrink-0" />
      <span>+ Hely rögzítése</span>
    </button>
  ) : (
    <span className="text-xs text-muted-foreground/60 italic">Nincs rögzítve</span>
  )

  return (
    <>
      {trigger ? (
        <div onClick={() => canEdit && setOpen(true)} className="inline-block">
          {trigger}
        </div>
      ) : (
        defaultTrigger
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Archive className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Fizikai irattári elhelyezés</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Az eredeti papíralapú példány pontos fizikai tárolási koordinátái.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {iratTargy && (
            <div className="text-[11px] text-muted-foreground bg-muted/30 px-3 py-2 rounded-md border border-border/40 truncate">
              <span className="font-semibold text-foreground">Irat:</span> {iratTargy}
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* Polc / Szekrény */}
            <LocationCombobox
              id={`polc-${iratId}`}
              label="Polc / Szekrény / Állvány"
              itemNameSingular="polc"
              icon={Layers}
              placeholder="Pl. A/3 vagy Szekrény 2"
              value={polc}
              onChange={setPolc}
              options={suggestions.polcok}
            />

            {/* Doboz / Mappa */}
            <LocationCombobox
              id={`doboz-${iratId}`}
              label="Doboz / Mappa / Konténer"
              itemNameSingular="doboz"
              icon={Package}
              placeholder="Pl. D-2026/01 vagy 2026-os számlák"
              value={doboz}
              onChange={setDoboz}
              options={suggestions.dobozok}
            />

            {/* Megjegyzés */}
            <div className="space-y-1.5">
              <Label htmlFor={`megj-${iratId}`} className="text-xs font-medium text-muted-foreground">
                Részletes tárolási megjegyzés (opcionális)
              </Label>
              <Input 
                id={`megj-${iratId}`}
                value={megjegyzes}
                onChange={(e) => setMegjegyzes(e.target.value)}
                placeholder="Pl. Piros fűzőmappa, 3. rekesz"
                className="text-xs h-9 bg-background border-border/80"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t border-border/40">
            <div>
              {hasLocation && (
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm"
                  onClick={handleClear}
                  disabled={isClearing || isLoading}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs gap-1.5 h-8 px-2"
                >
                  {isClearing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  <span>Hely törlése</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setOpen(false)}
                disabled={isLoading || isClearing}
                className="text-xs h-8"
              >
                Mégse
              </Button>
              <Button 
                onClick={handleSave} 
                size="sm"
                disabled={isLoading || isClearing}
                className="text-xs h-8 gap-1.5"
              >
                {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Mentés</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
