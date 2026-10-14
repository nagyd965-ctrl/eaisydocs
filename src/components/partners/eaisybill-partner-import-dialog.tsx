"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  Building2,
  Loader2,
  CheckCircle2,
  CloudDownload,
  AlertCircle,
  Users,
  Check,
  X,
  Mail,
  MapPin,
  CreditCard,
} from "lucide-react"
import { toast } from "sonner"
import {
  getEaisyBillPartnersAction,
  importEaisyBillPartnersAction,
  type EaisyBillPartnerItem,
} from "@/app/partners/eaisybill-partner-actions"
import { cn } from "@/lib/utils"

interface EaisyBillPartnerImportDialogProps {
  onSuccess?: () => void
}

export function EaisyBillPartnerImportDialog({ onSuccess }: EaisyBillPartnerImportDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [companyName, setCompanyName] = React.useState<string>("")
  const [partners, setPartners] = React.useState<EaisyBillPartnerItem[]>([])
  const [error, setError] = React.useState<string | null>(null)
  
  // Szűrés és Keresés
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterType, setFilterType] = React.useState<"all" | "ready" | "customer" | "supplier">("all")

  // Kijelölt partnerek ID halmaza
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  // Partnerek betöltése a modál megnyitásakor
  React.useEffect(() => {
    if (!open) return

    setIsLoading(true)
    setError(null)
    setSearchQuery("")
    setFilterType("all")
    setSelectedIds(new Set())

    getEaisyBillPartnersAction()
      .then((res) => {
        if (res.success && res.partners) {
          setPartners(res.partners)
          setCompanyName(res.companyName || "")
          // Alapértelmezésben kijelöljük az összes új (még nem importált) partnert
          const readyIds = new Set(
            res.partners.filter((p) => p.status === "ready_to_import").map((p) => p.id)
          )
          setSelectedIds(readyIds)
        } else {
          setError(res.error || "Nem sikerült lekérni az eaisyBill partnereket.")
          setPartners([])
        }
      })
      .catch((err) => {
        console.error("Hiba eaisyBill partnerek lekérésekor:", err)
        setError("Váratlan hiba történt az adatok lekérésekor.")
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [open])

  // Szűrt partnerek listája
  const filteredPartners = React.useMemo(() => {
    return partners.filter((p) => {
      // 1. Típus szűrő
      if (filterType === "ready" && p.status !== "ready_to_import") return false
      if (filterType === "customer" && p.partnerType !== "customer" && p.partnerType !== "both") return false
      if (filterType === "supplier" && p.partnerType !== "supplier" && p.partnerType !== "both") return false

      // 2. Kereső kifejezés
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = p.name.toLowerCase().includes(q)
        const matchTax = (p.taxNumber || "").toLowerCase().includes(q) || (p.euTaxNumber || "").toLowerCase().includes(q)
        const matchAddress = (p.address || "").toLowerCase().includes(q)
        const matchEmail = (p.email || "").toLowerCase().includes(q)
        if (!matchName && !matchTax && !matchAddress && !matchEmail) return false
      }

      return true
    })
  }, [partners, filterType, searchQuery])

  // Statisztikák
  const totalCount = partners.length
  const readyCount = partners.filter((p) => p.status === "ready_to_import").length
  const alreadyImportedCount = partners.filter((p) => p.status === "already_imported").length
  const customerCount = partners.filter((p) => p.partnerType === "customer" || p.partnerType === "both").length
  const supplierCount = partners.filter((p) => p.partnerType === "supplier" || p.partnerType === "both").length

  // Egyedi kijelölés váltása
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Összes látható új partner kijelölése
  const handleSelectAllVisible = () => {
    const visibleReady = filteredPartners.filter((p) => p.status === "ready_to_import")
    const allSelected = visibleReady.every((p) => selectedIds.has(p.id))

    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        visibleReady.forEach((p) => next.delete(p.id))
      } else {
        visibleReady.forEach((p) => next.add(p.id))
      }
      return next
    })
  }

  // Importálás végrehajtása
  const handleImport = async () => {
    if (selectedIds.size === 0) {
      toast.warning("Legalább egy partnert ki kell jelölnöd az importáláshoz.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await importEaisyBillPartnersAction({
        partnerIds: Array.from(selectedIds),
      })

      if (res.success) {
        toast.success(`${res.importedCount || selectedIds.size} partner sikeresen importálva!`)
        setOpen(false)
        if (onSuccess) onSuccess()
      } else {
        toast.error(res.error || "Hiba történt az importálás során.")
      }
    } catch (err: unknown) {
      console.error("Import hiba:", err)
      toast.error("Váratlan hiba történt az importáláskor.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-9 gap-1.5 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 text-primary transition-colors cursor-pointer"
        )}
      >
        <CloudDownload className="h-4 w-4" />
        <span>Importálás eaisyBill-ből</span>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Fejléc */}
        <DialogHeader className="p-6 pb-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold tracking-tight">
                Partnerek importálása eaisyBill-ből
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Válaszd ki az importálni kívánt partnereket a(z) <span className="font-semibold text-foreground">{companyName || "aktív cég"}</span> eaisyBill partnertörzséből.
              </DialogDescription>
            </div>
          </div>

          {/* Gyorsstatisztika */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground flex-wrap">
            <span className="font-medium text-foreground">Összes partner az eaisyBill-ben: {totalCount}</span>
            <span>•</span>
            <span className="text-info font-medium">Új, importálható: {readyCount}</span>
            <span>•</span>
            <span className="text-success font-medium">Már importálva: {alreadyImportedCount}</span>
            <span>•</span>
            <span>Kijelölve: <strong className="text-primary tabular-nums">{selectedIds.size} db</strong></span>
          </div>
        </DialogHeader>

        {/* Kereső és szűrősáv */}
        <div className="p-4 bg-muted/20 border-b border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Keresés név, adószám, székhely vagy e-mail szerint..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Szűrő pill-ek */}
          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">
            <Button
              type="button"
              variant={filterType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("all")}
              className="h-8 text-xs px-2.5"
            >
              Mind ({totalCount})
            </Button>
            <Button
              type="button"
              variant={filterType === "ready" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("ready")}
              className="h-8 text-xs px-2.5"
            >
              Csak új ({readyCount})
            </Button>
            <Button
              type="button"
              variant={filterType === "customer" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("customer")}
              className="h-8 text-xs px-2.5"
            >
              Vevők ({customerCount})
            </Button>
            <Button
              type="button"
              variant={filterType === "supplier" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("supplier")}
              className="h-8 text-xs px-2.5"
            >
              Szállítók ({supplierCount})
            </Button>
          </div>
        </div>

        {/* Partnertáblázat */}
        <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[50vh]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
              <p className="text-sm font-medium">Partnerek betöltése az eaisyBill-ből...</p>
              <p className="text-xs text-muted-foreground mt-1">Kapcsolódás a partnertörzshöz és adategyeztetés</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mb-3" />
              <p className="text-sm font-medium text-destructive">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">Győződj meg róla, hogy a kiválasztott cég össze van kapcsolva az eaisyBill-lel.</p>
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <Building2 className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm font-medium">Nincs megjeleníthető partner a szűrési feltételek alapján.</p>
              {searchQuery && (
                <Button variant="link" size="sm" onClick={() => setSearchQuery("")} className="mt-1 text-xs">
                  Keresés törlése
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/40 sticky top-0 z-10 border-b border-border/60">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={
                        filteredPartners.filter((p) => p.status === "ready_to_import").length > 0 &&
                        filteredPartners
                          .filter((p) => p.status === "ready_to_import")
                          .every((p) => selectedIds.has(p.id))
                      }
                      onCheckedChange={handleSelectAllVisible}
                      aria-label="Összes új partner kijelölése"
                    />
                  </TableHead>
                  <TableHead className="font-semibold text-xs">Név & Székhely</TableHead>
                  <TableHead className="font-semibold text-xs w-36">Adószám</TableHead>
                  <TableHead className="font-semibold text-xs w-28">Típus</TableHead>
                  <TableHead className="font-semibold text-xs w-36 text-right">Állapot</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartners.map((partner) => {
                  const isImported = partner.status === "already_imported"
                  const isSelected = selectedIds.has(partner.id)

                  return (
                    <TableRow
                      key={partner.id}
                      className={cn(
                        "transition-colors text-xs cursor-pointer",
                        isImported ? "opacity-60 bg-muted/10 cursor-not-allowed" : isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                      )}
                      onClick={() => {
                        if (!isImported) toggleSelect(partner.id)
                      }}
                    >
                      {/* Checkbox */}
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          disabled={isImported}
                          onCheckedChange={() => toggleSelect(partner.id)}
                          aria-label={`${partner.name} kijelölése`}
                        />
                      </TableCell>

                      {/* Név & Cím */}
                      <TableCell>
                        <div className="font-medium text-foreground text-xs leading-tight">
                          {partner.name}
                        </div>
                        {partner.address && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5 truncate max-w-md">
                            <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                            <span className="truncate">{partner.address}</span>
                          </div>
                        )}
                        {partner.email && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 mt-0.5">
                            <Mail className="h-2.5 w-2.5 shrink-0 opacity-70" />
                            <span>{partner.email}</span>
                          </div>
                        )}
                      </TableCell>

                      {/* Adószám */}
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {partner.taxNumber || partner.euTaxNumber || (
                          <span className="text-muted-foreground/40 italic">Nincs megadva</span>
                        )}
                      </TableCell>

                      {/* Típus (Vevő / Szállító) */}
                      <TableCell>
                        {partner.partnerType === "customer" ? (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-medium">
                            Vevő
                          </Badge>
                        ) : partner.partnerType === "supplier" ? (
                          <Badge variant="outline" className="bg-info/10 text-info border-info/20 text-[10px] font-medium">
                            Szállító
                          </Badge>
                        ) : partner.partnerType === "both" ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px] font-medium">
                            Mindkettő
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            Partner
                          </Badge>
                        )}
                      </TableCell>

                      {/* Állapot */}
                      <TableCell className="text-right">
                        {isImported ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Már importálva
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                            Importálható
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Lábléc */}
        <DialogFooter className="p-4 border-t border-border/60 bg-muted/10 flex flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {selectedIds.size > 0 ? (
              <span>
                <strong className="text-foreground">{selectedIds.size}</strong> partner kijelölve az importálásra
              </span>
            ) : (
              <span>Nincs kijelölt partner</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Mégse
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleImport}
              disabled={isSubmitting || selectedIds.size === 0}
              className="gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Importálás folyamatban...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Importálás ({selectedIds.size})</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
