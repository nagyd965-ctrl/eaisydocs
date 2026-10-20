"use client"

import * as React from "react"
import { 
  Search, 
  X, 
  Check, 
  FolderGit2, 
  ChevronDown, 
  Sparkles
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface DossierOption {
  id: string
  iktatoszam: string
  statusz?: string
  iktatas_datuma?: string
  ugy?: {
    targy?: string | null
    [key: string]: unknown
  } | null
  irat?: Array<{
    id?: string
    targy?: string | null
    leiras?: string | null
    erkeztetoszam?: string | null
    partner?: {
      id?: string
      nev?: string | null
      adoszam?: string | null
    } | null
  }> | null
  [key: string]: unknown
}

interface DossierSearchSelectorProps {
  ugyiratok: DossierOption[]
  value: string
  onChange: (ugyiratId: string) => void
  currentPartnerName?: string
  currentDocSubject?: string
  currentReferenceNum?: string
  disabled?: boolean
  className?: string
}

type CategoryType = "all" | "penzugy" | "szerzodes" | "hr" | "egyeb"

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

function getDossierCategory(iktatoszam: string, targy?: string | null): CategoryType {
  const normPrefix = (iktatoszam || "").toUpperCase()
  const normTargy = normalizeText(targy || "")

  if (
    normPrefix.startsWith("PENZUGY") ||
    normPrefix.startsWith("SZAMLA") ||
    normTargy.includes("szamla") ||
    normTargy.includes("nyugta") ||
    normTargy.includes("bizonylat") ||
    normTargy.includes("dijbekero") ||
    normTargy.includes("invoice")
  ) {
    return "penzugy"
  }

  if (
    normPrefix.startsWith("SZERZ") ||
    normTargy.includes("szerzodes") ||
    normTargy.includes("megallapodas") ||
    normTargy.includes("nda") ||
    normTargy.includes("contract")
  ) {
    return "szerzodes"
  }

  if (
    normPrefix.startsWith("HR") ||
    normTargy.includes("szemelyi") ||
    normTargy.includes("munkaviszony") ||
    normTargy.includes("dolgozo")
  ) {
    return "hr"
  }

  return "egyeb"
}

function getCategoryBadge(category: CategoryType) {
  switch (category) {
    case "penzugy":
      return {
        label: "Pénzügy",
        pillLabel: "Számlák",
        badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
      }
    case "szerzodes":
      return {
        label: "Szerződés",
        pillLabel: "Szerződések",
        badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25",
      }
    case "hr":
      return {
        label: "HR",
        pillLabel: "HR",
        badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/25",
      }
    default:
      return {
        label: "Általános",
        pillLabel: "Egyéb",
        badgeClass: "bg-muted text-muted-foreground border-border",
      }
  }
}

export function DossierSearchSelector({
  ugyiratok = [],
  value,
  onChange,
  currentPartnerName,
  disabled = false,
  className,
}: DossierSearchSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState<CategoryType>("all")
  
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [triggerWidth, setTriggerWidth] = React.useState<number | undefined>(undefined)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Trigger szélesség mérése
  React.useEffect(() => {
    if (open && triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth)
    }
  }, [open])

  // Fókusz a keresőmezőre nyitáskor
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 60)
      return () => clearTimeout(timer)
    } else {
      setSearchQuery("")
      setCategoryFilter("all")
    }
  }, [open])

  // Aktuálisan kiválasztott ügyirat
  const selectedDossier = React.useMemo(() => {
    return ugyiratok.find((u) => u.id === value) || null
  }, [ugyiratok, value])

  const selectedTargy = React.useMemo(() => {
    if (!selectedDossier) return ""
    return Array.isArray(selectedDossier.ugy)
      ? selectedDossier.ugy[0]?.targy
      : selectedDossier.ugy?.targy || ""
  }, [selectedDossier])

  // Kategóriánkénti darabszámok
  const categoryCounts = React.useMemo(() => {
    const counts = { all: ugyiratok.length, penzugy: 0, szerzodes: 0, hr: 0, egyeb: 0 }
    for (const u of ugyiratok) {
      const targyStr = Array.isArray(u.ugy) ? u.ugy[0]?.targy : u.ugy?.targy
      const cat = getDossierCategory(u.iktatoszam, targyStr)
      counts[cat]++
    }
    return counts
  }, [ugyiratok])

  // Szűrt lista előállítása
  const filteredDossiers = React.useMemo(() => {
    const normQ = normalizeText(searchQuery)

    return ugyiratok.filter((u) => {
      const targyStr = Array.isArray(u.ugy) ? u.ugy[0]?.targy : u.ugy?.targy
      const cat = getDossierCategory(u.iktatoszam, targyStr)

      // Kategória szűrő
      if (categoryFilter !== "all" && cat !== categoryFilter) {
        return false
      }

      // Keresőszó szűrő
      if (!normQ) return true

      // Iktatószám
      if (normalizeText(u.iktatoszam).includes(normQ)) return true

      // Ügy tárgy
      if (targyStr && normalizeText(targyStr).includes(normQ)) return true

      // Iratok és partner adatok
      if (u.irat && Array.isArray(u.irat)) {
        for (const ir of u.irat) {
          if (ir.targy && normalizeText(ir.targy).includes(normQ)) return true
          if (ir.leiras && normalizeText(ir.leiras).includes(normQ)) return true
          if (ir.erkeztetoszam && normalizeText(ir.erkeztetoszam).includes(normQ)) return true
          if (ir.partner?.nev && normalizeText(ir.partner.nev).includes(normQ)) return true
          if (ir.partner?.adoszam && normalizeText(ir.partner.adoszam).includes(normQ)) return true
        }
      }

      return false
    })
  }, [ugyiratok, searchQuery, categoryFilter])

  // Küldő partnerhez kapcsolódó ügyiratok javaslata
  const partnerMatchedDossiers = React.useMemo(() => {
    if (!currentPartnerName || !currentPartnerName.trim()) return []
    const normPartner = normalizeText(currentPartnerName)
    if (normPartner.length < 3) return []

    return ugyiratok.filter((u) => {
      const targyStr = Array.isArray(u.ugy) ? u.ugy[0]?.targy : u.ugy?.targy
      if (targyStr && normalizeText(targyStr).includes(normPartner)) return true

      if (u.irat && Array.isArray(u.irat)) {
        for (const ir of u.irat) {
          if (ir.partner?.nev && normalizeText(ir.partner.nev).includes(normPartner)) return true
        }
      }
      return false
    })
  }, [ugyiratok, currentPartnerName])

  const handleSelect = (dossierId: string) => {
    onChange(dossierId)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange("")
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <input type="hidden" name="existing_ugyirat_id" value={value} />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          ref={triggerRef}
          type="button"
          disabled={disabled}
          className={cn(
            "w-full h-10 flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left outline-none transition-colors cursor-pointer text-xs sm:text-sm bg-background",
            value
              ? "border-primary/50 bg-primary/5 hover:border-primary text-foreground"
              : "border-border/80 hover:border-primary/50 hover:bg-muted/30 text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed pointer-events-none"
          )}
        >
          {selectedDossier ? (
            <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
              {(() => {
                const cat = getDossierCategory(selectedDossier.iktatoszam, selectedTargy)
                const { label, badgeClass } = getCategoryBadge(cat)
                return (
                  <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border shrink-0", badgeClass)}>
                    {label}
                  </span>
                )
              })()}
              <span className="font-mono font-semibold text-xs text-foreground shrink-0">
                {selectedDossier.iktatoszam}
              </span>
              <span className="truncate text-xs text-foreground/80 font-medium">
                — {selectedTargy || "Cím nélküli ügyirat"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground truncate flex-1">
              <FolderGit2 className="h-4 w-4 shrink-0 text-muted-foreground/70" />
              <span className="truncate">Válassz meglévő ügyiratot...</span>
            </div>
          )}

          <div className="flex items-center gap-1 shrink-0 ml-1 text-muted-foreground">
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation()
                    onChange("")
                  }
                }}
                title="Kiválasztás törlése"
                className="p-1 hover:text-foreground hover:bg-muted/80 rounded transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
          </div>
        </PopoverTrigger>

        <PopoverContent 
          align="start" 
          sideOffset={4}
          style={{ width: triggerWidth ? `${triggerWidth}px` : "auto" }}
          className="p-0 shadow-lg border border-border/80 bg-popover rounded-lg overflow-hidden z-50 min-w-[320px] max-w-[560px]"
        >
          {/* 1. Keresőmező (pontosan mint a cégválasztó 3. képén) */}
          <div className="p-2 border-b border-border/60 flex items-center gap-2 bg-background">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-0.5" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Ügyirat, számla vagy partner keresése..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* 2. Gyors kategória szűrőchipek */}
          <div className="px-2 py-1.5 border-b border-border/40 flex items-center gap-1 overflow-x-auto bg-muted/20 text-[10px]">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={cn(
                "px-2 py-0.5 rounded font-medium transition-colors shrink-0 cursor-pointer",
                categoryFilter === "all"
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              Mind ({categoryCounts.all})
            </button>
            {categoryCounts.penzugy > 0 && (
              <button
                type="button"
                onClick={() => setCategoryFilter("penzugy")}
                className={cn(
                  "px-2 py-0.5 rounded font-medium transition-colors shrink-0 cursor-pointer",
                  categoryFilter === "penzugy"
                    ? "bg-emerald-600 text-white font-semibold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                Számlák ({categoryCounts.penzugy})
              </button>
            )}
            {categoryCounts.szerzodes > 0 && (
              <button
                type="button"
                onClick={() => setCategoryFilter("szerzodes")}
                className={cn(
                  "px-2 py-0.5 rounded font-medium transition-colors shrink-0 cursor-pointer",
                  categoryFilter === "szerzodes"
                    ? "bg-blue-600 text-white font-semibold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                Szerződések ({categoryCounts.szerzodes})
              </button>
            )}
            {categoryCounts.hr > 0 && (
              <button
                type="button"
                onClick={() => setCategoryFilter("hr")}
                className={cn(
                  "px-2 py-0.5 rounded font-medium transition-colors shrink-0 cursor-pointer",
                  categoryFilter === "hr"
                    ? "bg-purple-600 text-white font-semibold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                HR ({categoryCounts.hr})
              </button>
            )}
          </div>

          {/* 3. Partnerhez illeszkedő javaslat (ha van) */}
          {!searchQuery && categoryFilter === "all" && partnerMatchedDossiers.length > 0 && (
            <div className="px-2.5 py-1 bg-amber-500/10 border-b border-amber-500/20 text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1 font-medium">
              <Sparkles className="h-3 w-3 shrink-0" />
              <span className="truncate">Javasolt a küldő partnerhez ({currentPartnerName}):</span>
            </div>
          )}

          {/* 4. Letisztult lista (pontosan mint a cégválasztó 3. képén: 2 sor, kompakt, jobb oldali zöld pipa) */}
          <div className="overflow-y-auto max-h-[240px] p-1 divide-y divide-border/20">
            {filteredDossiers.length === 0 ? (
              <div className="py-5 text-center text-xs text-muted-foreground">
                Nincs találat a keresési feltételekre
              </div>
            ) : (
              filteredDossiers.map((u) => {
                const targyStr = Array.isArray(u.ugy) ? u.ugy[0]?.targy : u.ugy?.targy
                const cat = getDossierCategory(u.iktatoszam, targyStr)
                const { label: badgeLabel, badgeClass } = getCategoryBadge(cat)
                const isSelected = u.id === value

                // Kapcsolódó partner és számlaszám adatok
                const firstIrat = u.irat && u.irat.length > 0 ? u.irat[0] : null
                const partnerNev = u.irat?.find((ir) => ir.partner?.nev)?.partner?.nev
                const refNum = firstIrat?.erkeztetoszam || ""

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelect(u.id)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-left transition-colors cursor-pointer",
                      isSelected
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted text-foreground text-xs"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      {/* Felső sor: Kategória jelvény + Iktatószám + Tárgy */}
                      <div className="text-xs truncate font-medium flex items-center gap-1.5">
                        <span className={cn("text-[9px] font-mono px-1 py-0.2 rounded border font-semibold shrink-0 uppercase", badgeClass)}>
                          {badgeLabel}
                        </span>
                        <span className="font-mono font-semibold text-foreground text-xs shrink-0">
                          {u.iktatoszam}
                        </span>
                        <span className="text-foreground/90 truncate text-xs">
                          — {targyStr || "Névtelen ügyirat"}
                        </span>
                      </div>

                      {/* Második sor (mint a cégválasztónál az adószám): partner és részletek */}
                      <div className="text-[10px] text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
                        {partnerNev && <span className="truncate">{partnerNev}</span>}
                        {refNum && <span>• {refNum}</span>}
                        {u.irat && u.irat.length > 1 && (
                          <span>• {u.irat.length} irat a dossziéban</span>
                        )}
                      </div>
                    </div>

                    {/* Jobb oldali zöld pipa - KIZÁRÓLAG ha ki van választva (mint a 3. képen) */}
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary shrink-0 ml-1" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Diszkrét, letisztult megerősítő felirat a választó alatt */}
      {selectedDossier ? (
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
          ✓ Alszámként csatolva ide: <span className="font-mono font-semibold">{selectedDossier.iktatoszam}</span>
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Válassz ki egy meglévő ügyiratot, amelyhez ezt a dokumentumot alszámként csatolni szeretnéd.
        </p>
      )}
    </div>
  )
}
