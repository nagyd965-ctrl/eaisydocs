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
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Users,
  Loader2,
  CheckCircle2,
  Mail,
  AlertCircle,
  Shield,
  Download,
  X,
} from "lucide-react"
import { toast } from "sonner"
import {
  getEaisyBillCompanyMembersAction,
  importEaisyBillCompanyMembersAction,
  type EaisyBillMemberItem,
  type ImportEaisyBillMemberInput,
} from "@/app/actions/eaisybill-user-actions"

interface EaisyBillMemberImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  companyName: string
  onSuccess?: () => void
}

const DOCS_ROLES: { value: "admin" | "vezeto" | "iktato" | "ugyintezo" | "betekinto"; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "vezeto", label: "Vezető" },
  { value: "iktato", label: "Iktató" },
  { value: "ugyintezo", label: "Ügyintéző" },
  { value: "betekinto", label: "Betekintő" },
]

export function EaisyBillMemberImportDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  onSuccess,
}: EaisyBillMemberImportDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [members, setMembers] = React.useState<EaisyBillMemberItem[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Kijelölt felhasználók és választott szerepkörök (email alapú kulcs)
  const [selectedEmails, setSelectedEmails] = React.useState<Set<string>>(new Set())
  const [selectedRoles, setSelectedRoles] = React.useState<Record<string, "admin" | "vezeto" | "iktato" | "ugyintezo" | "betekinto">>({})

  // Tagok betöltése amikor kinyílik a modál
  React.useEffect(() => {
    if (!open || !companyId) return

    setIsLoading(true)
    setError(null)
    setSearchQuery("")
    setSelectedEmails(new Set())

    getEaisyBillCompanyMembersAction(companyId)
      .then((res) => {
        if (res.success && res.members) {
          setMembers(res.members)
          // Alapértelmezett szerepkörök beállítása
          const initialRoles: Record<string, "admin" | "vezeto" | "iktato" | "ugyintezo" | "betekinto"> = {}
          res.members.forEach((m) => {
            initialRoles[m.email] = m.suggestedDocsRole
          })
          setSelectedRoles(initialRoles)
        } else {
          setError(res.error || "Nem sikerült lekérni a tagokat.")
          setMembers([])
        }
      })
      .catch((err) => {
        console.error("Hiba tagok lekérésekor:", err)
        setError("Hálózati hiba történt a tagok lekérése közben.")
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [open, companyId])

  // Szűrt lista keresés alapján
  const filteredMembers = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.eaisybillRole.toLowerCase().includes(q)
    )
  }, [members, searchQuery])

  // Importálható tagok (akik még nem tagok)
  const importableMembers = React.useMemo(() => {
    return filteredMembers.filter((m) => m.status !== "already_member")
  }, [filteredMembers])

  // Összes kijelölése / törlése toggle
  const allImportableSelected =
    importableMembers.length > 0 &&
    importableMembers.every((m) => selectedEmails.has(m.email))

  const handleToggleSelectAll = () => {
    if (allImportableSelected) {
      setSelectedEmails(new Set())
    } else {
      const next = new Set<string>()
      importableMembers.forEach((m) => next.add(m.email))
      setSelectedEmails(next)
    }
  }

  const handleToggleMember = (email: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev)
      if (next.has(email)) {
        next.delete(email)
      } else {
        next.add(email)
      }
      return next
    })
  }

  const handleRoleChange = (email: string, role: "admin" | "vezeto" | "iktato" | "ugyintezo" | "betekinto") => {
    setSelectedRoles((prev) => ({
      ...prev,
      [email]: role,
    }))
  }

  // Importálás végrehajtása
  const handleImportSubmit = async () => {
    if (selectedEmails.size === 0) {
      toast.error("Válassz ki legalább egy felhasználót az importáláshoz!")
      return
    }

    const payload: ImportEaisyBillMemberInput[] = []
    for (const email of Array.from(selectedEmails)) {
      const member = members.find((m) => m.email === email)
      if (member) {
        payload.push({
          email: member.email,
          name: member.name,
          eaisybillUserId: member.eaisybillUserId,
          docsRole: selectedRoles[email] || member.suggestedDocsRole,
        })
      }
    }

    setIsSubmitting(true)
    try {
      const res = await importEaisyBillCompanyMembersAction(companyId, payload)
      if (res.success) {
        toast.success("Sikeres importálás!", {
          description: `${res.importedCount ?? 0} felhasználó hozzáadva${
            res.invitedCount ? `, ${res.invitedCount} meghívó e-mail kiküldve` : ""
          }.`,
        })
        onOpenChange(false)
        if (onSuccess) {
          onSuccess()
        }
      } else {
        toast.error("Hiba az importálás során", {
          description: res.error,
        })
      }
    } catch (err: any) {
      console.error("Hiba az importálás során:", err)
      toast.error("Váratlan hiba történt az importálás közben.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !isSubmitting && onOpenChange(val)}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* FEJLÉC */}
        <DialogHeader className="p-6 pb-4 border-b border-border/80">
          <div className="flex items-center gap-2 text-primary">
            <Users className="h-5 w-5" />
            <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
              Tagok importálása eaisyBill-ből
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Válaszd ki, mely <span className="font-semibold text-foreground">{companyName}</span> eaisyBill tagokat
            szeretnéd átvenni az iratkezelőbe. Kizárólag a bepipált személyek kapnak hozzáférést és meghívót.
          </DialogDescription>

          {/* KERESŐ ÉS GYORS GOMBOK */}
          {!isLoading && !error && members.length > 0 && (
            <div className="flex items-center gap-3 pt-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Keresés név, e-mail vagy szerepkör szerint..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {importableMembers.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleSelectAll}
                  className="h-8 text-xs shrink-0"
                >
                  {allImportableSelected ? "Kijelölés törlése" : "Összes új kijelölése"}
                </Button>
              )}
            </div>
          )}
        </DialogHeader>

        {/* TÖRZS */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>eaisyBill munkatársak betöltése...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold">Nem sikerült a tagok betöltése</div>
                <div className="text-muted-foreground">{error}</div>
              </div>
            </div>
          ) : members.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
              <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <div className="font-medium text-foreground">Nem találhatók tagok ehhez a céghez</div>
              <div>Az eaisyBill rendszerben nincsenek hozzárendelt felhasználók.</div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Nincs találat a keresési feltételekre.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map((member) => {
                const isAlready = member.status === "already_member"
                const isExisting = member.status === "existing_user"
                const isNew = member.status === "new_user"
                const isSelected = selectedEmails.has(member.email)
                const currentRole = selectedRoles[member.email] || member.suggestedDocsRole

                return (
                  <div
                    key={member.email}
                    onClick={() => {
                      if (!isAlready) handleToggleMember(member.email)
                    }}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isAlready
                        ? "bg-muted/20 border-border/60 opacity-70 cursor-not-allowed"
                        : isSelected
                        ? "bg-primary/5 border-primary/40 cursor-pointer"
                        : "bg-card border-border/80 hover:border-primary/30 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Checkbox
                        id={`cb-${member.email}`}
                        checked={isAlready || isSelected}
                        disabled={isAlready}
                        onCheckedChange={() => {
                          if (!isAlready) handleToggleMember(member.email)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {member.name}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-4 font-mono uppercase tracking-wider px-1.5"
                          >
                            eaisyBill: {member.eaisybillRole}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span>{member.email}</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-2.5 shrink-0 ml-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* ÁLLAPOT JELVÉNY */}
                      {isAlready ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 border-border bg-muted/40 text-muted-foreground gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          Már tag
                        </Badge>
                      ) : isExisting ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5"
                        >
                          Létező fiók
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 border-primary/30 text-primary bg-primary/5"
                        >
                          Új meghívandó
                        </Badge>
                      )}

                      {/* SZEREPKÖR VÁLASZTÓ */}
                      {!isAlready ? (
                        <Select
                          value={currentRole}
                          onValueChange={(val) => {
                            if (val) handleRoleChange(member.email, val as any)
                          }}
                          disabled={!isSelected}
                        >
                          <SelectTrigger className="h-7 text-xs w-28 bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DOCS_ROLES.map((r) => (
                              <SelectItem key={r.value} value={r.value} className="text-xs">
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="text-[11px] text-muted-foreground w-28 text-right font-medium">
                          Helyi jogosultság
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* LÁBLÉC */}
        <DialogFooter className="p-4 px-6 border-t border-border/80 bg-muted/10 flex items-center justify-between sm:justify-between">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>Kizárólag a bepipált személyek kapnak meghívót és jelszóbeállító linket.</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Mégse
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs gap-1.5 bg-[#02b8cc] hover:bg-[#029db0] text-white"
              onClick={handleImportSubmit}
              disabled={isSubmitting || selectedEmails.size === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Importálás folyamatban...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Kijelöltek importálása ({selectedEmails.size} fő)
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
