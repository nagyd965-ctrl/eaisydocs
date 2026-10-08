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
  UserPlus,
  Building2,
  Search,
  Check,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react"
import { useCompany } from "@/contexts/company-context"
import { inviteCompanyMemberAction } from "@/app/actions/company-actions"
import { toast } from "sonner"
import type { Company } from "@/types/company"

interface InviteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultCompanyId?: string
  module?: "docs" | "hr"
  onSuccess?: () => void
}

export function InviteUserDialog({
  open,
  onOpenChange,
  defaultCompanyId,
  module = "docs",
  onSuccess,
}: InviteUserDialogProps) {
  const { companies, selectedCompany } = useCompany()

  const [nev, setNev] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  // Cég hozzárendelés állapota
  const [assignToCompany, setAssignToCompany] = React.useState(true)
  const [selectedCompanyIds, setSelectedCompanyIds] = React.useState<string[]>([])
  const [companySearch, setCompanySearch] = React.useState("")

  // Szerepkör
  const [role, setRole] = React.useState(module === "docs" ? "ugyintezo" : "munkavallalo")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Amikor megnyílik a modál, beállítjuk az alapértelmezett céget
  React.useEffect(() => {
    if (open) {
      const initialId = defaultCompanyId || selectedCompany?.id || (companies[0]?.id ?? "")
      if (initialId) {
        setSelectedCompanyIds([initialId])
      }
      setRole(module === "docs" ? "ugyintezo" : "munkavallalo")
    }
  }, [open, defaultCompanyId, selectedCompany, companies, module])

  // Jelszó erősségi feltételek
  const passwordCriteria = React.useMemo(() => {
    return [
      { label: "Legalább 8 karakter", valid: password.length >= 8 },
      { label: "Nagybetű (A-Z)", valid: /[A-Z]/.test(password) },
      { label: "Kisbetű (a-z)", valid: /[a-z]/.test(password) },
      { label: "Szám (0-9)", valid: /[0-9]/.test(password) },
      { label: "Speciális karakter (!@#$...)", valid: /[^A-Za-z0-9]/.test(password) },
    ]
  }, [password])

  const isPasswordValid = passwordCriteria.every((c) => c.valid)
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword

  // Szűrt céglista
  const filteredCompanies = React.useMemo(() => {
    if (!companySearch.trim()) return companies
    const q = companySearch.toLowerCase().trim()
    return companies.filter((c) => c.name.toLowerCase().includes(q))
  }, [companies, companySearch])

  const toggleCompany = (id: string) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  // Szerepkör leírások eaisyDocs-hoz
  const docsRoleDescriptions: Record<string, string> = {
    ugyintezo: "Általános hozzáférés az ügyiratokhoz és iratokhoz.",
    iktato: "Érkeztetés, iktatás, postázás és selejtezési jogosultság.",
    vezeto: "Ügyiratok szignálása, jóváhagyása és delegálása.",
    betekinto: "Kizárólag olvasási jogosultság a közzétett iratokhoz.",
    auditor: "Teljes betekintés és eseménynapló (audit) hozzáférés.",
    admin: "Teljes adminisztrátori jog a cég dokumentumai és beállításai felett.",
    rendszergazda: "Rendszergazdai és IT konfigurációs jogosultságok.",
  }

  // Szerepkör leírások eaisyHR-hez
  const hrRoleDescriptions: Record<string, string> = {
    munkavallalo: "Saját adatok, szabadságkérelmek és jelenlét kezelése.",
    hr_munkatars: "Munkavállalói adatok, bérügy és jelenlét jóváhagyása.",
    hr_vezeto: "HR folyamatok és jóváhagyások teljes felügyelete.",
    vezeto: "Közvetlen beosztottak jelenlétének és szabadságainak kezelése.",
    berugyi: "Bérszámfejtési és juttatási adatok kezelése.",
    toborzo: "Jelöltek és toborzási folyamatok (ATS) felügyelete.",
    munkavedelmi: "Munkavédelmi és orvosi vizsgálatok kezelése.",
    auditor: "HR megfelelőségi és ellenőrzési betekintés.",
    admin: "Teljes felügyeleti jog az eaisyHR rendszerben.",
  }

  const roleDescription =
    module === "docs" ? docsRoleDescriptions[role] : hrRoleDescriptions[role]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nev.trim()) {
      toast.error("A név megadása kötelező")
      return
    }

    if (!email.trim() || !email.includes("@")) {
      toast.error("Kérjük, adj meg egy érvényes email címet")
      return
    }

    if (!isPasswordValid) {
      toast.error("A jelszó nem felel meg a biztonsági követelményeknek")
      return
    }

    if (password !== confirmPassword) {
      toast.error("A megadott jelszavak nem egyeznek")
      return
    }

    if (assignToCompany && selectedCompanyIds.length === 0) {
      toast.error("Kérjük, válassz ki legalább egy céget a hozzárendeléshez")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await inviteCompanyMemberAction({
        nev: nev.trim(),
        email: email.trim(),
        password,
        companyIds: assignToCompany ? selectedCompanyIds : [],
        role,
        module,
      })

      if (res.success) {
        toast.success(`Felhasználó sikeresen meghívva: ${nev.trim()}`)
        onOpenChange(false)
        setNev("")
        setEmail("")
        setPassword("")
        setConfirmPassword("")
        if (onSuccess) onSuccess()
      } else {
        toast.error(res.error || "Hiba történt a meghívás során")
      }
    } catch {
      toast.error("Váratlan hiba történt a meghívás során")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <UserPlus className="h-4 w-4 text-primary" />
              Felhasználó meghívása
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Új felhasználó létrehozása az {module === "hr" ? "eaisyHR" : "eaisyDocs"} platformon.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-4">
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
                required
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
                placeholder="felhasznalo@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-8 text-xs"
              />
            </div>

            {/* Jelszó */}
            <div className="space-y-1.5">
              <Label htmlFor="invite-password" className="text-xs">
                Jelszó <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="invite-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Erős jelszó"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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

              {/* 4-szegmenses jelszó erősségjelző sáv */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <div
                  className={`h-1 rounded-full transition-colors ${
                    passwordCriteria.filter((c) => c.valid).length >= 1
                      ? passwordCriteria.filter((c) => c.valid).length <= 2
                        ? "bg-amber-500"
                        : "bg-[#02b8cc]"
                      : "bg-muted"
                  }`}
                />
                <div
                  className={`h-1 rounded-full transition-colors ${
                    passwordCriteria.filter((c) => c.valid).length >= 2
                      ? passwordCriteria.filter((c) => c.valid).length <= 3
                        ? "bg-amber-500"
                        : "bg-[#02b8cc]"
                      : "bg-muted"
                  }`}
                />
                <div
                  className={`h-1 rounded-full transition-colors ${
                    passwordCriteria.filter((c) => c.valid).length >= 4
                      ? "bg-[#02b8cc]"
                      : "bg-muted"
                  }`}
                />
                <div
                  className={`h-1 rounded-full transition-colors ${
                    passwordCriteria.every((c) => c.valid)
                      ? "bg-[#02b8cc]"
                      : "bg-muted"
                  }`}
                />
              </div>

              {/* Jelszó erősségi feltételek lista (2 oszlopos elrendezés a screenshot szerint) */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1.5">
                <div className="space-y-1">
                  {[
                    passwordCriteria[0], // Legalább 8 karakter
                    passwordCriteria[2], // Kisbetű (a-z)
                    passwordCriteria[4], // Speciális karakter (!@#$...)
                  ].map((c, i) => (
                    <div
                      key={i}
                      className={`text-[10px] flex items-center gap-1.5 transition-colors ${
                        c.valid
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {c.valid ? (
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                      ) : (
                        <span className="h-3 w-3 shrink-0 flex items-center justify-center text-[11px] leading-none">
                          ×
                        </span>
                      )}
                      <span>{c.label}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {[
                    passwordCriteria[1], // Nagybetű (A-Z)
                    passwordCriteria[3], // Szám (0-9)
                  ].map((c, i) => (
                    <div
                      key={i}
                      className={`text-[10px] flex items-center gap-1.5 transition-colors ${
                        c.valid
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {c.valid ? (
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                      ) : (
                        <span className="h-3 w-3 shrink-0 flex items-center justify-center text-[11px] leading-none">
                          ×
                        </span>
                      )}
                      <span>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Jelszó megerősítése */}
            <div className="space-y-1.5">
              <Label htmlFor="invite-confirm-password" className="text-xs">
                Jelszó megerősítése <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="invite-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Jelszó újra"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`h-8 text-xs pr-8 ${
                    passwordsMismatch ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              {passwordsMismatch && (
                <p className="text-[10px] text-destructive flex items-center gap-1">
                  <X className="h-3 w-3" /> A jelszavak nem egyeznek
                </p>
              )}
            </div>

            {/* Hozzárendelés céghez blokk */}
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

                    <div className="max-h-[140px] overflow-y-auto rounded-md border border-border/60 bg-background divide-y divide-border/40">
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
                      Szerepkör
                    </Label>
                    <Select value={role} onValueChange={(v) => { if (v) setRole(v) }}>
                      <SelectTrigger id="invite-role" className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {module === "docs" ? (
                          <>
                            <SelectItem value="ugyintezo">Ügyintéző</SelectItem>
                            <SelectItem value="iktato">Iratkezelő / Iktató</SelectItem>
                            <SelectItem value="vezeto">Vezető / Szignáló</SelectItem>
                            <SelectItem value="betekinto">Betekintő</SelectItem>
                            <SelectItem value="auditor">Auditor</SelectItem>
                            <SelectItem value="admin">Rendszer Adminisztrátor</SelectItem>
                            <SelectItem value="rendszergazda">Rendszergazda</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="munkavallalo">Munkavállaló</SelectItem>
                            <SelectItem value="hr_munkatars">HR Munkatárs</SelectItem>
                            <SelectItem value="hr_vezeto">HR Vezető</SelectItem>
                            <SelectItem value="vezeto">Vezető (Közvetlen)</SelectItem>
                            <SelectItem value="berugyi">Bérügyi / Bérszámfejtő</SelectItem>
                            <SelectItem value="toborzo">Toborzó (ATS)</SelectItem>
                            <SelectItem value="munkavedelmi">Munkavédelmi Felelős</SelectItem>
                            <SelectItem value="auditor">Auditor</SelectItem>
                            <SelectItem value="admin">Rendszer Adminisztrátor</SelectItem>
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
              disabled={isSubmitting || !isPasswordValid || passwordsMismatch}
              className="h-8 text-xs gap-1.5 bg-[#02b8cc] hover:bg-[#029db0] text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Meghívás folyamatban...
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  Meghívás
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
