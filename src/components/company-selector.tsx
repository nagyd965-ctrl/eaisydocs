"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  KeyRound,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Pencil,
} from "lucide-react"
import { useCompany } from "@/contexts/company-context"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { isHungarianTaxNumber, cleanTaxNumber } from "@/utils/tax-number"
import {
  createCompanyAction,
  updateCompanyAction,
  joinCompanyByTokenAction,
} from "@/app/actions/company-actions"
import { toast } from "sonner"
import type { Company } from "@/types/company"

export function CompanySelector() {
  const router = useRouter()
  const {
    companies,
    selectedCompany,
    setSelectedCompany,
    isSwitching,
    setCompaniesList,
    updateCompanyInState,
  } = useCompany()

  const [popoverOpen, setPopoverOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Cég hozzáadás modál (létrehozás + csatlakozás fülekkel)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [createTab, setCreateTab] = React.useState<"create" | "join">("create")

  // Új cég form állapot
  const [newCountry, setNewCountry] = React.useState<"HU" | "HR">("HU")
  const [newName, setNewName] = React.useState("")
  const [newTaxNumber, setNewTaxNumber] = React.useState("")
  const [newAddress, setNewAddress] = React.useState("")
  const [newRepresentative, setNewRepresentative] = React.useState("")
  const [newPhone, setNewPhone] = React.useState("")
  const [isCreating, setIsCreating] = React.useState(false)

  // Csatlakozás form állapot
  const [joinToken, setJoinToken] = React.useState("")
  const [isJoining, setIsJoining] = React.useState(false)

  // Cég szerkesztése modál állapot (mindig a meglévő kiválasztott céget szerkeszti)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [editCountry, setEditCountry] = React.useState<"HU" | "HR">("HU")
  const [editName, setEditName] = React.useState("")
  const [editTaxNumber, setEditTaxNumber] = React.useState("")
  const [editAddress, setEditAddress] = React.useState("")
  const [editRepresentative, setEditRepresentative] = React.useState("")
  const [editPhone, setEditPhone] = React.useState("")
  const [editFilingPrefix, setEditFilingPrefix] = React.useState("DOCS")
  const [isUpdating, setIsUpdating] = React.useState(false)

  // Szűrt céglista
  const filteredCompanies = React.useMemo(() => {
    if (!searchQuery.trim()) return companies
    const q = searchQuery.toLowerCase().trim()
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.tax_number && c.tax_number.toLowerCase().includes(q))
    )
  }, [companies, searchQuery])

  // Új cég adószám validáció élő jelzése
  const isNewTaxValid = React.useMemo(() => {
    if (!newTaxNumber.trim()) return null
    return isHungarianTaxNumber(newTaxNumber)
  }, [newTaxNumber])

  // Szerkesztett cég adószám validáció élő jelzése
  const isEditTaxValid = React.useMemo(() => {
    if (!editTaxNumber.trim()) return null
    return isHungarianTaxNumber(editTaxNumber)
  }, [editTaxNumber])

  const handleSelect = async (company: Company) => {
    setPopoverOpen(false)
    await setSelectedCompany(company)
  }

  // Szerkesztés modál megnyitása a kiválasztott cég adataival
  const openEditDialog = (company: Company | null) => {
    if (!company) return
    setEditName(company.name || "")
    setEditTaxNumber(company.tax_number || "")
    setEditAddress(company.address || "")
    setEditRepresentative(company.representative_name || "")
    setEditPhone(company.phone || "")
    setEditCountry((company.country_code as "HU" | "HR") || "HU")
    setEditFilingPrefix(company.filing_prefix || "DOCS")
    setEditDialogOpen(true)
  }

  // Cég adatainak frissítése
  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany) return

    if (!editName.trim()) {
      toast.error("A cégnév megadása kötelező")
      return
    }

    setIsUpdating(true)
    try {
      const cleanedTax = editTaxNumber.trim() ? cleanTaxNumber(editTaxNumber) : null
      const cleanPrefix = editFilingPrefix.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "") || "DOCS"
      const res = await updateCompanyAction(selectedCompany.id, {
        name: editName.trim(),
        tax_number: cleanedTax,
        address: editAddress.trim() || null,
        representative_name: editRepresentative.trim() || null,
        phone: editPhone.trim() || null,
        country_code: editCountry,
        filing_prefix: cleanPrefix,
      })

      if (res.success) {
        toast.success("Cég adatai sikeresen módosítva")
        const updatedCompany: Company = {
          ...selectedCompany,
          name: editName.trim(),
          tax_number: cleanedTax,
          address: editAddress.trim() || null,
          representative_name: editRepresentative.trim() || null,
          phone: editPhone.trim() || null,
          country_code: editCountry,
          filing_prefix: cleanPrefix,
          updated_at: new Date().toISOString(),
        }

        updateCompanyInState(updatedCompany)
        setEditDialogOpen(false)
        router.refresh()
      } else {
        toast.error(res.error || "Hiba történt a cég frissítésekor")
      }
    } catch {
      toast.error("Váratlan hiba történt a cég módosítása során")
    } finally {
      setIsUpdating(false)
    }
  }

  // Új cég létrehozása
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) {
      toast.error("A cégnév megadása kötelező")
      return
    }

    setIsCreating(true)
    try {
      const res = await createCompanyAction({
        name: newName.trim(),
        taxNumber: newTaxNumber.trim() || undefined,
        address: newAddress.trim() || undefined,
        representativeName: newRepresentative.trim() || undefined,
        phone: newPhone.trim() || undefined,
        countryCode: newCountry,
      })

      if (res.success && res.company) {
        toast.success(`Cég sikeresen létrehozva: ${res.company.name}`)
        setCreateDialogOpen(false)
        setNewName("")
        setNewTaxNumber("")
        setNewAddress("")
        setNewRepresentative("")
        setNewPhone("")
        setNewCountry("HU")

        setCompaniesList([...companies, res.company])
        await setSelectedCompany(res.company)
      } else {
        toast.error(res.error || "Hiba történt a cég létrehozásakor")
      }
    } catch {
      toast.error("Váratlan hiba történt")
    } finally {
      setIsCreating(false)
    }
  }

  // Csatlakozás kód alapján
  const handleJoinCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinToken.trim()) {
      toast.error("Kérjük, add meg a meghívó kódot")
      return
    }

    setIsJoining(true)
    try {
      const res = await joinCompanyByTokenAction(joinToken.trim())
      if (res.success) {
        toast.success(`Sikeresen csatlakoztál a céghez: ${res.companyName || ""}`)
        setJoinDialogOpen(false)
        setJoinToken("")
        window.location.reload()
      } else {
        toast.error(res.error || "Érvénytelen meghívókód")
      }
    } catch {
      toast.error("Hiba történt a csatlakozás során")
    } finally {
      setIsJoining(false)
    }
  }

  const setJoinDialogOpen = (open: boolean) => {
    if (open) {
      setCreateTab("join")
      setCreateDialogOpen(true)
    } else {
      setCreateDialogOpen(false)
    }
  }

  return (
    <>
      <div className="w-full px-2 py-1.5" data-tour="company-selector">
        <div className="flex items-center gap-1.5 w-full">
          {/* Cég ikon vagy logó */}
          {selectedCompany?.logo_url ? (
            <div className="h-7 w-7 rounded-md overflow-hidden bg-background flex items-center justify-center shrink-0 border border-border/80">
              <img
                src={selectedCompany.logo_url}
                alt={selectedCompany.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Building2 className="h-3.5 w-3.5" />
            </div>
          )}

          {/* Cégválasztó lenyíló gomb */}
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger
              disabled={isSwitching}
              className="flex-1 min-w-0 h-9 flex items-center justify-between gap-1.5 px-2.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-primary/40 transition-colors text-left outline-none group focus-visible:ring-1 focus-visible:ring-primary/40 cursor-pointer text-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                <span className="text-[10px] font-bold text-muted-foreground uppercase shrink-0 font-mono tracking-wider">
                  {selectedCompany?.country_code || "HU"}
                </span>
                <span className="truncate font-medium text-foreground">
                  {selectedCompany?.name || "Válassz céget..."}
                </span>
              </div>
              {isSwitching ? (
                <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              )}
            </PopoverTrigger>

            <PopoverContent align="start" className="w-[260px] p-0 shadow-lg border-border/80">
              {/* Keresőmező */}
              <div className="p-2 border-b border-border/60 flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Cég keresése..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                />
              </div>

              {/* Céglista */}
              <ScrollArea className="max-h-[220px]">
                <div className="p-1 space-y-0.5">
                  {filteredCompanies.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      Nincs találat
                    </div>
                  ) : (
                    filteredCompanies.map((company) => {
                      const isSelected = selectedCompany?.id === company.id
                      return (
                        <button
                          key={company.id}
                          type="button"
                          onClick={() => handleSelect(company)}
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors ${
                            isSelected
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted text-foreground text-xs"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs truncate font-medium flex items-center gap-1.5">
                              {company.logo_url ? (
                                <img
                                  src={company.logo_url}
                                  alt={company.name}
                                  className="h-3.5 w-3.5 rounded object-cover border border-border/60 shrink-0"
                                />
                              ) : null}
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {company.country_code || "HU"}
                              </span>
                              <span className="truncate">{company.name}</span>
                            </div>
                            {company.tax_number && (
                              <div className="text-[10px] text-muted-foreground truncate tabular-nums">
                                {company.tax_number}
                              </div>
                            )}
                          </div>
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </button>
                      )
                    })
                  )}
                </div>
              </ScrollArea>

              <Separator className="bg-border/60" />

              {/* Műveletek */}
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => {
                    setPopoverOpen(false)
                    setCreateTab("create")
                    setCreateDialogOpen(true)
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-foreground hover:bg-muted rounded-md transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  <span>Új cég hozzáadása</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPopoverOpen(false)
                    setCreateTab("join")
                    setCreateDialogOpen(true)
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-foreground hover:bg-muted rounded-md transition-colors"
                >
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Csatlakozás kóddal</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Cég szerkesztése gomb (mindig a meglévő kiválasztott céget szerkeszti) */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0 rounded-md"
            onClick={() => openEditDialog(selectedCompany)}
            disabled={!selectedCompany || isSwitching}
            title={selectedCompany ? `Cég szerkesztése (${selectedCompany.name})` : "Cég szerkesztése"}
          >
            <Pencil className="h-4 w-4" />
          </Button>

          {/* Cég hozzáadása + gomb */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0 rounded-md"
            onClick={() => {
              setCreateTab("create")
              setCreateDialogOpen(true)
            }}
            disabled={isSwitching}
            title="Új cég hozzáadása"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* CÉG SZERKESZTÉSE MODÁL */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleUpdateCompany}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <Pencil className="h-4 w-4 text-primary" />
                Cég adatainak szerkesztése
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Módosítsd a kiválasztott vállalkozás ({selectedCompany?.name}) adatait.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-country" className="text-xs">
                  Ország
                </Label>
                <Select
                  value={editCountry}
                  onValueChange={(val) => {
                    if (val === "HU" || val === "HR") setEditCountry(val)
                  }}
                >
                  <SelectTrigger id="edit-country" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HU">Magyarország (HU)</SelectItem>
                    <SelectItem value="HR">Horvátország (HR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-xs">
                  Cégnév <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  placeholder="pl. Minta Kereskedelmi Kft."
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-tax" className="text-xs">
                    Adószám (8 vagy 11 jegyű)
                  </Label>
                  {isEditTaxValid !== null && (
                    <span
                      className={`text-[10px] flex items-center gap-1 ${
                        isEditTaxValid
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {isEditTaxValid ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> Érvényes formátum
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3" /> Formátum ellenőrzendő
                        </>
                      )}
                    </span>
                  )}
                </div>
                <Input
                  id="edit-tax"
                  placeholder="pl. 12345678-2-41"
                  value={editTaxNumber}
                  onChange={(e) => setEditTaxNumber(e.target.value)}
                  className="h-8 text-xs tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-address" className="text-xs">
                  Székhely
                </Label>
                <Input
                  id="edit-address"
                  placeholder="pl. 1054 Budapest, Szabadság tér 7."
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-rep" className="text-xs">
                    Képviselő neve
                  </Label>
                  <Input
                    id="edit-rep"
                    placeholder="pl. Kovács János"
                    value={editRepresentative}
                    onChange={(e) => setEditRepresentative(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone" className="text-xs">
                    Telefonszám
                  </Label>
                  <Input
                    id="edit-phone"
                    placeholder="pl. +36 30 123 4567"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-filing-prefix" className="text-xs">
                  Iktató előtag (pl. THINK, DOCS)
                </Label>
                <Input
                  id="edit-filing-prefix"
                  placeholder="pl. DOCS"
                  value={editFilingPrefix}
                  onChange={(e) => setEditFilingPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                  maxLength={10}
                  className="h-8 text-xs uppercase font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Az új iktatószámok ezzel a prefixszel fognak kezdődni (pl. {editFilingPrefix || "DOCS"}/2026/00001).
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(false)}
                disabled={isUpdating}
                className="h-8 text-xs"
              >
                Mégse
              </Button>
              <Button type="submit" size="sm" disabled={isUpdating} className="h-8 text-xs">
                {isUpdating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Mentés...
                  </>
                ) : (
                  "Módosítások mentése"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CÉG HOZZÁADÁSA MODÁL (ÚJ CÉG / CSATLAKOZÁS FÜLEKKEL) */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Building2 className="h-4 w-4 text-primary" />
              Cég hozzáadása
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Hozz létre egy új vállalatot, vagy csatlakozz meglévőhöz egy megosztási kód segítségével.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={createTab}
            onValueChange={(val) => setCreateTab(val as "create" | "join")}
            className="w-full pt-1"
          >
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="create" className="text-xs flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Új cég létrehozása
              </TabsTrigger>
              <TabsTrigger value="join" className="text-xs flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                Csatlakozás kóddal
              </TabsTrigger>
            </TabsList>

            {/* TAB: ÚJ CÉG LÉTREHOZÁSA */}
            <TabsContent value="create" className="pt-3">
              <form onSubmit={handleCreateCompany}>
                <div className="space-y-3.5 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-country" className="text-xs">
                      Ország
                    </Label>
                    <Select
                      value={newCountry}
                      onValueChange={(val) => {
                        if (val === "HU" || val === "HR") setNewCountry(val)
                      }}
                    >
                      <SelectTrigger id="new-country" className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HU">Magyarország (HU)</SelectItem>
                        <SelectItem value="HR">Horvátország (HR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="company-name" className="text-xs">
                      Cégnév <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="company-name"
                      placeholder="pl. Minta Kereskedelmi Kft."
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="company-tax" className="text-xs">
                        Adószám (8 vagy 11 jegyű)
                      </Label>
                      {isNewTaxValid !== null && (
                        <span
                          className={`text-[10px] flex items-center gap-1 ${
                            isNewTaxValid
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {isNewTaxValid ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" /> Érvényes formátum
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3" /> Formátum ellenőrzendő
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    <Input
                      id="company-tax"
                      placeholder="pl. 12345678-2-41"
                      value={newTaxNumber}
                      onChange={(e) => setNewTaxNumber(e.target.value)}
                      className="h-8 text-xs tabular-nums"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="company-address" className="text-xs">
                      Székhely
                    </Label>
                    <Input
                      id="company-address"
                      placeholder="pl. 1054 Budapest, Szabadság tér 7."
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="company-rep" className="text-xs">
                        Képviselő neve
                      </Label>
                      <Input
                        id="company-rep"
                        placeholder="pl. Kovács János"
                        value={newRepresentative}
                        onChange={(e) => setNewRepresentative(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="company-phone" className="text-xs">
                        Telefonszám
                      </Label>
                      <Input
                        id="company-phone"
                        placeholder="pl. +36 30 123 4567"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateDialogOpen(false)}
                    disabled={isCreating}
                    className="h-8 text-xs"
                  >
                    Mégse
                  </Button>
                  <Button type="submit" size="sm" disabled={isCreating} className="h-8 text-xs">
                    {isCreating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Létrehozás...
                      </>
                    ) : (
                      "Cég létrehozása"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            {/* TAB: CSATLAKOZÁS KÓDDAL */}
            <TabsContent value="join" className="pt-3">
              <form onSubmit={handleJoinCompany}>
                <div className="py-4 space-y-2">
                  <Label htmlFor="join-token" className="text-xs">
                    Meghívó kód (Share Token)
                  </Label>
                  <Input
                    id="join-token"
                    placeholder="pl. fe96d4702caaa4b4..."
                    value={joinToken}
                    onChange={(e) => setJoinToken(e.target.value)}
                    required
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Add meg a cég tulajdonosa által megosztott egyedi meghívó azonosítót.
                  </p>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateDialogOpen(false)}
                    disabled={isJoining}
                    className="h-8 text-xs"
                  >
                    Mégse
                  </Button>
                  <Button type="submit" size="sm" disabled={isJoining} className="h-8 text-xs">
                    {isJoining ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Csatlakozás...
                      </>
                    ) : (
                      "Csatlakozás céghez"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}
