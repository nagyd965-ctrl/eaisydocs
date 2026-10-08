"use client"

import * as React from "react"
import { Shield, Loader2, Check, UserCheck } from "lucide-react"
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
      setDocsRole(member.docs_szerepkor || "ugyintezo")
      setHrRole(member.hr_szerepkor || "munkavallalo")
    }
  }, [member])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!member) return

    setIsSubmitting(true)
    try {
      const res = await updateCompanyMemberRoleAction({
        companyId,
        memberId: member.id,
        role,
        docs_szerepkor: docsRole,
        hr_szerepkor: hrRole,
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
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <UserCheck className="h-4 w-4 text-primary" />
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
              <span className="text-[10px] text-muted-foreground">
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
                onValueChange={(val) => setRole(val as "admin" | "member")}
              >
                <SelectTrigger id="company-role" className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Tag (Munkavállaló)</SelectItem>
                  <SelectItem value="admin">Adminisztrátor (Cég adminisztráció)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Az adminisztrátor kezelheti a cég beállításait, de a vállalatot nem törölheti.
              </p>
            </div>

            {/* eaisyDocs szerepkör */}
            <div className="space-y-1.5">
              <Label htmlFor="docs-role" className="text-xs">
                eaisyDocs szerepkör (Iratkezelés)
              </Label>
              <Select value={docsRole} onValueChange={(val) => { if (val) setDocsRole(val) }}>
                <SelectTrigger id="docs-role" className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ugyintezo">Ügyintéző</SelectItem>
                  <SelectItem value="iktato">Iktató</SelectItem>
                  <SelectItem value="vezeto">Vezető (Osztályvezető)</SelectItem>
                  <SelectItem value="betekinto">Betekintő</SelectItem>
                  <SelectItem value="auditor">Auditor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="rendszergazda">Rendszergazda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* eaisyHR szerepkör */}
            <div className="space-y-1.5">
              <Label htmlFor="hr-role" className="text-xs">
                eaisyHR szerepkör (Személyügy)
              </Label>
              <Select value={hrRole} onValueChange={(val) => { if (val) setHrRole(val) }}>
                <SelectTrigger id="hr-role" className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="munkavallalo">Munkavállaló</SelectItem>
                  <SelectItem value="hr_munkatars">HR Munkatárs</SelectItem>
                  <SelectItem value="hr_vezeto">HR Vezető</SelectItem>
                  <SelectItem value="vezeto">Vezető</SelectItem>
                  <SelectItem value="berugyi">Bérügyi munkatárs</SelectItem>
                  <SelectItem value="toborzo">Toborzó</SelectItem>
                  <SelectItem value="munkavedelmi">Munkavédelmi felelős</SelectItem>
                  <SelectItem value="auditor">Auditor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
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
              className="h-8 text-xs bg-[#02b8cc] hover:bg-[#029db0] text-white"
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
