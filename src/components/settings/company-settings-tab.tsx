"use client"

import * as React from "react"
import {
  Building2,
  Copy,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Loader2,
  Check,
  ExternalLink,
  KeyRound,
  UserPlus,
  AlertTriangle,
  Pencil,
  Upload,
  Sliders,
} from "lucide-react"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCompany } from "@/contexts/company-context"
import {
  updateCompanyAction,
  generateCompanyShareTokenAction,
  getCompanyMembersAction,
  removeCompanyMemberAction,
  getUserCompanyMembershipsAction,
  getCompanyAccessAction,
  uploadCompanyLogoAction,
  removeCompanyLogoAction,
} from "@/app/actions/company-actions"
import { isHungarianTaxNumber, cleanTaxNumber } from "@/utils/tax-number"
import { toast } from "sonner"
import type { Company, CompanyMemberWithProfile } from "@/types/company"
import { InviteUserDialog } from "./invite-user-dialog"
import { EditMemberRoleDialog } from "./edit-member-role-dialog"

interface CompanySettingsTabProps {
  module?: "docs" | "hr"
}

export function CompanySettingsTab({ module = "docs" }: CompanySettingsTabProps) {
  const {
    companies,
    selectedCompany,
    setSelectedCompany,
    setCompaniesList,
    updateCompanyInState,
    isSwitching,
  } = useCompany()

  // Jogosultság állapota (csak a cég tulajdonosa láthatja a tagokat és módosíthatja a céget)
  const [isOwner, setIsOwner] = React.useState(false)
  const [isCheckingAccess, setIsCheckingAccess] = React.useState(true)

  // 1. Cég adatainak állapota
  const [name, setName] = React.useState("")
  const [taxNumber, setTaxNumber] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [representative, setRepresentative] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [countryCode, setCountryCode] = React.useState<"HU" | "HR">("HU")
  const [filingPrefix, setFilingPrefix] = React.useState("DOCS")
  const [isSaving, setIsSaving] = React.useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = React.useState(false)
  const logoInputRef = React.useRef<HTMLInputElement | null>(null)

  // 2. Meghívó kód állapota
  const [shareToken, setShareToken] = React.useState<string | null>(null)
  const [tokenCreatedAt, setTokenCreatedAt] = React.useState<string | null>(null)
  const [isGeneratingToken, setIsGeneratingToken] = React.useState(false)
  const [remainingSeconds, setRemainingSeconds] = React.useState<number | null>(null)
  const TOKEN_DURATION_MS = 10 * 60 * 1000 // 10 perc

  // 3. Tagok állapota
  const [members, setMembers] = React.useState<CompanyMemberWithProfile[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(false)
  const [removingMemberId, setRemovingMemberId] = React.useState<string | null>(null)
  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false)
  const [memberToDelete, setMemberToDelete] = React.useState<CompanyMemberWithProfile | null>(null)
  const [memberToEdit, setMemberToEdit] = React.useState<CompanyMemberWithProfile | null>(null)

  // 4. Összes cég állapota
  const [allMemberships, setAllMemberships] = React.useState<any[]>([])
  const [isLoadingAll, setIsLoadingAll] = React.useState(false)

  const lastCompanyIdRef = React.useRef<string | null>(null)

  // Szinkronizálás a kiválasztott cég megváltozásakor
  React.useEffect(() => {
    if (selectedCompany) {
      setName(selectedCompany.name || "")
      setTaxNumber(selectedCompany.tax_number || "")
      setAddress(selectedCompany.address || "")
      setRepresentative(selectedCompany.representative_name || "")
      setPhone(selectedCompany.phone || "")
      setCountryCode((selectedCompany.country_code as "HU" | "HR") || "HU")
      setFilingPrefix(selectedCompany.filing_prefix || "DOCS")

      const isDifferentCompany = lastCompanyIdRef.current !== selectedCompany.id
      lastCompanyIdRef.current = selectedCompany.id

      // Jogosultság ellenőrzése: Csak a tulajdonos láthatja a tagokat és szerkesztheti az adatokat
      setIsCheckingAccess(true)
      getCompanyAccessAction(selectedCompany.id)
        .then((res) => {
          if (res.success && res.isOwner) {
            setIsOwner(true)
            loadMembers(selectedCompany.id)
          } else {
            setIsOwner(false)
            setMembers([])
          }
        })
        .catch((err) => {
          console.error("Hiba cég jogosultság lekérésekor:", err)
          setIsOwner(false)
          setMembers([])
        })
        .finally(() => {
          setIsCheckingAccess(false)
        })

      // Csak akkor töltjük be a meglévő kódot, ha az valódi 6 karakteres meghívókód és még nem járt le
      const is6Char = selectedCompany.share_token && selectedCompany.share_token.length === 6
      const createdTime = selectedCompany.share_token_created_at
        ? new Date(selectedCompany.share_token_created_at).getTime()
        : null
      const isStillFresh = createdTime ? createdTime + TOKEN_DURATION_MS > Date.now() : false

      if (isDifferentCompany) {
        if (is6Char && isStillFresh && selectedCompany.share_token) {
          setShareToken(selectedCompany.share_token)
          setTokenCreatedAt(selectedCompany.share_token_created_at || null)
        } else {
          setShareToken(null)
          setTokenCreatedAt(null)
        }
      } else if (is6Char && isStillFresh && selectedCompany.share_token && !shareToken) {
        setShareToken(selectedCompany.share_token)
        setTokenCreatedAt(selectedCompany.share_token_created_at || null)
      }
    }
    loadAllMemberships()
  }, [selectedCompany])

  // Visszaszámláló időzítő a meghívókódhoz
  React.useEffect(() => {
    if (!shareToken || !tokenCreatedAt) {
      setRemainingSeconds(null)
      return
    }

    const calcRemaining = () => {
      const created = new Date(tokenCreatedAt).getTime()
      return Math.max(0, Math.floor((created + TOKEN_DURATION_MS - Date.now()) / 1000))
    }

    setRemainingSeconds(calcRemaining())

    const interval = setInterval(() => {
      const r = calcRemaining()
      setRemainingSeconds(r)
      if (r <= 0) clearInterval(interval)
    }, 1000)

    return () => clearInterval(interval)
  }, [shareToken, tokenCreatedAt])

  const isExpired = remainingSeconds !== null && remainingSeconds <= 0
  const hasActiveToken = Boolean(shareToken) && shareToken?.length === 6 && Boolean(tokenCreatedAt) && !isExpired

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Tagok betöltése
  const loadMembers = async (companyId: string) => {
    setIsLoadingMembers(true)
    try {
      const res = await getCompanyMembersAction(companyId)
      if (res.success && res.members) {
        setMembers(res.members)
      }
    } catch (err) {
      console.error("Hiba tagok betöltésekor:", err)
    } finally {
      setIsLoadingMembers(false)
    }
  }

  // Összes cégtagság betöltése
  const loadAllMemberships = async () => {
    setIsLoadingAll(true)
    try {
      const res = await getUserCompanyMembershipsAction()
      if (res.success && res.list) {
        setAllMemberships(res.list)
      }
    } catch (err) {
      console.error("Hiba összes cég lekérdezésekor:", err)
    } finally {
      setIsLoadingAll(false)
    }
  }

  // Adószám validáció élő jelzése
  const isTaxValid = React.useMemo(() => {
    if (!taxNumber.trim()) return null
    return isHungarianTaxNumber(taxNumber)
  }, [taxNumber])

  // Cég adatainak mentése
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany || !isOwner) {
      toast.error("Kizárólag a cég tulajdonosa módosíthatja a cég adatait.")
      return
    }

    if (!name.trim()) {
      toast.error("A cégnév megadása kötelező")
      return
    }

    setIsSaving(true)
    try {
      const cleanedTax = taxNumber.trim() ? cleanTaxNumber(taxNumber) : null
      const cleanPrefix = filingPrefix.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "") || "DOCS"
      const res = await updateCompanyAction(selectedCompany.id, {
        name: name.trim(),
        tax_number: cleanedTax,
        address: address.trim() || null,
        representative_name: representative.trim() || null,
        phone: phone.trim() || null,
        country_code: countryCode,
        filing_prefix: cleanPrefix,
      })

      if (res.success) {
        toast.success("Cég adatai sikeresen elmentve")
        const updated: Company = {
          ...selectedCompany,
          name: name.trim(),
          tax_number: cleanedTax,
          address: address.trim() || null,
          representative_name: representative.trim() || null,
          phone: phone.trim() || null,
          country_code: countryCode,
          filing_prefix: cleanPrefix,
          updated_at: new Date().toISOString(),
        }
        updateCompanyInState(updated)
      } else {
        toast.error(res.error || "Hiba történt a mentés során")
      }
    } catch {
      toast.error("Váratlan hiba történt")
    } finally {
      setIsSaving(false)
    }
  }

  // Céglogó feltöltése
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedCompany) return

    setIsUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append("companyId", selectedCompany.id)
      formData.append("logo", file)

      const res = await uploadCompanyLogoAction(formData)
      if (res.success && res.logoUrl) {
        toast.success("Céglogó sikeresen feltöltve!")
        updateCompanyInState({
          ...selectedCompany,
          logo_url: res.logoUrl,
        })
      } else {
        toast.error(res.error || "Hiba történt a logó feltöltésekor")
      }
    } catch {
      toast.error("Váratlan hiba történt a logó feltöltése során")
    } finally {
      setIsUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ""
    }
  }

  // Céglogó eltávolítása
  const handleRemoveLogo = async () => {
    if (!selectedCompany) return

    setIsUploadingLogo(true)
    try {
      const res = await removeCompanyLogoAction(selectedCompany.id)
      if (res.success) {
        toast.success("Céglogó eltávolítva")
        updateCompanyInState({
          ...selectedCompany,
          logo_url: null,
        })
      } else {
        toast.error(res.error || "Hiba a logó eltávolításakor")
      }
    } catch {
      toast.error("Váratlan hiba történt")
    } finally {
      setIsUploadingLogo(false)
    }
  }

  // Új meghívókód generálása
  const handleGenerateToken = async () => {
    if (!selectedCompany) return

    setIsGeneratingToken(true)
    try {
      const res = await generateCompanyShareTokenAction(selectedCompany.id)
      if (res.success && res.token) {
        const tokenTime = res.tokenCreatedAt || new Date().toISOString()
        setShareToken(res.token)
        setTokenCreatedAt(tokenTime)
        updateCompanyInState({
          ...selectedCompany,
          share_token: res.token,
          share_token_created_at: tokenTime,
        })
        toast.success("Új meghívókód sikeresen generálva! (10 percig érvényes)")
      } else {
        toast.error(res.error || "Nem sikerült a kód generálása")
      }
    } catch {
      toast.error("Hiba történt a kód generálása során")
    } finally {
      setIsGeneratingToken(false)
    }
  }

  // Kód másolása vágólapra
  const handleCopyToken = () => {
    if (!shareToken) return
    navigator.clipboard.writeText(shareToken)
    toast.success("Meghívókód kimásolva a vágólapra!")
  }

  // Tag eltávolítása a cégből
  const handleRemoveMember = async (memberId: string) => {
    if (!selectedCompany) return

    setRemovingMemberId(memberId)
    try {
      const res = await removeCompanyMemberAction(selectedCompany.id, memberId)
      if (res.success) {
        toast.success("Tag sikeresen eltávolítva a cégből")
        setMembers((prev) => prev.filter((m) => m.id !== memberId))
        setMemberToDelete(null)
      } else {
        toast.error(res.error || "Nem sikerült a tag eltávolítása")
      }
    } catch {
      toast.error("Hiba a tag eltávolításakor")
    } finally {
      setRemovingMemberId(null)
    }
  }

  const createdDateFormatted = selectedCompany?.created_at
    ? new Date(selectedCompany.created_at).toLocaleDateString("hu-HU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "-"

  if (!selectedCompany) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        Nincs kiválasztott cég. Kérjük, válassz egy céget a fejlécben.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. KÁRTYA: KIVÁLASZTOTT CÉG ADATAI */}
      <Card className="border border-border/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Kiválasztott cég adatai</CardTitle>
            </div>
            {!isCheckingAccess && (
              <Badge
                variant={isOwner ? "default" : "outline"}
                className="text-[10px] h-4 uppercase tracking-wider font-semibold"
              >
                {isOwner ? "Tulajdonos" : "Munkavállaló / Tag"}
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            Az aktuálisan kiválasztott cég:{" "}
            <span className="font-semibold text-foreground">{selectedCompany.name}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Céglogó feltöltési szekció */}
          <div className="mb-5 flex items-center gap-4 p-3 rounded-lg border border-border/60 bg-muted/20">
            <div className="h-16 w-16 rounded-lg overflow-hidden border border-border/80 bg-background flex items-center justify-center shrink-0">
              {selectedCompany.logo_url ? (
                <img
                  src={selectedCompany.logo_url}
                  alt={selectedCompany.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground/60" />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="text-xs font-semibold text-foreground">Céglogó</div>
              <div className="text-[11px] text-muted-foreground">
                PNG, JPG, WebP vagy SVG formátum (max. 2 MB). A logó megjelenik a fejlécben és a cégválasztóban.
              </div>
              {isOwner && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={handleLogoFileChange}
                    disabled={isUploadingLogo}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                  >
                    {isUploadingLogo ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Feltöltés...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3 w-3" />
                        Logó feltöltése
                      </>
                    )}
                  </Button>
                  {selectedCompany.logo_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                      onClick={handleRemoveLogo}
                      disabled={isUploadingLogo}
                    >
                      Logó eltávolítása
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveCompany} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="company-name" className="text-xs">
                  Cég neve <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="company-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={!isOwner}
                  placeholder="pl. Think AI Kft."
                  className="h-9 text-xs disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-muted/40"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="company-tax" className="text-xs">
                    Adószám (8 vagy 11 jegyű)
                  </Label>
                  {isTaxValid !== null && (
                    <span
                      className={`text-[10px] flex items-center gap-1 ${
                        isTaxValid
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {isTaxValid ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> Érvényes
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3" /> Ellenőrizendő
                        </>
                      )}
                    </span>
                  )}
                </div>
                <Input
                  id="company-tax"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  disabled={!isOwner}
                  placeholder="pl. 12345678-2-41"
                  className="h-9 text-xs tabular-nums disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-muted/40"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company-address" className="text-xs">
                Székhely
              </Label>
              <Input
                id="company-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={!isOwner}
                placeholder="pl. 1111 Budapest, Lágymányosi utca 12. Fsz. 2."
                className="h-9 text-xs disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-muted/40"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="company-country" className="text-xs">
                  Ország
                </Label>
                <Select
                  value={countryCode}
                  disabled={!isOwner}
                  onValueChange={(val) => {
                    if (val === "HU" || val === "HR") setCountryCode(val)
                  }}
                >
                  <SelectTrigger id="company-country" className="h-9 text-xs disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-muted/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HU">Magyarország (HU)</SelectItem>
                    <SelectItem value="HR">Horvátország (HR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company-rep" className="text-xs">
                  Képviselő neve
                </Label>
                <Input
                  id="company-rep"
                  value={representative}
                  onChange={(e) => setRepresentative(e.target.value)}
                  disabled={!isOwner}
                  placeholder="pl. Kovács János"
                  className="h-9 text-xs disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-muted/40"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company-phone" className="text-xs">
                  Telefonszám
                </Label>
                <Input
                  id="company-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!isOwner}
                  placeholder="pl. +36 30 123 4567"
                  className="h-9 text-xs disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-muted/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="company-filing-prefix" className="text-xs">
                  Iktatókönyv előtag (prefix)
                </Label>
                <Input
                  id="company-filing-prefix"
                  value={filingPrefix}
                  onChange={(e) => setFilingPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                  disabled={!isOwner}
                  maxLength={10}
                  placeholder="pl. DOCS vagy THINK"
                  className="h-9 text-xs uppercase font-mono disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-muted/40"
                />
                <p className="text-[10px] text-muted-foreground">
                  Az új iktatószámok ezzel a prefixszel jönnek létre (pl. {filingPrefix || "DOCS"}/2026/00001).
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
              {isOwner ? (
                <Button type="submit" size="sm" disabled={isSaving} className="h-9 text-xs">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Mentés folyamatban...
                    </>
                  ) : (
                    "Cég adatainak mentése"
                  )}
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-md border border-border/60">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>Csak megtekintés • A cég adatait kizárólag a tulajdonos szerkesztheti.</span>
                </div>
              )}
              <span className="text-[11px] text-muted-foreground tabular-nums">
                Létrehozva: {createdDateFormatted}
              </span>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* KÁRTYA: CÉGES KÖNYVELÉSI ÉS IKTATÁSI SZABÁLYOK (AI) */}
      <Card className="border border-border/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Céges Könyvelési és Iktatási Szabályok</CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] h-4 uppercase tracking-wider font-semibold border-primary/30 text-primary">
              AI Rendszer
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Minden vállalkozáshoz külön könyvelési, kontírozási és iktatási prompt-szabályokat definiálhatsz. Az AI dokumentum-feldolgozó (Gemini 2.5) ezeket automatikusan prioritásként érvényesíti az iratok érkeztetésekor és iktatásakor.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 pt-1 flex-wrap sm:flex-nowrap">
          <div className="text-xs text-muted-foreground">
            A(z) <strong className="text-foreground">{selectedCompany.name}</strong> cégre érvényes szabályok megtekintése, szerkesztése vagy új szabályok felvétele:
          </div>
          <Link href="/rules" className="shrink-0">
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-[#02b8cc] hover:bg-[#029db0] text-white">
              <Sliders className="h-3.5 w-3.5" />
              Szabályok kezelése
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* 2. KÁRTYA: CÉG HOZZÁFÉRÉS (MEGHÍVÓ KÓD GENERÁLÁS) - CSAK TULAJDONOSNAK */}
      {isOwner && (
        <Card className="border border-border/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Cég hozzáférés</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Meghívó kód generálása, amivel mások csatlakozhatnak a céghez (10 percig érvényes).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasActiveToken ? (
              <div className="space-y-3">
                {isExpired && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="h-4 w-4" />
                    A korábbi meghívókód érvényessége lejárt.
                  </div>
                )}
                <Button
                  type="button"
                  onClick={handleGenerateToken}
                  disabled={isGeneratingToken}
                  size="sm"
                  className="h-9 text-xs gap-2"
                >
                  {isGeneratingToken ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Kód generálása folyamatban...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-3.5 w-3.5" />
                      Meghívó kód generálása
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-4 py-2.5 bg-muted/60 border border-border/60 rounded-md font-mono text-2xl tracking-[0.3em] text-center font-bold text-foreground">
                    {shareToken}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={handleCopyToken}
                    title="Kód másolása"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={handleGenerateToken}
                    disabled={isGeneratingToken}
                    title="Újragenerálás"
                  >
                    {isGeneratingToken ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Időzítő & Érvényesség */}
                <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                  {remainingSeconds !== null && (
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      Hátralévő érvényességi idő:{" "}
                      <span className="font-mono font-semibold text-foreground">
                        {formatTime(remainingSeconds)}
                      </span>
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    Mások a fejlécben lévő „+” gombbal csatlakozhatnak ezzel a kóddal.
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. KÁRTYA: TAGOK - CSAK TULAJDONOSNAK */}
      {isOwner && (
        <Card className="border border-border/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold">Tagok</CardTitle>
                  <Badge variant="outline" className="text-[11px] h-5">
                    {members.length} fő
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  A céghez hozzáféréssel rendelkező felhasználók listája és szerepköre.
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs gap-1.5 bg-[#02b8cc] hover:bg-[#029db0] text-white"
                onClick={() => setInviteDialogOpen(true)}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Tag hozzáadása
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingMembers ? (
              <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Tagok betöltése...
              </div>
            ) : members.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Még nincsenek tagok rendelve ehhez a céghez.
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => {
                  const isMemberOwner = member.role === "owner"
                  const isAdmin = member.role === "admin"
                  const joinDate = member.created_at
                    ? new Date(member.created_at).toLocaleDateString("hu-HU", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })
                    : "-"

                  const docsRoleLabels: Record<string, string> = {
                    ugyintezo: "Ügyintéző",
                    iktato: "Iktató",
                    vezeto: "Vezető",
                    betekinto: "Betekintő",
                    auditor: "Auditor",
                    admin: "Admin",
                    rendszergazda: "Rendszergazda",
                  }
                  const hrRoleLabels: Record<string, string> = {
                    munkavallalo: "Munkavállaló",
                    hr_munkatars: "HR Munkatárs",
                    hr_vezeto: "HR Vezető",
                    vezeto: "Vezető",
                    berugyi: "Bérügyi",
                    toborzo: "Toborzó",
                    munkavedelmi: "Munkavédelmi",
                    auditor: "Auditor",
                    admin: "Admin",
                  }

                  const roleBadgeText = isMemberOwner
                    ? "Tulajdonos"
                    : module === "docs"
                    ? (member.docs_szerepkor ? docsRoleLabels[member.docs_szerepkor] || member.docs_szerepkor : isAdmin ? "Admin" : "Tag")
                    : (member.hr_szerepkor ? hrRoleLabels[member.hr_szerepkor] || member.hr_szerepkor : isAdmin ? "Admin" : "Tag")

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {member.user_nev || "Névtelen"}
                          </span>
                          <Badge
                            variant={isMemberOwner ? "default" : isAdmin ? "secondary" : "outline"}
                            className="text-[10px] h-4 uppercase tracking-wider font-semibold"
                          >
                            {roleBadgeText}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {member.user_email && <span>{member.user_email} • </span>}
                          <span>Csatlakozott: {joinDate}</span>
                        </div>
                      </div>

                      {!isMemberOwner && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 transition-colors"
                            onClick={() => setMemberToEdit(member)}
                            title="Szerepkörök módosítása"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 transition-colors"
                            onClick={() => setMemberToDelete(member)}
                            disabled={removingMemberId === member.id}
                            title="Tag eltávolítása"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. KÁRTYA: PROFILHOZ TARTOZÓ ÖSSZES CÉG ÁTTEKINTÉSE */}
      <Card className="border border-border/80">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Összes elérhető cégem</CardTitle>
          </div>
          <CardDescription className="text-xs">
            A fiókodhoz kapcsolt vállalkozások és a hozzájuk rendelt jogosultságaid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAll ? (
            <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Cégek betöltése...
            </div>
          ) : allMemberships.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Még nincsenek kapcsolt cégek.
            </div>
          ) : (
            <div className="space-y-2">
              {allMemberships.map((item) => {
                const comp = item.company
                if (!comp) return null
                const isCurrentActive = selectedCompany?.id === comp.id
                const isOwner = item.role === "owner" || item.isOwner
                const isAdmin = item.role === "admin"

                return (
                  <div
                    key={item.membershipId || comp.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isCurrentActive
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/60 bg-muted/20 hover:bg-muted/40"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {comp.name}
                        </span>
                        <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                          {comp.country_code || "HU"}
                        </span>
                        <Badge
                          variant={isOwner ? "default" : isAdmin ? "secondary" : "outline"}
                          className="text-[10px] h-4 uppercase tracking-wider font-semibold"
                        >
                          {isOwner ? "Tulajdonos" : isAdmin ? "Admin" : "Tag"}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {comp.tax_number ? (
                          <span className="tabular-nums font-mono">{comp.tax_number}</span>
                        ) : (
                          "Adószám nincs megadva"
                        )}
                        {comp.address && <span> • {comp.address}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isCurrentActive ? (
                        <Badge variant="outline" className="text-xs text-primary border-primary/30 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Aktív cég
                        </Badge>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          disabled={isSwitching}
                          onClick={() => setSelectedCompany(comp)}
                        >
                          Váltás erre
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Felhasználó meghívása modál */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        defaultCompanyId={selectedCompany?.id}
        module={module}
        onSuccess={() => {
          if (selectedCompany) {
            loadMembers(selectedCompany.id)
          }
          loadAllMemberships()
        }}
      />

      {/* Tag szerepkörének szerkesztése modál */}
      <EditMemberRoleDialog
        open={Boolean(memberToEdit)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setMemberToEdit(null)
        }}
        member={memberToEdit}
        companyId={selectedCompany.id}
        module={module}
        onSuccess={() => {
          if (selectedCompany) {
            loadMembers(selectedCompany.id)
          }
          loadAllMemberships()
        }}
      />

      {/* Tag eltávolítása megerősítő modál (Kanonikus AlertDialog) */}
      <AlertDialog
        open={Boolean(memberToDelete)}
        onOpenChange={(isOpen) => {
          if (!isOpen && !removingMemberId) setMemberToDelete(null)
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <AlertDialogTitle className="text-base font-semibold">
                Tag eltávolítása a cégből
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
              Biztosan el szeretnéd távolítani a(z){" "}
              <strong className="text-foreground">{memberToDelete?.user_nev || "Névtelen"}</strong>
              {memberToDelete?.user_email ? (
                <> ({memberToDelete.user_email})</>
              ) : null}{" "}
              nevű tagot a(z){" "}
              <strong className="text-foreground">{selectedCompany.name}</strong> cégből?
              <br />
              <br />
              A felhasználó azonnal elveszíti a hozzáférését a vállalat irataihoz, ügyirataihoz és beállításaihoz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 pt-2">
            <AlertDialogCancel
              disabled={Boolean(removingMemberId)}
              className="h-8 text-xs font-medium"
            >
              Mégse
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(removingMemberId)}
              onClick={async (e) => {
                e.preventDefault()
                if (memberToDelete) {
                  await handleRemoveMember(memberToDelete.id)
                }
              }}
              className="h-8 text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium gap-1.5"
            >
              {removingMemberId ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Eltávolítás folyamatban...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Tag eltávolítása
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
