"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateCompanyMemberRoleAction } from "@/app/actions/company-actions"
import { toast } from "sonner"
import type { CompanyMemberWithProfile } from "@/types/company"

interface EditMemberRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: CompanyMemberWithProfile | null
  companyId: string
  module?: "docs" | "hr"
  onSuccess: () => void
}

const COMPANY_ROLE_LABELS: Record<string, string> = {
  member: "Tag (Munkavállaló)",
  admin: "Admin (Cég adminisztráció)",
}

const DOCS_ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  rendszergazda: "Rendszergazda",
  vezeto: "Vezető (Osztályvezető)",
  iktato: "Iratkezelő / Iktató",
  ugyintezo: "Ügyintéző",
  betekinto: "Betekintő",
  auditor: "Auditor",
}

const HR_ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  hr_vezeto: "HR Vezető",
  hr_munkatars: "HR Munkatárs",
  vezeto: "Vezető",
  berugyi: "Bérügyi munkatárs",
  toborzo: "Toborzó",
  munkavedelmi: "Munkavédelmi felelős",
  munkavallalo: "Munkavállaló",
  auditor: "Auditor",
}

export function EditMemberRoleDialog({
  open,
  onOpenChange,
  member,
  companyId,
  module = "docs",
  onSuccess,
}: EditMemberRoleDialogProps) {
  const [role, setRole] = React.useState<"admin" | "member">("member")
  const [docsRole, setDocsRole] = React.useState<string>("ugyintezo")
  const [hrRole, setHrRole] = React.useState<string>("munkavallalo")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (member) {
      setRole(member.role === "admin" ? "admin" : "member")
      setDocsRole(member.docs_szerepkor || (member.role === "admin" ? "admin" : "ugyintezo"))
      setHrRole(member.hr_szerepkor || (member.role === "admin" ? "admin" : "munkavallalo"))
    }
  }, [member])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!member) return

    const effectiveCompanyRole: "admin" | "member" =
      module === "docs"
        ? docsRole === "admin" || docsRole === "rendszergazda"
          ? "admin"
          : role
        : hrRole === "admin" || hrRole === "hr_vezeto"
        ? "admin"
        : role

    setIsSubmitting(true)
    try {
      const res = await updateCompanyMemberRoleAction({
        companyId,
        memberId: member.id,
        role: effectiveCompanyRole,
        docs_szerepkor: module === "docs" ? docsRole : member.docs_szerepkor ?? null,
        hr_szerepkor: module === "hr" ? hrRole : member.hr_szerepkor ?? null,
      })

      if (res.success) {
        toast.success(`A(z) ${member.user_nev || "felhasználó"} szerepkörei sikeresen módosítva`)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.error || "Hiba történt a szerepkörök mentésekor")
      }
    } catch {
      toast.error("Váratlan hiba történt a mentés során")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!member) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Tag szerepkörének módosítása
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Módosítsd a kiválasztott felhasználó vállalati és moduláris jogosultságait.
            </DialogDescription>
          </DialogHeader>

          {/* Felhasználó adatai információs kártya */}
          <div className="mt-3 p-3 rounded-lg border border-border/60 bg-muted/30 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                {member.user_nev || "Névtelen felhasználó"}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                ID: {member.user_id.slice(0, 8)}...
              </span>
            </div>
            {member.user_email && (
              <div className="text-[11px] text-muted-foreground">{member.user_email}</div>
            )}
          </div>

          <div className="space-y-3.5 py-4">
            {/* Cég szintű szerepkör */}
            <div className="space-y-1.5">
              <Label htmlFor="company-role" className="text-xs">
                Cég jogosultsági szint
              </Label>
              <Select
                value={role}
                onValueChange={(val) => {
                  if (val === "admin" || val === "member") {
                    setRole(val)
                    if (val === "admin" && module === "docs") setDocsRole("admin")
                    if (val === "admin" && module === "hr") setHrRole("admin")
                  }
                }}
              >
                <SelectTrigger id="company-role" className="h-8 text-xs">
                  <SelectValue>{COMPANY_ROLE_LABELS[role] || role}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Tag (Munkavállaló)</SelectItem>
                  <SelectItem value="admin">Admin (Cég adminisztráció)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Az adminisztrátor kezelheti a cég beállításait és tagjait.
              </p>
            </div>

            {module === "docs" ? (
              /* eaisyDocs szerepkör */
              <div className="space-y-1.5">
                <Label htmlFor="docs-role" className="text-xs">
                  eaisyDocs szerepkör (Iratkezelés)
                </Label>
                <Select
                  value={docsRole}
                  onValueChange={(val) => {
                    if (val) {
                      setDocsRole(val)
                      if (val === "admin" || val === "rendszergazda") {
                        setRole("admin")
                      }
                    }
                  }}
                >
                  <SelectTrigger id="docs-role" className="h-8 text-xs">
                    <SelectValue>{DOCS_ROLE_LABELS[docsRole] || docsRole}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="rendszergazda">Rendszergazda</SelectItem>
                    <SelectItem value="vezeto">Vezető (Osztályvezető)</SelectItem>
                    <SelectItem value="iktato">Iratkezelő / Iktató</SelectItem>
                    <SelectItem value="ugyintezo">Ügyintéző</SelectItem>
                    <SelectItem value="betekinto">Betekintő</SelectItem>
                    <SelectItem value="auditor">Auditor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              /* eaisyHR szerepkör */
              <div className="space-y-1.5">
                <Label htmlFor="hr-role" className="text-xs">
                  eaisyHR szerepkör (Személyügy)
                </Label>
                <Select
                  value={hrRole}
                  onValueChange={(val) => {
                    if (val) {
                      setHrRole(val)
                      if (val === "admin" || val === "hr_vezeto") {
                        setRole("admin")
                      }
                    }
                  }}
                >
                  <SelectTrigger id="hr-role" className="h-8 text-xs">
                    <SelectValue>{HR_ROLE_LABELS[hrRole] || hrRole}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="hr_vezeto">HR Vezető</SelectItem>
                    <SelectItem value="hr_munkatars">HR Munkatárs</SelectItem>
                    <SelectItem value="vezeto">Vezető</SelectItem>
                    <SelectItem value="berugyi">Bérügyi munkatárs</SelectItem>
                    <SelectItem value="toborzo">Toborzó</SelectItem>
                    <SelectItem value="munkavedelmi">Munkavédelmi felelős</SelectItem>
                    <SelectItem value="munkavallalo">Munkavállaló</SelectItem>
                    <SelectItem value="auditor">Auditor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
                  Mentés...
                </>
              ) : (
                "Szerepkörök mentése"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
