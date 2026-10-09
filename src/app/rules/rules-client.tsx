"use client"

import React, { useState, useTransition } from "react"
import {
  Sliders,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Brain,
  Lightbulb,
  Shield,
  Activity,
  Info,
  Loader2,
  ToggleLeft,
  FileText,
  Users,
  Coins,
  Search,
  CheckCircle2,
  Building2,
  Tag,
  ArrowRight,
  BookOpen,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  createCompanyPromptRule,
  updateCompanyPromptRule,
  toggleCompanyPromptRuleActive,
  deleteCompanyPromptRule,
} from "./rules-actions"
import {
  createCompanyFilingRule,
  updateCompanyFilingRule,
  toggleCompanyFilingRuleActive,
  deleteCompanyFilingRule,
} from "./filing-rules-actions"
import {
  RULE_TEMPLATES_HU,
  type PromptRuleItem,
  type RuleTemplate,
  type RuleCategory,
} from "@/utils/prompt-rules-helper"
import { type CompanyFilingRule } from "@/utils/filing-rules-engine"
import { cn } from "@/lib/utils"

interface RulesClientProps {
  initialPromptRules: PromptRuleItem[]
  initialFilingRules: CompanyFilingRule[]
  departments: Array<{ id: string; nev: string }>
  irattariTervek: Array<{ id: string; tetelszam: string; megnevezes: string }>
  activeCompany?: {
    id: string
    name: string
    tax_number?: string | null
  } | null
}

const CATEGORY_MAP: Record<string, { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }> = {
  iktatas: {
    label: "Iktatás és Besorolás",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: FileText,
  },
  felelos: {
    label: "Felelős és Részleg",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    icon: Users,
  },
  penzugy: {
    label: "Pénzügyi megjegyzés",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: Coins,
  },
  altalanos: {
    label: "Általános szabály",
    badgeClass: "bg-muted text-muted-foreground border-border",
    icon: Sparkles,
  },
}

export function RulesClient({
  initialPromptRules,
  initialFilingRules,
  departments,
  irattariTervek,
  activeCompany,
}: RulesClientProps) {
  const [activeTab, setActiveTab] = useState<"filing" | "prompt">("filing")

  // State: Deterministic Filing Rules
  const [filingRules, setFilingRules] = useState<CompanyFilingRule[]>(initialFilingRules)
  const [filingSearch, setFilingSearch] = useState("")

  // State: AI Prompt Rules
  const [promptRules, setPromptRules] = useState<PromptRuleItem[]>(initialPromptRules)
  const [promptCategoryFilter, setPromptCategoryFilter] = useState<string>("all")
  const [promptSearch, setPromptSearch] = useState<string>("")

  const [isPending, startTransition] = useTransition()

  // Modal State: Filing Rule
  const [filingDialogOpen, setFilingDialogOpen] = useState(false)
  const [editingFilingRule, setEditingFilingRule] = useState<CompanyFilingRule | null>(null)
  const [frName, setFrName] = useState("")
  const [frSearchPattern, setFrSearchPattern] = useState("")
  const [frPartnerName, setFrPartnerName] = useState("")
  const [frPartnerTax, setFrPartnerTax] = useState("")
  const [frMatchType, setFrMatchType] = useState<"contains" | "exact" | "starts_with">("contains")
  const [frDeptId, setFrDeptId] = useState<string>("none")
  const [frPlanId, setFrPlanId] = useState<string>("none")
  const [frDocType, setFrDocType] = useState<string>("none")
  const [frPrefix, setFrPrefix] = useState("")
  const [frScope, setFrScope] = useState<"company" | "all">("company")

  // Modal State: Prompt Rule
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)
  const [editingPromptRule, setEditingPromptRule] = useState<PromptRuleItem | null>(null)
  const [prName, setPrName] = useState("")
  const [prPrompt, setPrPrompt] = useState("")
  const [prCategory, setPrCategory] = useState<RuleCategory>("iktatas")

  // Delete Confirmations
  const [deleteTargetFiling, setDeleteTargetFiling] = useState<CompanyFilingRule | null>(null)
  const [deleteTargetPrompt, setDeleteTargetPrompt] = useState<PromptRuleItem | null>(null)

  const activeCompanyName = activeCompany?.name || "Kiválasztott cég"

  // --------------------------------------------------------------------------------
  // FILING RULES HANDLERS
  // --------------------------------------------------------------------------------
  const handleOpenCreateFiling = () => {
    setEditingFilingRule(null)
    setFrName("")
    setFrSearchPattern("")
    setFrPartnerName("")
    setFrPartnerTax("")
    setFrMatchType("contains")
    setFrDeptId("none")
    setFrPlanId("none")
    setFrDocType("none")
    setFrPrefix("")
    setFrScope("company")
    setFilingDialogOpen(true)
  }

  const handleOpenEditFiling = (rule: CompanyFilingRule) => {
    setEditingFilingRule(rule)
    setFrName(rule.rule_name)
    setFrSearchPattern(rule.search_pattern || "")
    setFrPartnerName(rule.partner_name || "")
    setFrPartnerTax(rule.partner_tax_number || "")
    setFrMatchType(rule.match_type || "contains")
    setFrDeptId(rule.target_department_id || "none")
    setFrPlanId(rule.target_irattari_tetel_id || "none")
    setFrDocType(rule.target_document_type || "none")
    setFrPrefix(rule.target_subject_prefix || "")
    setFrScope(rule.scope || "company")
    setFilingDialogOpen(true)
  }

  const handleSubmitFiling = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!frName.trim()) {
      toast.error("A szabály megnevezése kötelező.")
      return
    }
    if (!frSearchPattern.trim() && !frPartnerName.trim() && !frPartnerTax.trim()) {
      toast.error("Legalább egy keresési feltételt meg kell adni (szövegminta, partner vagy adószám).")
      return
    }

    startTransition(async () => {
      const payload = {
        rule_name: frName.trim(),
        search_pattern: frSearchPattern.trim() || null,
        partner_name: frPartnerName.trim() || null,
        partner_tax_number: frPartnerTax.trim() || null,
        match_type: frMatchType,
        target_department_id: frDeptId !== "none" ? frDeptId : null,
        target_irattari_tetel_id: frPlanId !== "none" ? frPlanId : null,
        target_document_type: frDocType !== "none" ? frDocType : null,
        target_subject_prefix: frPrefix.trim() || null,
        scope: frScope,
      }

      if (editingFilingRule && editingFilingRule.id) {
        const res = await updateCompanyFilingRule({
          ruleId: editingFilingRule.id,
          ...payload,
        })
        if (!res.success) {
          toast.error(res.error || "Hiba történt a módosítás során.")
          return
        }

        const deptObj = departments.find((d) => d.id === payload.target_department_id)
        const planObj = irattariTervek.find((p) => p.id === payload.target_irattari_tetel_id)

        setFilingRules((prev) =>
          prev.map((r) =>
            r.id === editingFilingRule.id
              ? {
                  ...r,
                  ...payload,
                  szervezeti_egyseg: deptObj ? { id: deptObj.id, nev: deptObj.nev } : null,
                  irattari_terv: planObj
                    ? { id: planObj.id, tetelszam: planObj.tetelszam, megnevezes: planObj.megnevezes }
                    : null,
                  updated_at: new Date().toISOString(),
                }
              : r
          )
        )
        toast.success("Iktatási szabály sikeresen frissítve.")
      } else {
        const res = await createCompanyFilingRule({
          companyId: activeCompany?.id,
          ...payload,
        })
        if (!res.success || !res.data) {
          toast.error(res.error || "Nem sikerült létrehozni a szabályt.")
          return
        }
        setFilingRules((prev) => [res.data!, ...prev])
        toast.success("Új iktatási szabály sikeresen elmentve.")
      }

      setFilingDialogOpen(false)
    })
  }

  const handleToggleFiling = async (rule: CompanyFilingRule) => {
    if (!rule.id) return
    const newStatus = !rule.is_active

    setFilingRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, is_active: newStatus } : r))
    )

    startTransition(async () => {
      const res = await toggleCompanyFilingRuleActive(rule.id!, newStatus)
      if (!res.success) {
        toast.error("Nem sikerült módosítani a szabály állapotát.")
        setFilingRules((prev) =>
          prev.map((r) => (r.id === rule.id ? { ...r, is_active: !newStatus } : r))
        )
      } else {
        toast.success(newStatus ? "Szabály bekapcsolva." : "Szabály kikapcsolva.")
      }
    })
  }

  const handleConfirmDeleteFiling = async () => {
    if (!deleteTargetFiling || !deleteTargetFiling.id) return
    const id = deleteTargetFiling.id

    startTransition(async () => {
      const res = await deleteCompanyFilingRule(id)
      if (!res.success) {
        toast.error("Nem sikerült törölni a szabályt.")
      } else {
        setFilingRules((prev) => prev.filter((r) => r.id !== id))
        toast.success("Iktatási szabály törölve.")
      }
      setDeleteTargetFiling(null)
    })
  }

  // --------------------------------------------------------------------------------
  // PROMPT RULES HANDLERS
  // --------------------------------------------------------------------------------
  const handleOpenCreatePrompt = () => {
    setEditingPromptRule(null)
    setPrName("")
    setPrPrompt("")
    setPrCategory("iktatas")
    setPromptDialogOpen(true)
  }

  const handleOpenEditPrompt = (rule: PromptRuleItem) => {
    setEditingPromptRule(rule)
    setPrName(rule.rule_name)
    setPrPrompt(rule.rule_prompt)
    setPrCategory((rule.category as RuleCategory) || "iktatas")
    setPromptDialogOpen(true)
  }

  const handleApplyTemplatePrompt = (template: RuleTemplate) => {
    setEditingPromptRule(null)
    setPrName(template.name)
    setPrPrompt(template.prompt)
    setPrCategory(template.category)
    setPromptDialogOpen(true)
  }

  const handleSubmitPrompt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prName.trim() || !prPrompt.trim()) {
      toast.error("Kérjük, add meg a szabály nevét és az AI instrukciót.")
      return
    }

    startTransition(async () => {
      if (editingPromptRule && editingPromptRule.id) {
        const res = await updateCompanyPromptRule({
          ruleId: editingPromptRule.id,
          ruleName: prName,
          rulePrompt: prPrompt,
          category: prCategory,
        })
        if (!res.success) {
          toast.error(res.error || "Nem sikerült menteni a módosításokat.")
          return
        }

        setPromptRules((prev) =>
          prev.map((r) =>
            r.id === editingPromptRule.id
              ? {
                  ...r,
                  rule_name: prName.trim(),
                  rule_prompt: prPrompt.trim(),
                  category: prCategory,
                  updated_at: new Date().toISOString(),
                }
              : r
          )
        )
        toast.success("AI Prompt szabály sikeresen frissítve.")
      } else {
        const res = await createCompanyPromptRule({
          companyId: activeCompany?.id,
          ruleName: prName,
          rulePrompt: prPrompt,
          category: prCategory,
        })
        if (!res.success || !res.data) {
          toast.error(res.error || "Nem sikerült létrehozni a szabályt.")
          return
        }
        setPromptRules((prev) => [res.data!, ...prev])
        toast.success("AI Prompt szabály sikeresen hozzáadva.")
      }

      setPromptDialogOpen(false)
    })
  }

  const handleTogglePrompt = async (rule: PromptRuleItem) => {
    if (!rule.id) return
    const newStatus = !rule.is_active

    setPromptRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, is_active: newStatus } : r))
    )

    startTransition(async () => {
      const res = await toggleCompanyPromptRuleActive(rule.id!, newStatus)
      if (!res.success) {
        toast.error("Nem sikerült módosítani a szabály állapotát.")
        setPromptRules((prev) =>
          prev.map((r) => (r.id === rule.id ? { ...r, is_active: !newStatus } : r))
        )
      } else {
        toast.success(newStatus ? "Szabály bekapcsolva." : "Szabály inaktiválva.")
      }
    })
  }

  const handleConfirmDeletePrompt = async () => {
    if (!deleteTargetPrompt || !deleteTargetPrompt.id) return
    const id = deleteTargetPrompt.id

    startTransition(async () => {
      const res = await deleteCompanyPromptRule(id)
      if (!res.success) {
        toast.error("Nem sikerült törölni a szabályt.")
      } else {
        setPromptRules((prev) => prev.filter((r) => r.id !== id))
        toast.success("AI Prompt szabály törölve.")
      }
      setDeleteTargetPrompt(null)
    })
  }

  // Filtered views
  const filteredFilingRules = filingRules.filter((r) => {
    if (!filingSearch.trim()) return true
    const q = filingSearch.toLowerCase()
    return (
      r.rule_name.toLowerCase().includes(q) ||
      (r.search_pattern && r.search_pattern.toLowerCase().includes(q)) ||
      (r.partner_name && r.partner_name.toLowerCase().includes(q)) ||
      (r.partner_tax_number && r.partner_tax_number.includes(q)) ||
      (r.target_subject_prefix && r.target_subject_prefix.toLowerCase().includes(q))
    )
  })

  const filteredPromptRules = promptRules.filter((r) => {
    const matchesCategory = promptCategoryFilter === "all" || r.category === promptCategoryFilter
    const matchesSearch =
      !promptSearch.trim() ||
      r.rule_name.toLowerCase().includes(promptSearch.toLowerCase()) ||
      r.rule_prompt.toLowerCase().includes(promptSearch.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Fejléc */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2.5">
            <Sliders className="h-7 w-7 text-primary" />
            Iktatási és Könyvelési Szabályok
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-[850px]">
            Kezeld az automatikus iktatási minta-szabályokat és az egyedi AI prompt instrukciókat. (<strong>{activeCompanyName}</strong>)
          </p>
        </div>

        {activeTab === "filing" ? (
          <Button
            onClick={handleOpenCreateFiling}
            className="gap-2 shrink-0 font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-none"
          >
            <Plus className="h-4 w-4" />
            Új iktatási szabály
          </Button>
        ) : (
          <Button
            onClick={handleOpenCreatePrompt}
            className="gap-2 shrink-0 font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-none"
          >
            <Plus className="h-4 w-4" />
            Új prompt szabály
          </Button>
        )}
      </div>

      {/* Felső Fülválasztó (Visibill minta) */}
      <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-xl border border-border/60 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("filing")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
            activeTab === "filing"
              ? "bg-background text-foreground shadow-sm border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Sliders className="h-4 w-4 text-primary" />
          <span>Iktatási Szabályok</span>
          <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
            {filingRules.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("prompt")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
            activeTab === "prompt"
              ? "bg-background text-foreground shadow-sm border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Brain className="h-4 w-4 text-primary" />
          <span>AI Prompt Könyvtár</span>
          <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
            {promptRules.length}
          </span>
        </button>
      </div>

      {/* -------------------------------------------------------------------------------- */}
      {/* 1. FÜL: AUTOMATA IKTATÁSI SZABÁLYOK (Visibill "Számlatétel szabályok" mintájára) */}
      {/* -------------------------------------------------------------------------------- */}
      {activeTab === "filing" && (
        <div className="space-y-4">
          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Számla- és Iratiktatási Szabályok
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Automatikus tétel- és partnerszintű szabályok számlákhoz és iratokhoz (célosztály, irattári tétel, típus és előtag hozzárendelés).
                  </CardDescription>
                </div>
              </div>

              {/* Keresősáv */}
              <div className="pt-3">
                <div className="relative">
                  <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Keresés szabálynév, minta, célosztály vagy partner alapján..."
                    value={filingSearch}
                    onChange={(e) => setFilingSearch(e.target.value)}
                    className="pl-9 h-9 text-xs bg-muted/20 border-border/60"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredFilingRules.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-14 border-border/40">
                  <div className="w-14 h-14 rounded-full bg-muted/40 border border-border flex items-center justify-center text-muted-foreground/60 mb-4">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <h3 className="font-semibold text-foreground text-base">Nincs rögzített iktatási szabály</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-sm">
                    Hozz létre determinisztikus szabályt, hogy az AI vagy az iktatás azonnal kitöltse a célszervezetet, irattári tételt és előtagot!
                  </p>
                  <Button
                    onClick={handleOpenCreateFiling}
                    size="sm"
                    className="mt-4 gap-1.5 text-xs font-medium bg-primary text-primary-foreground shadow-none"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Új szabály létrehozása
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {filteredFilingRules.map((rule) => {
                    const deptName = rule.szervezeti_egyseg?.nev || "Nincs megadva"
                    const planText = rule.irattari_terv
                      ? `${rule.irattari_terv.tetelszam} - ${rule.irattari_terv.megnevezes}`
                      : "Nincs megadva"

                    return (
                      <div
                        key={rule.id}
                        className={cn(
                          "p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors hover:bg-muted/30",
                          !rule.is_active && "opacity-60 bg-muted/20"
                        )}
                      >
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4
                              className={cn(
                                "font-semibold text-foreground text-sm",
                                !rule.is_active && "line-through text-muted-foreground"
                              )}
                            >
                              {rule.rule_name}
                            </h4>

                            {rule.scope === "all" ? (
                              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                                Minden cégre érvényes
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                Csak ez a cég
                              </Badge>
                            )}

                            {rule.is_active ? (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium px-2 py-0.5 rounded-full border border-emerald-500/20">
                                Aktív
                              </span>
                            ) : (
                              <span className="text-[10px] bg-muted text-muted-foreground font-medium px-2 py-0.5 rounded-full border border-border">
                                Kikapcsolva
                              </span>
                            )}
                          </div>

                          {/* Keresési feltételek */}
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            <span className="text-muted-foreground font-medium">Illeszkedés:</span>
                            {rule.search_pattern && (
                              <span className="px-2 py-0.5 rounded bg-muted/60 border border-border/60 font-mono text-[11px] text-foreground">
                                Szöveg: "{rule.search_pattern}"
                              </span>
                            )}
                            {rule.partner_name && (
                              <span className="px-2 py-0.5 rounded bg-muted/60 border border-border/60 text-[11px] text-foreground">
                                Partner: {rule.partner_name}
                              </span>
                            )}
                            {rule.partner_tax_number && (
                              <span className="px-2 py-0.5 rounded bg-muted/60 border border-border/60 font-mono text-[11px] text-foreground">
                                Adószám: {rule.partner_tax_number}
                              </span>
                            )}
                            <span className="text-[11px] text-muted-foreground">({rule.match_type || "tartalmazza"})</span>
                          </div>

                          {/* Cél hozzárendelések */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 text-xs">
                            <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/30 border border-border/40">
                              <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="text-muted-foreground shrink-0">Osztály:</span>
                              <span className="font-medium text-foreground truncate">{deptName}</span>
                            </div>

                            <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/30 border border-border/40">
                              <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="text-muted-foreground shrink-0">Irattár:</span>
                              <span className="font-medium text-foreground truncate">{planText}</span>
                            </div>

                            <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/30 border border-border/40">
                              <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="text-muted-foreground shrink-0">Típus:</span>
                              <span className="font-medium text-foreground uppercase text-[11px]">
                                {rule.target_document_type || "Nem felülírt"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/30 border border-border/40">
                              <span className="font-mono text-primary font-bold text-xs">[#]</span>
                              <span className="text-muted-foreground shrink-0">Előtag:</span>
                              <span className="font-mono font-semibold text-foreground truncate">
                                {rule.target_subject_prefix || "Nincs"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 pt-1">
                          <Switch
                            checked={rule.is_active !== false}
                            onCheckedChange={() => handleToggleFiling(rule)}
                            aria-label="Szabály bekapcsolása"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEditFiling(rule)}
                            title="Szerkesztés"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTargetFiling(rule)}
                            title="Törlés"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* -------------------------------------------------------------------------------- */}
      {/* 2. FÜL: AI PROMPT KÖNYVTÁR (Összetett természetes nyelvű instrukciók) */}
      {/* -------------------------------------------------------------------------------- */}
      {activeTab === "prompt" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Bal oszlop: Aktív Szabályok (2/3) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Szűrők és keresősáv */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/20 p-2.5 rounded-lg border border-border/60">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <Button
                  variant={promptCategoryFilter === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPromptCategoryFilter("all")}
                  className="h-8 text-xs font-medium px-3"
                >
                  Összes ({promptRules.length})
                </Button>
                <Button
                  variant={promptCategoryFilter === "iktatas" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPromptCategoryFilter("iktatas")}
                  className="h-8 text-xs font-medium px-3 gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Iktatás és Besorolás
                </Button>
                <Button
                  variant={promptCategoryFilter === "felelos" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPromptCategoryFilter("felelos")}
                  className="h-8 text-xs font-medium px-3 gap-1.5"
                >
                  <Users className="h-3.5 w-3.5" />
                  Felelős és Részleg
                </Button>
              </div>

              <div className="sm:w-48 shrink-0">
                <Input
                  placeholder="Keresés prompt..."
                  value={promptSearch}
                  onChange={(e) => setPromptSearch(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>

            <Card className="border-border/60 shadow-none">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      Aktív AI Prompt Szabályok
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      A Gemini LLM dokumentum-felismerő által kötelező prioritásként érvényesített direktívák
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs px-2.5 py-0.5 font-normal">
                    {filteredPromptRules.length} megjelenítve
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {filteredPromptRules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-12 border-t border-border/40">
                    <div className="w-14 h-14 rounded-full bg-muted/40 border border-border flex items-center justify-center text-muted-foreground/60 mb-4">
                      <ToggleLeft className="h-7 w-7" />
                    </div>
                    <h3 className="font-semibold text-foreground text-base">Nincsenek prompt szabályok</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-sm">
                      Még nem adtál hozzá AI prompt szabályt. Használj egy sablont a jobb oldalról!
                    </p>
                    <Button
                      onClick={handleOpenCreatePrompt}
                      variant="outline"
                      size="sm"
                      className="mt-4 gap-1.5 text-xs font-medium"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Új szabály létrehozása
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40 border-t border-border/40">
                    {filteredPromptRules.map((rule) => {
                      const catInfo = CATEGORY_MAP[rule.category || "iktatas"] || CATEGORY_MAP.altalanos
                      const IconComponent = catInfo.icon
                      return (
                        <div
                          key={rule.id}
                          className={cn(
                            "p-5 flex items-start justify-between gap-4 transition-colors hover:bg-muted/30",
                            !rule.is_active && "opacity-60 bg-muted/20"
                          )}
                        >
                          <div className="space-y-2 min-w-0 flex-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h4
                                className={cn(
                                  "font-semibold text-foreground text-sm",
                                  !rule.is_active && "line-through text-muted-foreground"
                                )}
                              >
                                {rule.rule_name}
                              </h4>
                              <Badge
                                variant="outline"
                                className={cn("text-[10px] px-2 py-0 border font-medium flex items-center gap-1", catInfo.badgeClass)}
                              >
                                <IconComponent className="h-3 w-3" />
                                {catInfo.label}
                              </Badge>
                              {rule.is_active ? (
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium px-2 py-0.5 rounded-full border border-emerald-500/20">
                                  Aktív
                                </span>
                              ) : (
                                <span className="text-[10px] bg-muted text-muted-foreground font-medium px-2 py-0.5 rounded-full border border-border">
                                  Kikapcsolva
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground leading-relaxed font-mono bg-muted/40 p-3 rounded-lg border border-border/40 whitespace-pre-wrap">
                              {rule.rule_prompt}
                            </p>

                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>Utolsó frissítés:</span>
                              <span className="font-medium text-foreground/80">
                                {new Date(rule.updated_at || rule.created_at || Date.now()).toLocaleDateString("hu-HU", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 pt-0.5">
                            <Switch
                              checked={rule.is_active !== false}
                              onCheckedChange={() => handleTogglePrompt(rule)}
                              aria-label="Szabály bekapcsolása"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEditPrompt(rule)}
                              title="Szerkesztés"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTargetPrompt(rule)}
                              title="Törlés"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Jobb oszlop: Sablonok és Útmutató (1/3) */}
          <div className="space-y-6">
            <Card className="border-border/60 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Gyakori Sablonok
                </CardTitle>
                <CardDescription className="text-xs">
                  Kattints egy sablonra az azonnali beillesztéshez és testreszabáshoz:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-0">
                {RULE_TEMPLATES_HU.map((template) => {
                  const catInfo = CATEGORY_MAP[template.category] || CATEGORY_MAP.altalanos
                  return (
                    <div
                      key={template.name}
                      onClick={() => handleApplyTemplatePrompt(template)}
                      className="p-3 rounded-lg border border-border/60 bg-card hover:border-primary/40 hover:bg-muted/20 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-md bg-muted/60 shrink-0 mt-0.5">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5 mb-1">
                            <h5 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {template.name}
                            </h5>
                            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 border shrink-0", catInfo.badgeClass)}>
                              {template.badge}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {template.prompt}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-muted/20 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  AI Prompt Tanácsok
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2.5 pt-0 leading-relaxed">
                <div>
                  <strong>Iktatási szabályok:</strong> Írd le, hogy bizonyos kulcsszavak esetén melyik ügyiratba tegye vagy milyen határidőt állítson be.
                </div>
                <div>
                  <strong>Felelős kijelölés:</strong> Határozd meg, hogy melyik belső osztályhoz vagy kollégához rendelje az iratot.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------- */}
      {/* DIALOG: ÚJ IKTATÁSI SZABÁLY LÉTREHOZÁSA (Visibill 2. Képernyő alapján) */}
      {/* -------------------------------------------------------------------------------- */}
      <Dialog open={filingDialogOpen} onOpenChange={setFilingDialogOpen}>
        <DialogContent className="max-w-xl">
          <form onSubmit={handleSubmitFiling}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" />
                {editingFilingRule ? "Iktatási szabály szerkesztése" : "Új iktatási szabály létrehozása"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Állítsd be a keresendő mintát és a hozzárendelt iktatási cél-adatokat (Visibill minta).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 max-h-[75vh] overflow-y-auto pr-1">
              {/* 1. Szabály megnevezése */}
              <div className="space-y-1.5">
                <Label htmlFor="fr-name" className="text-xs font-semibold">
                  Szabály megnevezése *
                </Label>
                <Input
                  id="fr-name"
                  value={frName}
                  onChange={(e) => setFrName(e.target.value)}
                  placeholder="pl. Telekom számlák és előfizetések"
                  className="h-9 text-xs"
                  required
                />
              </div>

              {/* 2. Keresendő szövegminta a tétel leírásában */}
              <div className="space-y-1.5">
                <Label htmlFor="fr-pattern" className="text-xs font-semibold">
                  Keresendő szövegminta az iratban / leírásban
                </Label>
                <Input
                  id="fr-pattern"
                  value={frSearchPattern}
                  onChange={(e) => setFrSearchPattern(e.target.value)}
                  placeholder="pl. Telekom, Üzemanyag, Előfizetés..."
                  className="h-9 text-xs"
                />
              </div>

              {/* 3. Cél Szervezeti Egység & Cél Irattári tételszám (2 oszlop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fr-dept" className="text-xs font-semibold">
                    Cél Szervezeti Egység (Osztály)
                  </Label>
                  <Select value={frDeptId} onValueChange={(val) => setFrDeptId(val || "none")}>
                    <SelectTrigger id="fr-dept" className="h-9 text-xs">
                      <SelectValue placeholder="Válassz osztályt..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Nincs megadva --</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.nev}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fr-plan" className="text-xs font-semibold">
                    Cél Irattári tételszám
                  </Label>
                  <Select value={frPlanId} onValueChange={(val) => setFrPlanId(val || "none")}>
                    <SelectTrigger id="fr-plan" className="h-9 text-xs">
                      <SelectValue placeholder="Válassz tételszámot..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Nincs megadva --</SelectItem>
                      {irattariTervek.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.tetelszam} - {p.megnevezes}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 4. Cél Dokumentumtípus & Tárgy előtag (2 oszlop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fr-doctype" className="text-xs font-semibold">
                    Cél Dokumentumtípus
                  </Label>
                  <Select value={frDocType} onValueChange={(val) => setFrDocType(val || "none")}>
                    <SelectTrigger id="fr-doctype" className="h-9 text-xs">
                      <SelectValue placeholder="Válassz típust..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Nincs megadva --</SelectItem>
                      <SelectItem value="szamla">Számla</SelectItem>
                      <SelectItem value="szerzodes">Szerződés</SelectItem>
                      <SelectItem value="hatosagi">Hatósági levél / Határozat</SelectItem>
                      <SelectItem value="szallitolevel">Szállítólevél</SelectItem>
                      <SelectItem value="egyeb">Egyéb irat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fr-prefix" className="text-xs font-semibold">
                    Tárgy előtag / Minta
                  </Label>
                  <Input
                    id="fr-prefix"
                    value={frPrefix}
                    onChange={(e) => setFrPrefix(e.target.value)}
                    placeholder="pl. [Távközlés] vagy [SaaS]"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {/* 5. Illesztési típus */}
              <div className="space-y-1.5">
                <Label htmlFor="fr-match" className="text-xs font-semibold">
                  Illesztési típus
                </Label>
                <Select value={frMatchType} onValueChange={(val) => setFrMatchType((val as any) || "contains")}>
                  <SelectTrigger id="fr-match" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Tartalmazza (Részszó egyezés)</SelectItem>
                    <SelectItem value="exact">Pontos teljes egyezés</SelectItem>
                    <SelectItem value="starts_with">Ezzel kezdődik</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 6. Partner szűrés (opcionális) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Partner szűrés (opcionális)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    value={frPartnerName}
                    onChange={(e) => setFrPartnerName(e.target.value)}
                    placeholder="Partner neve..."
                    className="h-9 text-xs"
                  />
                  <Input
                    value={frPartnerTax}
                    onChange={(e) => setFrPartnerTax(e.target.value)}
                    placeholder="Partner adószáma..."
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {/* 7. Hatókör */}
              <div className="space-y-2 pt-1 border-t border-border/40">
                <Label className="text-xs font-semibold">Hatókör</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    onClick={() => setFrScope("company")}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-all",
                      frScope === "company"
                        ? "border-primary bg-primary/5 text-foreground font-medium"
                        : "border-border/60 hover:bg-muted/30 text-muted-foreground"
                    )}
                  >
                    <div className={cn("w-3.5 h-3.5 rounded-full border flex items-center justify-center", frScope === "company" ? "border-primary bg-primary" : "border-muted-foreground")}>
                      {frScope === "company" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="truncate">Csak ez a cég ({activeCompanyName})</span>
                  </div>

                  <div
                    onClick={() => setFrScope("all")}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-all",
                      frScope === "all"
                        ? "border-primary bg-primary/5 text-foreground font-medium"
                        : "border-border/60 hover:bg-muted/30 text-muted-foreground"
                    )}
                  >
                    <div className={cn("w-3.5 h-3.5 rounded-full border flex items-center justify-center", frScope === "all" ? "border-primary bg-primary" : "border-muted-foreground")}>
                      {frScope === "all" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span>Minden cég (Közös szabály)</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/40">
              <Button type="button" variant="ghost" onClick={() => setFilingDialogOpen(false)} disabled={isPending}>
                Mégse
              </Button>
              <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Mentés folyamatban...
                  </>
                ) : (
                  "Szabály létrehozása"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: ÚJ PROMPT SZABÁLY */}
      <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmitPrompt}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                {editingPromptRule ? "AI Prompt szabály szerkesztése" : "Új AI prompt szabály"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Természetes nyelvű instrukció, amit a Gemini LLM kötelező felülbíráló direktívaként hajt végre.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="pr-name">Szabály neve *</Label>
                <Input
                  id="pr-name"
                  value={prName}
                  onChange={(e) => setPrName(e.target.value)}
                  placeholder="Pl. Hatósági határozatok azonnali iktatása"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pr-cat">Kategória</Label>
                <Select value={prCategory} onValueChange={(val) => val && setPrCategory(val as RuleCategory)}>
                  <SelectTrigger id="pr-cat" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iktatas">Iktatás és Besorolás</SelectItem>
                    <SelectItem value="felelos">Felelős és Részleg</SelectItem>
                    <SelectItem value="altalanos">Általános szabály</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pr-prompt">AI Instrukció (Prompt) *</Label>
                <Textarea
                  id="pr-prompt"
                  value={prPrompt}
                  onChange={(e) => setPrPrompt(e.target.value)}
                  placeholder="Pl. Ha a feladó bíróság vagy NAV, állítsd sürgősre, és írd be az ügyszámot a tárgyba."
                  rows={5}
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setPromptDialogOpen(false)} disabled={isPending}>
                Mégse
              </Button>
              <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Szabály mentése
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Törlés megerősítő AlertDialog (Filing) */}
      <AlertDialog open={!!deleteTargetFiling} onOpenChange={(open) => !open && setDeleteTargetFiling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Iktatási szabály törlése</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan törölni szeretnéd a(z) <strong>„{deleteTargetFiling?.rule_name}”</strong> nevű iktatási szabályt?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Mégse</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteFiling}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Törlés megerősítése
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Törlés megerősítő AlertDialog (Prompt) */}
      <AlertDialog open={!!deleteTargetPrompt} onOpenChange={(open) => !open && setDeleteTargetPrompt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>AI Prompt szabály törlése</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan törölni szeretnéd a(z) <strong>„{deleteTargetPrompt?.rule_name}”</strong> nevű prompt szabályt?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Mégse</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeletePrompt}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Törlés megerősítése
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
