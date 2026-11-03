"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Building2,
  Search,
  Check,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react"
import { useCompany } from "@/contexts/company-context"
import {
  inviteCompanyMemberAction,
  getAvailableUsersForCompanyAction,
} from "@/app/actions/company-actions"
import { toast } from "sonner"

interface InviteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultCompanyId?: string
  module?: "docs" | "hr"
  onSuccess?: () => void
}

type AddMode = "new" | "existing"

interface ExistingUserOption {
  id: string
  nev: string
  email: string
  elerheto_modulok: string[]
  alreadyMember: boolean
}

const DOCS_ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  rendszergazda: "Rendszergazda",
  vezeto: "Vezető / Szignáló",
  iktato: "Iratkezelő / Iktató",
  ugyintezo: "Ügyintéző",
  betekinto: "Betekintő",
  auditor: "Auditor",
}

const HR_ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  hr_vezeto: "HR Vezető",
  hr_munkatars: "HR Munkatárs",
  vezeto: "Vezető (Közvetlen)",
  berugyi: "Bérügyi / Bérszámfejtő",
  toborzo: "Toborzó (ATS)",
  munkavedelmi: "Munkavédelmi Felelős",
  munkavallalo: "Munkavállaló",
  auditor: "Auditor",
}

export function InviteUserDialog({
  open,
  onOpenChange,
  defaultCompanyId,
  module = "docs",
  onSuccess,
}: InviteUserDialogProps) {
  const { companies, selectedCompany } = useCompany()

  const [mode, setMode] = React.useState<AddMode>("new")
  const [nev, setNev] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)

  // Meglévő felhasználók listája
  const [existingUsers, setExistingUsers] = React.useState<ExistingUserOption[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(false)
  const [userSearch, setUserSearch] = React.useState("")
  const [selectedExistingUserId, setSelectedExistingUserId] = React.useState<string>("")

  // Cég hozzárendelés állapota
  const [assignToCompany, setAssignToCompany] = React.useState(true)
  const [selectedCompanyIds, setSelectedCompanyIds] = React.useState<string[]>([])
  const [companySearch, setCompanySearch] = React.useState("")

  // Szerepkör
  const [role, setRole] = React.useState(module === "docs" ? "ugyintezo" : "munkavallalo")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const targetCompanyId = defaultCompanyId || selectedCompany?.id || (companies[0]?.id ?? "")

  // Amikor megnyílik a modál, beállítjuk az alapértelmezett céget és frissítjük a meglévő felhasználókat
  React.useEffect(() => {
    if (open) {
      setMode("new")
      setNev("")
      setEmail("")
      setPassword("")
      setUserSearch("")
      setSelectedExistingUserId("")
      setAssignToCompany(true)
      if (targetCompanyId) {
        setSelectedCompanyIds([targetCompanyId])
      }
      setRole(module === "docs" ? "ugyintezo" : "munkavallalo")

      if (targetCompanyId) {
        setIsLoadingUsers(true)
        getAvailableUsersForCompanyAction(targetCompanyId)
          .then((res) => {
            if (res.success && res.users) {
              setExistingUsers(res.users)
            }
          })
          .catch(() => {})
          .finally(() => setIsLoadingUsers(false))
      }
    }
  }, [open, targetCompanyId, module])

  // Szűrt céglista
  const filteredCompanies = React.useMemo(() => {
    if (!companySearch.trim()) return companies
    const q = companySearch.toLowerCase().trim()
    return companies.filter((c) => c.name.toLowerCase().includes(q))
  }, [companies, companySearch])

  // Szűrt meglévő felhasználók
  const filteredExistingUsers = React.useMemo(() => {
    if (!userSearch.trim()) return existingUsers
    const q = userSearch.toLowerCase().trim()
    return existingUsers.filter(
      (u) =>
        u.nev.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    )
  }, [existingUsers, userSearch])

  const toggleCompany = (id: string) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  // Szerepkör leírások eaisyDocs-hoz
  const docsRoleDescriptions: Record<string, string> = {
    admin: "Teljes adminisztrátori jog a cég dokumentumai, csapata és beállításai felett.",
    rendszergazda: "Rendszergazdai és IT konfigurációs jogosultságok.",
    vezeto: "Ügyiratok szignálása, jóváhagyása és delegálása.",
    iktato: "Érkeztetés, iktatás, postázás és selejtezési jogosultság.",
    ugyintezo: "Általános hozzáférés az ügyiratokhoz és iratokhoz.",
    betekinto: "Kizárólag olvasási jogosultság a közzétett iratokhoz.",
    auditor: "Teljes betekintés és eseménynapló (audit) hozzáférés.",
  }

  // Szerepkör leírások eaisyHR-hez
  const hrRoleDescriptions: Record<string, string> = {
    admin: "Teljes felügyeleti jog az eaisyHR rendszerben.",
    hr_vezeto: "HR folyamatok és jóváhagyások teljes felügyelete.",
    hr_munkatars: "Munkavállalói adatok, bérügy és jelenlét jóváhagyása.",
    vezeto: "Közvetlen beosztottak jelenlétének és szabadságainak kezelése.",
    berugyi: "Bérszámfejtési és juttatási adatok kezelése.",
    toborzo: "Jelöltek és toborzási folyamatok (ATS) felügyelete.",
    munkavedelmi: "Munkavédelmi és orvosi vizsgálatok kezelése.",
    munkavallalo: "Saját adatok, szabadságkérelmek és jelenlét kezelése.",
    auditor: "HR megfelelőségi és ellenőrzési betekintés.",
  }

  const roleDescription =
    module === "docs" ? docsRoleDescriptions[role] : hrRoleDescriptions[role]

  const currentRoleLabel =
    module === "docs"
      ? DOCS_ROLE_LABELS[role] || role
      : HR_ROLE_LABELS[role] || role

  const handleSelectExistingUser = (u: ExistingUserOption) => {
    setSelectedExistingUserId(u.id)
    setNev(u.nev)
    setEmail(u.email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const companiesToAssign = assignToCompany
      ? selectedCompanyIds.length > 0
        ? selectedCompanyIds
        : targetCompanyId
        ? [targetCompanyId]
        : []
      : []

    if (assignToCompany && companiesToAssign.length === 0) {
      toast.error("Kérjük, válassz ki legalább egy céget a hozzárendeléshez")
      return
    }

    if (mode === "existing") {
      if (!selectedExistingUserId) {
        toast.error("Kérjük, válassz ki egy meglévő felhasználót a listából")
        return
      }
    } else {
      if (!nev.trim()) {
        toast.error("A teljes név megadása kötelező")
        return
      }
      if (!email.trim() || !email.includes("@")) {
        toast.error("Kérjük, adj meg egy érvényes email címet")
        return
      }
      if (!password || password.length < 6) {
        toast.error("A kezdő jelszónak legalább 6 karakter hosszúnak kell lennie")
        return
      }
    }

    setIsSubmitting(true)
    try {
      const res = await inviteCompanyMemberAction({
        nev: nev.trim(),
        email: email.trim(),
        password: mode === "new" ? password : "",
        existingUserId: mode === "existing" ? selectedExistingUserId : undefined,
        companyIds: companiesToAssign,
        role,
        module,
      })

      if (res.success) {
        toast.success(`Tag sikeresen hozzáadva: ${nev.trim()}`)
        onOpenChange(false)
        setNev("")
        setEmail("")
        setPassword("")
        setSelectedExistingUserId("")
        if (onSuccess) onSuccess()
      } else {
        toast.error(res.error || "Hiba történt a tag hozzáadása során")
      }
    } catch {
      toast.error("Váratlan hiba történt a tag hozzáadása során")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Tag hozzáadása
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Felhasználó közvetlen létrehozása vagy hozzárendelése meghívó nélkül ({module === "hr" ? "eaisyHR" : "eaisyDocs"} modul).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-4">
            {/* Módválasztó: Új felhasználó létrehozása vs Meglévő felhasználó kiválasztása */}
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-border/80 bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("new")
                  setSelectedExistingUserId("")
                }}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  mode === "new"
                    ? "bg-background text-foreground border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Új felhasználó
              </button>
              <button
                type="button"
                onClick={() => setMode("existing")}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  mode === "existing"
                    ? "bg-background text-foreground border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Meglévő felhasználó
              </button>
            </div>

            {mode === "new" ? (
              <>
                {/* Teljes név */}
                <div className="space-y-1.5">
                  <Label htmlFor="invite-name" className="text-xs">
                    Teljes név <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="invite-name"
                    placeholder="Vezetéknév Keresztnév"
                    value={nev}
                    onChange={(e) => setNev(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                {/* Email cím */}
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email" className="text-xs">
                    Email cím <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="felhasznalo@ceg.hu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                {/* Kezdő jelszó */}
                <div className="space-y-1.5">
                  <Label htmlFor="invite-password" className="text-xs">
                    Kezdő jelszó <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="invite-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 6 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-8 text-xs pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    A felhasználó fiókja azonnal aktív lesz ezzel a jelszóval, meghívó elfogadása nélkül.
                  </p>
                </div>
              </>
            ) : (
              /* Meglévő felhasználó kiválasztása */
              <div className="space-y-2">
                <Label className="text-xs">
                  Válassz regisztrált felhasználót <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Keresés név vagy email alapján..."
                    className="pl-8 h-8 text-xs"
                  />
                </div>

                <div className="max-h-[160px] overflow-y-auto rounded-md border border-border/60 bg-background divide-y divide-border/40">
                  {isLoadingUsers ? (
                    <div className="p-3 text-xs text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      Felhasználók betöltése...
                    </div>
                  ) : filteredExistingUsers.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground text-center">
                      Nincs találat
                    </div>
                  ) : (
                    filteredExistingUsers.map((u) => {
                      const isSelected = selectedExistingUserId === u.id
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleSelectExistingUser(u)}
                          className={`w-full text-left px-2.5 py-2 text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted/60 text-foreground"
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium truncate">{u.nev}</span>
                              {u.alreadyMember && (
                                <span className="inline-flex items-center rounded border border-border px-1 h-4 text-[10px] text-muted-foreground">
                                  Már tag
                                </span>
                              )}
                            </div>
                            {u.email && (
                              <div className="text-[11px] text-muted-foreground truncate">
                                {u.email}
                              </div>
                            )}
                          </div>
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* Hozzárendelés céghez és szerepkör blokk */}
            <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="assign-company-check"
                  checked={assignToCompany}
                  onCheckedChange={(ch) => setAssignToCompany(ch === true)}
                />
                <Label
                  htmlFor="assign-company-check"
                  className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-foreground"
                >
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Hozzárendelés céghez
                </Label>
              </div>

              {assignToCompany && (
                <div className="space-y-3 pt-1">
                  {/* Cég kiválasztása */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Cég kiválasztása</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        placeholder="Cég keresése..."
                        className="pl-8 h-8 text-xs"
                      />
                    </div>

                    <div className="max-h-[130px] overflow-y-auto rounded-md border border-border/60 bg-background divide-y divide-border/40">
                      {filteredCompanies.length === 0 ? (
                        <div className="p-3 text-xs text-muted-foreground text-center">
                          Nincs találat
                        </div>
                      ) : (
                        filteredCompanies.map((c) => {
                          const isSelected = selectedCompanyIds.includes(c.id)
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => toggleCompany(c.id)}
                              className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between transition-colors ${
                                isSelected
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "hover:bg-muted/60 text-foreground"
                              }`}
                            >
                              <div className="truncate flex items-center gap-1.5">
                                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                  {c.country_code || "HU"}
                                </span>
                                <span className="truncate">{c.name}</span>
                              </div>
                              {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                            </button>
                          )
                        })
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Kiválasztva: {selectedCompanyIds.length} cég
                    </p>
                  </div>

                  {/* Szerepkör választó */}
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-role" className="text-xs">
                      Szerepkör ({module === "hr" ? "eaisyHR" : "eaisyDocs"})
                    </Label>
                    <Select value={role} onValueChange={(v) => { if (v) setRole(v) }}>
                      <SelectTrigger id="invite-role" className="h-8 text-xs">
                        <SelectValue>{currentRoleLabel}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {module === "docs" ? (
                          <>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="rendszergazda">Rendszergazda</SelectItem>
                            <SelectItem value="vezeto">Vezető / Szignáló</SelectItem>
                            <SelectItem value="iktato">Iratkezelő / Iktató</SelectItem>
                            <SelectItem value="ugyintezo">Ügyintéző</SelectItem>
                            <SelectItem value="betekinto">Betekintő</SelectItem>
                            <SelectItem value="auditor">Auditor</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="hr_vezeto">HR Vezető</SelectItem>
                            <SelectItem value="hr_munkatars">HR Munkatárs</SelectItem>
                            <SelectItem value="vezeto">Vezető (Közvetlen)</SelectItem>
                            <SelectItem value="berugyi">Bérügyi / Bérszámfejtő</SelectItem>
                            <SelectItem value="toborzo">Toborzó (ATS)</SelectItem>
                            <SelectItem value="munkavedelmi">Munkavédelmi Felelős</SelectItem>
                            <SelectItem value="munkavallalo">Munkavállaló</SelectItem>
                            <SelectItem value="auditor">Auditor</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    {roleDescription && (
                      <p className="text-[11px] text-muted-foreground pt-0.5">
                        {roleDescription}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-8 text-xs"
            >
              Mégse
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Hozzáadás folyamatban...
                </>
              ) : (
                "Tag hozzáadása"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
