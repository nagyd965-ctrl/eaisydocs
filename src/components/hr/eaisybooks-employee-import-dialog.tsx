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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Search,
  Users,
  Loader2,
  CheckCircle2,
  Mail,
  AlertCircle,
  Download,
  X,
  Briefcase,
  Building2,
  FileSpreadsheet,
} from "lucide-react"
import { toast } from "sonner"
import {
  getEaisyBooksPayrollEmployeesAction,
  importEaisyBooksPayrollEmployeesAction,
  type EaisyBooksEmployeeItem,
  type ImportEaisyBooksEmployeeInput,
} from "@/app/hr/actions/eaisybooks-employee-actions"

interface EaisyBooksEmployeeImportDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  companyId: string
  companyName: string
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function EaisyBooksEmployeeImportDialog({
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  companyId,
  companyName,
  trigger,
  onSuccess,
}: EaisyBooksEmployeeImportDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = externalOpen !== undefined
  const open = isControlled ? externalOpen : internalOpen
  const onOpenChange = (val: boolean) => {
    if (!isControlled) setInternalOpen(val)
    externalOnOpenChange?.(val)
  }

  const [isLoading, setIsLoading] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [employees, setEmployees] = React.useState<EaisyBooksEmployeeItem[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Kijelölt dolgozók azonosítói (Set<string>)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  // Módosított/megadott e-mail címek dolgozónként (id -> email)
  const [customEmails, setCustomEmails] = React.useState<Record<string, string>>({})

  // Meghívó küldése kapcsoló
  const [sendInviteEmail, setSendInviteEmail] = React.useState(true)

  // Adatok betöltése nyitáskor
  React.useEffect(() => {
    if (!open || !companyId) return

    setIsLoading(true)
    setError(null)
    setSearchQuery("")
    setSelectedIds(new Set())
    setCustomEmails({})

    getEaisyBooksPayrollEmployeesAction(companyId)
      .then((res) => {
        if (res.success && res.employees) {
          setEmployees(res.employees)
          // Alapértelmezetten jelöljük ki az összes importálható dolgozót
          const importableIds = new Set<string>()
          const initialEmails: Record<string, string> = {}

          res.employees.forEach((emp) => {
            if (emp.status === "importable") {
              importableIds.add(emp.id)
            }
            if (emp.email) {
              initialEmails[emp.id] = emp.email
            }
          })
          setSelectedIds(importableIds)
          setCustomEmails(initialEmails)
        } else {
          setError(res.error || "Nem sikerült lekérni a dolgozókat.")
          setEmployees([])
        }
      })
      .catch((err) => {
        console.error("Hiba eaisyBooks dolgozók lekérésekor:", err)
        setError("Hálózati hiba történt a dolgozók betöltésekor.")
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [open, companyId])

  // Szűrt lista keresés alapján
  const filteredEmployees = React.useMemo(() => {
    if (!searchQuery.trim()) return employees
    const q = searchQuery.toLowerCase().trim()
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (customEmails[e.id] || e.email || "").toLowerCase().includes(q) ||
        e.jobTitle.toLowerCase().includes(q) ||
        e.feorCode.includes(q)
    )
  }, [employees, searchQuery, customEmails])

  // Importálható és kijelölhető elemek száma
  const importableFiltered = filteredEmployees.filter((e) => e.status === "importable")
  const allFilteredSelected =
    importableFiltered.length > 0 &&
    importableFiltered.every((e) => selectedIds.has(e.id))

  const toggleSelectAll = () => {
    const next = new Set(selectedIds)
    if (allFilteredSelected) {
      importableFiltered.forEach((e) => next.delete(e.id))
    } else {
      importableFiltered.forEach((e) => next.add(e.id))
    }
    setSelectedIds(next)
  }

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const handleEmailChange = (id: string, value: string) => {
    setCustomEmails((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  // Importálás végrehajtása
  const handleImport = async () => {
    if (selectedIds.size === 0) {
      toast.error("Válassz ki legalább egy importálandó foglalkoztatottat!")
      return
    }

    const payload: ImportEaisyBooksEmployeeInput[] = []
    for (const emp of employees) {
      if (selectedIds.has(emp.id)) {
        payload.push({
          id: emp.id,
          name: emp.name,
          email: (customEmails[emp.id] || emp.email || "").trim(),
          phone: emp.phone,
          jobTitle: emp.jobTitle,
          feorCode: emp.feorCode,
          department: emp.department || undefined,
          startDate: emp.startDate,
          weeklyHours: emp.weeklyHours,
          employmentType: emp.employmentType,
          baseSalary: emp.baseSalary,
          tajNumber: emp.tajNumber,
          taxId: emp.taxId,
          bankAccount: emp.bankAccount,
          idCardNumber: emp.idCardNumber,
          birthName: emp.birthName,
          birthPlace: emp.birthPlace,
          birthDate: emp.birthDate,
          mothersName: emp.mothersName,
          nationality: emp.nationality,
          address: emp.address,
        })
      }
    }

    setIsSubmitting(true)
    try {
      const res = await importEaisyBooksPayrollEmployeesAction({
        targetCompanyId: companyId,
        selectedEmployees: payload,
        sendInviteEmail,
      })

      if (res.success) {
        toast.success(
          `${res.importedCount || 0} foglalkoztatott sikeresen importálva!${
            res.invitedCount && res.invitedCount > 0
              ? ` (${res.invitedCount} meghívó e-mail kiküldve)`
              : ""
          }`
        )
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(res.error || "Hiba történt az importálás során.")
      }
    } catch (err: any) {
      console.error("Importálási hiba:", err)
      toast.error("Nem sikerült végrehajtani az importálást.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!isControlled && (
        trigger ? (
          <DialogTrigger render={trigger as any} />
        ) : (
          <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer">
            <Download className="h-4 w-4 mr-2 text-teal-600" />
            Importálás eaisyBooks-ból
          </DialogTrigger>
        )
      )}
      <DialogContent className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Fejléc */}
        <DialogHeader className="p-6 pb-4 border-b pr-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold tracking-tight">
                  Foglalkoztatottak importálása eaisyBooks-ból
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Vállalat: <strong className="text-foreground">{companyName}</strong> • Bérszámfejtési állomány átvétele az eaisyHR-be
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Keresősáv */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Keresés név, munkakör vagy e-mail alapján..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 text-sm h-9 bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Törzs / Táblázat */}
        <div className="flex-1 overflow-y-auto p-6 pt-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
              <p className="text-sm">Foglalkoztatottak lekérése az eaisyBooks bérszámfejtésből...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="p-3 rounded-full bg-destructive/10 text-destructive mb-3">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-sm">Hiba a dolgozók lekérdezésekor</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">{error}</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-3 rounded-full bg-muted text-muted-foreground mb-3">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-sm">Nincsenek elérhető dolgozók</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Az eaisyBooks bérszámfejtési moduljában ehhez a vállalathoz jelenleg nincsenek rögzített foglalkoztatottak.
              </p>
            </div>
          ) : (
            <div className="border rounded-md overflow-x-auto w-full">
              <table className="w-full min-w-[760px] text-left text-sm border-collapse">
                <thead className="bg-muted/50 text-xs text-muted-foreground font-medium border-b select-none">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center shrink-0">
                      <Checkbox
                        checked={allFilteredSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Összes kijelölése"
                        disabled={importableFiltered.length === 0}
                      />
                    </th>
                    <th className="py-2.5 px-3 font-medium min-w-[180px]">Dolgozó</th>
                    <th className="py-2.5 px-3 font-medium min-w-[180px]">Munkakör & FEOR</th>
                    <th className="py-2.5 px-3 font-medium min-w-[210px]">E-mail cím</th>
                    <th className="py-2.5 px-3 font-medium min-w-[140px]">Azonosítók</th>
                    <th className="py-2.5 px-3 font-medium w-24 text-right shrink-0">Belépés</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEmployees.map((emp) => {
                    const isAlreadyImported = emp.status === "already_imported"
                    const isSelected = selectedIds.has(emp.id)
                    const currentEmail = customEmails[emp.id] ?? emp.email ?? ""

                    return (
                      <tr
                        key={emp.id}
                        className={`transition-colors ${
                          isAlreadyImported
                            ? "bg-muted/30 opacity-75"
                            : isSelected
                            ? "bg-teal-500/5 hover:bg-teal-500/10"
                            : "hover:bg-muted/30"
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 px-3 text-center align-middle">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectOne(emp.id)}
                            disabled={isAlreadyImported}
                            aria-label={`Kijelölés: ${emp.name}`}
                          />
                        </td>

                        {/* Név & Státusz */}
                        <td className="py-2.5 px-3 align-middle">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground text-sm leading-tight">
                              {emp.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                              {isAlreadyImported ? (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] font-normal px-1.5 py-0 h-4 bg-muted text-muted-foreground border-border"
                                >
                                  Már állományban van
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-normal px-1.5 py-0 h-4 border-teal-500/40 text-teal-600 dark:text-teal-400 bg-teal-500/10"
                                >
                                  Importálható
                                </Badge>
                              )}
                              {emp.phone && (
                                <span className="text-[11px] text-muted-foreground">
                                  {emp.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Munkakör & FEOR */}
                        <td className="py-2.5 px-3 align-middle">
                          <div className="flex flex-col">
                            <span className="text-sm text-foreground font-medium">
                              {emp.jobTitle}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {emp.feorCode ? `FEOR: ${emp.feorCode}` : "FEOR: —"} • {emp.weeklyHours}h/hét
                            </span>
                          </div>
                        </td>

                        {/* E-mail cím mező (szerkeszthető) */}
                        <td className="py-2.5 px-3 align-middle">
                          {isAlreadyImported ? (
                            <span className="text-xs text-muted-foreground font-mono">
                              {currentEmail || "—"}
                            </span>
                          ) : (
                            <Input
                              type="email"
                              placeholder="dolgozo@ceg.hu"
                              value={currentEmail}
                              onChange={(e) => handleEmailChange(emp.id, e.target.value)}
                              className="h-8 text-xs bg-background max-w-[220px]"
                              disabled={!isSelected}
                            />
                          )}
                        </td>

                        {/* Maszkolt azonosítók */}
                        <td className="py-2.5 px-3 align-middle">
                          <div className="flex flex-col text-[11px] tabular-nums text-muted-foreground font-mono">
                            <span>TAJ: {emp.maskedTaj}</span>
                            <span>Adó: {emp.maskedTaxId}</span>
                          </div>
                        </td>

                        {/* Belépési dátum */}
                        <td className="py-2.5 px-3 align-middle text-right">
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {emp.startDate}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Lábléc */}
        <DialogFooter className="p-4 px-6 border-t bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <Checkbox
              id="send-invite-checkbox"
              checked={sendInviteEmail}
              onCheckedChange={(checked) => setSendInviteEmail(!!checked)}
              disabled={isSubmitting || selectedIds.size === 0}
            />
            <label
              htmlFor="send-invite-checkbox"
              className="cursor-pointer select-none text-foreground font-medium text-xs flex items-center gap-1.5 whitespace-nowrap"
            >
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              Meghívó e-mail küldése a munkatársaknak (jelszóbeállító linkkel)
            </label>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
              {selectedIds.size} / {employees.filter((e) => e.status === "importable").length} dolgozó kijelölve
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Mégse
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleImport}
              disabled={isSubmitting || selectedIds.size === 0}
              className="bg-teal-600 hover:bg-teal-700 text-white font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Importálás folyamatban...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Kijelöltek importálása ({selectedIds.size} fő)
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
