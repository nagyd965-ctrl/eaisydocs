"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import "./management.css"
import {
  loginToManagementAction,
  logoutFromManagementAction,
  getManagementDashboardDataAction,
  createManagementUserAction,
  updateManagementUserAction,
  saveUserPermissionsFromManagementAction,
  deleteManagementUserAction,
  createManagementCompanyAction,
  getManagementEaisyBillCompaniesAction,
  importManagementEaisyBillCompanyAction,
  importManagementEaisyBillCompaniesBulkAction,
  updateManagementCompanyAction,
  toggleManagementCompanyStatusAction,
  deleteManagementCompanyAction,
  enterCompanyFromManagementAction,
  resolveErrorLogsAction,
  deleteErrorLogsAction,
  restoreErrorLogsAction,
  clearAllErrorLogsAction,
  analyzeErrorLogsWithAiAction,
  getAiLiveWatcherStatusAction,
  toggleAiLiveWatcherAction,
  type ManagementCompanyInfo,
  type ManagementEaisyBillCompanyItem,
  type ManagementUserInfo,
  type ManagementErrorLog,
  type ManagementErrorAiAnalysis,
  type ManagementCompanyMembershipInput,
  type ManagementCompanyPermissionUpdate,
} from "./actions"
import {
  ALL_HR_MODULES,
  ALL_DOCS_MODULES,
  HR_CORE_ROLES,
  DOCS_CORE_ROLES,
  HR_MODULE_DEFINITIONS,
  DOCS_MODULE_DEFINITIONS,
  DEFAULT_DOCS_MODULES_FOR_ROLE,
  HR_ROLE_LABELS as CANONICAL_HR_ROLE_LABELS,
  DOCS_ROLE_LABELS as CANONICAL_DOCS_ROLE_LABELS,
  type HrCoreRole,
  type HrModuleKey,
  type DocsCoreRole,
  type DocsModuleKey,
} from "@/utils/hr/company-role-resolver"

const DOCS_ROLES: Array<{ value: string; label: string }> = [
  { value: "admin", label: "Adminisztrátor (Teljes céges Docs jog)" },
  { value: "vezeto", label: "Vezető" },
  { value: "munkavallalo", label: "Munkavállaló" },
]

const HR_ROLES: Array<{ value: string; label: string }> = [
  { value: "admin", label: "Adminisztrátor (Teljes céges HR jog)" },
  { value: "vezeto", label: "Vezető" },
  { value: "munkavallalo", label: "Munkavállaló" },
]

const DOCS_ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  rendszergazda: "Admin",
  vezeto: "Vezető",
  munkavallalo: "Munkavállaló",
  iktato: "Munkavállaló",
  ugyintezo: "Munkavállaló",
  betekinto: "Munkavállaló",
  auditor: "Munkavállaló",
}

const HR_ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  rendszergazda: "Admin",
  hr_vezeto: "Vezető",
  hr_munkatars: "Munkavállaló",
  vezeto: "Vezető",
  berugyi: "Munkavállaló",
  toborzo: "Munkavállaló",
  munkavedelmi: "Munkavállaló",
  munkavallalo: "Munkavállaló",
  auditor: "Munkavállaló",
}

interface ManagementClientProps {
  initialAuthenticated: boolean
  initialUser?: {
    id: string
    nev: string
    email: string
    szerepkor: string
  }
}

export function ManagementClient({ initialAuthenticated, initialUser }: ManagementClientProps) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuthenticated)
  const [currentUser, setCurrentUser] = useState(initialUser || null)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"overview" | "control-center" | "financials" | "workers">("overview")
  const [controlCenterTab, setControlCenterTab] = useState<"errors" | "tenants" | "users" | "permissions">("tenants")
  const [trendMode, setTrendMode] = useState<"daily" | "weekly">("daily")

  // Jogosultságok (Permissions) tab state
  const [permUserSearch, setPermUserSearch] = useState("")
  const [permSelectedUserId, setPermSelectedUserId] = useState<string | null>(null)
  const [permPlatform, setPermPlatform] = useState<"hr" | "docs">("hr")
  const [permSelectedCompanyId, setPermSelectedCompanyId] = useState<string | null>(null)
  const [permModSearch, setPermModSearch] = useState("")
  const [permDraftModules, setPermDraftModules] = useState<string[]>([])
  const [permDraftCompanies, setPermDraftCompanies] = useState<Record<string, ManagementCompanyPermissionUpdate>>({})
  const [permSaving, setPermSaving] = useState(false)
  const [permSaveMsg, setPermSaveMsg] = useState<string | null>(null)

  // Data state
  const [loading, setLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<Awaited<ReturnType<typeof getManagementDashboardDataAction>> | null>(null)

  // Error center filters
  const [errorStatusFilter, setErrorStatusFilter] = useState<"active" | "resolved" | "deleted" | "all">("active")
  const [errorSearch, setErrorSearch] = useState("")
  const [selectedTenant, setSelectedTenant] = useState("")
  const [selectedType, setSelectedType] = useState("")
  const [selectedSeverity, setSelectedSeverity] = useState("")
  const [timeFilter, setTimeFilter] = useState<"all" | "24h" | "7d">("all")
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [analyzingErrorIds, setAnalyzingErrorIds] = useState<Set<string>>(new Set())
  const [bulkAiAnalyzing, setBulkAiAnalyzing] = useState(false)
  const [bulkAiSummaryIds, setBulkAiSummaryIds] = useState<string[] | null>(null)
  const [localAiAnalyses, setLocalAiAnalyses] = useState<Record<string, ManagementErrorAiAnalysis>>({})
  const [liveAiWatcherEnabled, setLiveAiWatcherEnabled] = useState(false)
  const [togglingAiWatcher, setTogglingAiWatcher] = useState(false)

  // Companies filters
  const [tenantSearch, setTenantSearch] = useState("")
  const [tenantModuleFilter, setTenantModuleFilter] = useState<"all" | "docs" | "hr" | "both">("all")
  const [tenantStatusFilter, setTenantStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null)

  // Users filters
  const [userSearch, setUserSearch] = useState("")
  const [userCompanyFilter, setUserCompanyFilter] = useState("")
  const [userModuleFilter, setUserModuleFilter] = useState<"all" | "docs" | "hr" | "both">("all")
  const [userRoleFilter, setUserRoleFilter] = useState("")
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  // User Create / Edit Modal state
  const [userModalMode, setUserModalMode] = useState<"create" | "edit" | null>(null)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [userFormName, setUserFormName] = useState("")
  const [userFormEmail, setUserFormEmail] = useState("")
  const [userFormPassword, setUserFormPassword] = useState("")
  const [userFormModules, setUserFormModules] = useState<string[]>(["docs"])
  const [userFormMemberships, setUserFormMemberships] = useState<Record<string, ManagementCompanyMembershipInput>>({})
  const [userCompanySearch, setUserCompanySearch] = useState("")
  const [userModalSaving, setUserModalSaving] = useState(false)
  const [userModalError, setUserModalError] = useState<string | null>(null)

  // Company Create / Edit Modal state
  const [companyModalMode, setCompanyModalMode] = useState<"create" | "edit" | null>(null)
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null)
  const [compFormName, setCompFormName] = useState("")
  const [compFormPrefix, setCompFormPrefix] = useState("")
  const [compFormTax, setCompFormTax] = useState("")
  const [compFormAddress, setCompFormAddress] = useState("")
  const [compFormPlan, setCompFormPlan] = useState("PRO")
  const [compFormModules, setCompFormModules] = useState<string[]>(["docs", "hr"])
  const [compFormActive, setCompFormActive] = useState(true)
  const [compModalSaving, setCompModalSaving] = useState(false)
  const [compModalError, setCompModalError] = useState<string | null>(null)

  // Delete confirmation modals
  const [deletingCompany, setDeletingCompany] = useState<ManagementCompanyInfo | null>(null)
  const [deleteCompanySaving, setDeleteCompanySaving] = useState(false)
  const [deletingUser, setDeletingUser] = useState<ManagementUserInfo | null>(null)
  const [deleteUserSaving, setDeleteUserSaving] = useState(false)

  // eaisyBill Company Import Modal state
  const [eaisyBillModalOpen, setEaisyBillModalOpen] = useState(false)
  const [eaisyBillCompanies, setEaisyBillCompanies] = useState<ManagementEaisyBillCompanyItem[]>([])
  const [eaisyBillLoading, setEaisyBillLoading] = useState(false)
  const [eaisyBillError, setEaisyBillError] = useState<string | null>(null)
  const [eaisyBillSearch, setEaisyBillSearch] = useState("")
  const [eaisyBillModules, setEaisyBillModules] = useState<string[]>(["docs", "hr"])
  const [importingBillCompanyId, setImportingBillCompanyId] = useState<string | null>(null)
  const [selectedEaisyBillIds, setSelectedEaisyBillIds] = useState<Set<string>>(new Set())
  const [bulkImportingEaisyBill, setBulkImportingEaisyBill] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const showToastMsg = useCallback((msg: string) => {
    setActionMessage(msg)
    setTimeout(() => setActionMessage(null), 4000)
  }, [])

  const loadAll = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const [data, watcherStatus] = await Promise.all([
        getManagementDashboardDataAction(),
        getAiLiveWatcherStatusAction(),
      ])
      setDashboardData(data)
      setLiveAiWatcherEnabled(Boolean(watcherStatus?.enabled))
    } catch (err) {
      console.error("Failed to load management data:", err)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  const handleToggleAiWatcher = async () => {
    setTogglingAiWatcher(true)
    try {
      const nextState = !liveAiWatcherEnabled
      const res = await toggleAiLiveWatcherAction(nextState)
      if (res.success) {
        setLiveAiWatcherEnabled(res.enabled)
      }
    } finally {
      setTogglingAiWatcher(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadAll()
    }
  }, [isAuthenticated, loadAll])

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError(null)
    try {
      const res = await loginToManagementAction(loginEmail, loginPassword)
      if (!res.success || !res.user) {
        setLoginError(res.error || "Sikertelen bejelentkezés.")
      } else {
        setCurrentUser(res.user)
        setIsAuthenticated(true)
      }
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Hiba történt a bejelentkezés során.")
    } finally {
      setLoginLoading(false)
    }
  }

  // Handle Logout
  const handleLogout = async () => {
    await logoutFromManagementAction()
    setIsAuthenticated(false)
    setCurrentUser(null)
    setDashboardData(null)
    setLoginPassword("")
    router.push("/login")
  }

  const isDark = mounted && resolvedTheme === "dark"
  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark")
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEDICATED MANAGEMENT LOGIN SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (!isAuthenticated) {
    return (
      <div className="mgmt-login-wrapper">
        <div className="mgmt-login-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div className="mgmt-logo-pill-box">
              <span className="mgmt-logo-pill-text">EAISYDOCS & EAISYHR</span>
            </div>
            <button
              type="button"
              className="mgmt-topbar-icon-btn"
              onClick={toggleTheme}
              title={isDark ? "Váltás világos módra" : "Váltás sötét módra"}
            >
              {isDark ? (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div className="mgmt-shield-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h1 className="mgmt-topbar-title" style={{ fontSize: "20px" }}>
              Management Dashboard
            </h1>
            <span className="mgmt-badge-super">SUPERADMIN</span>
          </div>

          <p className="mgmt-topbar-sub" style={{ marginBottom: "24px", lineHeight: 1.5 }}>
            Központi felügyeleti, cég- és jogosultságkezelő felület az eaisyDocs és eaisyHR platformhoz.
          </p>

          {loginError && (
            <div className="mgmt-modal-error" style={{ marginBottom: "16px" }}>
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="mgmt-form-group">
              <label className="mgmt-form-label" htmlFor="mgmt-login-email">
                Adminisztrátori e-mail cím
              </label>
              <input
                id="mgmt-login-email"
                type="email"
                className="mgmt-form-input"
                placeholder="management@thinkai.hu"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                autoFocus
                disabled={loginLoading}
              />
            </div>

            <div className="mgmt-form-group">
              <label className="mgmt-form-label" htmlFor="mgmt-login-password">
                Jelszó
              </label>
              <input
                id="mgmt-login-password"
                type="password"
                className="mgmt-form-input"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                disabled={loginLoading}
              />
            </div>

            <button
              type="submit"
              className="mgmt-btn mgmt-btn-primary"
              disabled={loginLoading}
              style={{ width: "100%", justifyContent: "center", padding: "10px 16px", marginTop: "4px" }}
            >
              {loginLoading ? "Bejelentkezés folyamatban..." : "Belépés a Management Dashboardra"}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATED MANAGEMENT DASHBOARD DATA & HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const companies = dashboardData?.companies || []
  const usersList = dashboardData?.users || []
  const allErrors = dashboardData?.errors || []
  const activeErrorsCount = allErrors.filter((e) => e.status === "active").length
  const resolvedErrorsCount = allErrors.filter((e) => e.status === "resolved").length
  const deletedErrorsCount = allErrors.filter((e) => e.status === "deleted").length
  const errorKpis = dashboardData?.errorKpis || {
    total_errors: 0,
    resolved_errors: 0,
    last_24h_errors: 0,
    top_error_type: "NINCS",
    affected_tenants_count: 0,
  }
  const overview = dashboardData?.overview
  const workers = dashboardData?.workers || []
  const systemInfo = dashboardData?.systemInfo

  const currentMonthName = new Date().toLocaleDateString("hu-HU", { month: "long" })
  const capitalizedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)

  // Filtered errors
  const filteredErrors = allErrors.filter((err) => {
    const errStatus =
      err.status === "deleted"
        ? "deleted"
        : err.status === "resolved"
        ? "resolved"
        : "active"
    const matchesStatus =
      errorStatusFilter === "all" ||
      (errorStatusFilter === "active" && errStatus === "active") ||
      (errorStatusFilter === "resolved" && errStatus === "resolved") ||
      (errorStatusFilter === "deleted" && errStatus === "deleted")
    if (!matchesStatus) return false

    const q = errorSearch.trim().toLowerCase()
    const matchesSearch =
      !q ||
      err.message.toLowerCase().includes(q) ||
      (err.component || "").toLowerCase().includes(q) ||
      (err.stack_trace || "").toLowerCase().includes(q)
    const matchesTenant = !selectedTenant || err.company_id === selectedTenant || err.company_slug === selectedTenant
    const matchesType = !selectedType || err.error_type === selectedType
    const matchesSeverity = !selectedSeverity || err.severity === selectedSeverity
    let matchesTime = true
    if (timeFilter === "24h") {
      matchesTime = new Date(err.created_at).getTime() >= Date.now() - 24 * 60 * 60 * 1000
    } else if (timeFilter === "7d") {
      matchesTime = new Date(err.created_at).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000
    }
    return matchesSearch && matchesTenant && matchesType && matchesSeverity && matchesTime
  })

  // Filtered companies
  const filteredCompanies = companies.filter((c) => {
    const q = tenantSearch.trim().toLowerCase()
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.filing_prefix.toLowerCase().includes(q) ||
      (c.tax_number || "").toLowerCase().includes(q)

    const hasDocs = c.elerheto_modulok.includes("docs")
    const hasHr = c.elerheto_modulok.includes("hr")
    const matchesModule =
      tenantModuleFilter === "all" ||
      (tenantModuleFilter === "docs" && hasDocs) ||
      (tenantModuleFilter === "hr" && hasHr) ||
      (tenantModuleFilter === "both" && hasDocs && hasHr)

    const matchesStatus =
      tenantStatusFilter === "all" ||
      (tenantStatusFilter === "active" && c.is_active) ||
      (tenantStatusFilter === "inactive" && !c.is_active)

    return matchesSearch && matchesModule && matchesStatus
  })

  // Filtered users
  const filteredUsers = usersList.filter((u) => {
    const q = userSearch.trim().toLowerCase()
    const matchesSearch =
      !q || u.nev.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)

    const matchesCompany =
      !userCompanyFilter || u.memberships.some((m) => m.company_id === userCompanyFilter)

    const hasDocs = u.elerheto_modulok.includes("docs")
    const hasHr = u.elerheto_modulok.includes("hr")
    const matchesModule =
      userModuleFilter === "all" ||
      (userModuleFilter === "docs" && hasDocs) ||
      (userModuleFilter === "hr" && hasHr) ||
      (userModuleFilter === "both" && hasDocs && hasHr)

    const matchesRole =
      !userRoleFilter ||
      u.szerepkor === userRoleFilter ||
      u.docs_szerepkor === userRoleFilter ||
      u.hr_szerepkor === userRoleFilter ||
      u.memberships.some(
        (m) => m.role === userRoleFilter || m.docs_szerepkor === userRoleFilter || m.hr_szerepkor === userRoleFilter
      )

    return matchesSearch && matchesCompany && matchesModule && matchesRole
  })

  // ── JOGOSULTSÁGOK (PERMISSIONS) TAB LOGIKA ──
  const permFilteredUsers = usersList.filter((u) => {
    const q = permUserSearch.trim().toLowerCase()
    if (!q) return true
    return (
      u.nev.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.memberships.some((m) => m.company_name.toLowerCase().includes(q))
    )
  })

  const permSelectedUser = usersList.find((u) => u.id === permSelectedUserId) || null

  const initPermDraftForUser = (u: ManagementUserInfo) => {
    const rawMods = u.elerheto_modulok.length > 0 ? [...u.elerheto_modulok] : ["docs"]
    setPermDraftModules(rawMods)

    const compMap: Record<string, ManagementCompanyPermissionUpdate> = {}
    for (const m of u.memberships) {
      const hrRole: HrCoreRole =
        m.hr_szerepkor === "admin" || m.hr_szerepkor === "vezeto" ? m.hr_szerepkor : "munkavallalo"
      const hrMods: HrModuleKey[] =
        hrRole === "admin"
          ? [...ALL_HR_MODULES]
          : (m.hr_modulok || []).filter((k): k is HrModuleKey => (ALL_HR_MODULES as readonly string[]).includes(k))
      const hrReadSet = new Set<HrModuleKey>(hrMods)
      const hrWriteMods: HrModuleKey[] =
        hrRole === "admin"
          ? [...ALL_HR_MODULES]
          : Array.isArray(m.hr_iras_modulok)
          ? m.hr_iras_modulok.filter(
              (k): k is HrModuleKey =>
                (ALL_HR_MODULES as readonly string[]).includes(k) && hrReadSet.has(k as HrModuleKey)
            )
          : [...hrMods]

      const docsRole: DocsCoreRole =
        m.docs_szerepkor === "admin" || m.docs_szerepkor === "rendszergazda"
          ? "admin"
          : m.docs_szerepkor === "vezeto"
          ? "vezeto"
          : "munkavallalo"
      const docsMods: DocsModuleKey[] =
        docsRole === "admin"
          ? [...ALL_DOCS_MODULES]
          : Array.isArray(m.docs_modulok) && m.docs_modulok.length > 0
          ? m.docs_modulok.filter((k): k is DocsModuleKey => (ALL_DOCS_MODULES as readonly string[]).includes(k))
          : [...DEFAULT_DOCS_MODULES_FOR_ROLE[docsRole]]
      const docsReadSet = new Set<DocsModuleKey>(docsMods)
      const docsWriteMods: DocsModuleKey[] =
        docsRole === "admin"
          ? [...ALL_DOCS_MODULES]
          : Array.isArray(m.docs_iras_modulok)
          ? m.docs_iras_modulok.filter(
              (k): k is DocsModuleKey =>
                (ALL_DOCS_MODULES as readonly string[]).includes(k) &&
                docsReadSet.has(k as DocsModuleKey)
            )
          : [...docsMods]

      compMap[m.company_id] = {
        company_id: m.company_id,
        docs_szerepkor: docsRole,
        docs_modulok: docsMods,
        docs_iras_modulok: docsWriteMods,
        hr_szerepkor: hrRole,
        hr_modulok: hrMods,
        hr_iras_modulok: hrWriteMods,
      }
    }
    setPermDraftCompanies(compMap)
    setPermSelectedCompanyId((prev) =>
      prev && u.memberships.some((m) => m.company_id === prev)
        ? prev
        : u.memberships[0]?.company_id || null
    )
    setPermPlatform(rawMods[0] === "docs" ? "docs" : rawMods.includes("hr") ? "hr" : "docs")
    setPermSaveMsg(null)
  }

  const handleSelectPermUser = (u: ManagementUserInfo) => {
    setPermSelectedUserId(u.id)
    initPermDraftForUser(u)
  }

  // Meghatározzuk a felhasználó elsődleges (alap) modulját:
  // - ha csak 'hr' van neki, vagy az elerheto_modulok[0] === 'hr', akkor 'hr' fiók -> a fejlécben az "eaisyDocs hozzáférés" kapcsoló jelenik meg
  // - ha csak 'docs' van neki, vagy az elerheto_modulok[0] === 'docs', akkor 'docs' fiók -> a fejlécben az "eaisyHR hozzáférés" kapcsoló jelenik meg
  const permBaseModule: "hr" | "docs" = permSelectedUser
    ? permSelectedUser.elerheto_modulok[0] === "hr" ||
      (!permSelectedUser.elerheto_modulok.includes("docs") && permSelectedUser.elerheto_modulok.includes("hr"))
      ? "hr"
      : "docs"
    : "docs"

  const permSecondaryModule: "hr" | "docs" = permBaseModule === "hr" ? "docs" : "hr"
  const permSecondaryEnabled = permDraftModules.includes(permSecondaryModule)

  const handleToggleSecondaryModule = () => {
    setPermDraftModules((prev) => {
      const hasSecondary = prev.includes(permSecondaryModule)
      const extraMods = prev.filter((m) => m !== "docs" && m !== "hr")
      if (hasSecondary) {
        // Kikapcsoljuk a másodlagos modult, marad az elsődleges
        if (permPlatform === permSecondaryModule) {
          setPermPlatform(permBaseModule)
        }
        return [permBaseModule, ...extraMods]
      } else {
        // Bekapcsoljuk a másodlagos modult, az elsődleges marad az 1. helyen
        return [permBaseModule, permSecondaryModule, ...extraMods]
      }
    })
  }

  const handlePermHrRoleChange = (companyId: string, nextRole: HrCoreRole) => {
    setPermDraftCompanies((prev) => {
      const current = prev[companyId]
      if (!current) return prev
      const nextMods: HrModuleKey[] =
        nextRole === "admin"
          ? [...ALL_HR_MODULES]
          : current.hr_szerepkor === "admin"
          ? []
          : current.hr_modulok
      const nextWriteMods: HrModuleKey[] =
        nextRole === "admin"
          ? [...ALL_HR_MODULES]
          : current.hr_szerepkor === "admin"
          ? []
          : (current.hr_iras_modulok || current.hr_modulok).filter((m) => nextMods.includes(m))
      return {
        ...prev,
        [companyId]: {
          ...current,
          hr_szerepkor: nextRole,
          hr_modulok: nextMods,
          hr_iras_modulok: nextWriteMods,
        },
      }
    })
  }

  const handlePermToggleHrReadModule = (companyId: string, modKey: HrModuleKey) => {
    setPermDraftCompanies((prev) => {
      const current = prev[companyId]
      if (!current || current.hr_szerepkor === "admin") return prev
      const hasRead = current.hr_modulok.includes(modKey)
      const nextRead = hasRead
        ? current.hr_modulok.filter((m) => m !== modKey)
        : [...current.hr_modulok, modKey]
      const curWrite = current.hr_iras_modulok || []
      // Ha kikapcsoljuk az Olvasást, az Írás is automatikusan kikapcsol
      const nextWrite = hasRead ? curWrite.filter((m) => m !== modKey) : curWrite
      return {
        ...prev,
        [companyId]: {
          ...current,
          hr_modulok: nextRead,
          hr_iras_modulok: nextWrite,
        },
      }
    })
  }

  const handlePermToggleHrWriteModule = (companyId: string, modKey: HrModuleKey) => {
    setPermDraftCompanies((prev) => {
      const current = prev[companyId]
      if (!current || current.hr_szerepkor === "admin") return prev
      const curWrite = current.hr_iras_modulok || []
      const hasWrite = curWrite.includes(modKey)
      const nextWrite = hasWrite ? curWrite.filter((m) => m !== modKey) : [...curWrite, modKey]
      // Ha bekapcsoljuk az Írást, az Olvasás is automatikusan bekapcsol
      const nextRead =
        !hasWrite && !current.hr_modulok.includes(modKey)
          ? [...current.hr_modulok, modKey]
          : current.hr_modulok
      return {
        ...prev,
        [companyId]: {
          ...current,
          hr_modulok: nextRead,
          hr_iras_modulok: nextWrite,
        },
      }
    })
  }

  const handlePermSetGroupHrMode = (
    companyId: string,
    groupMods: HrModuleKey[],
    mode: "read_only" | "read_write" | "none"
  ) => {
    setPermDraftCompanies((prev) => {
      const current = prev[companyId]
      if (!current || current.hr_szerepkor === "admin") return prev
      const readSet = new Set<HrModuleKey>(current.hr_modulok)
      const writeSet = new Set<HrModuleKey>(current.hr_iras_modulok || [])
      for (const k of groupMods) {
        if (mode === "read_only") {
          readSet.add(k)
          writeSet.delete(k)
        } else if (mode === "read_write") {
          readSet.add(k)
          writeSet.add(k)
        } else {
          readSet.delete(k)
          writeSet.delete(k)
        }
      }
      return {
        ...prev,
        [companyId]: {
          ...current,
          hr_modulok: Array.from(readSet),
          hr_iras_modulok: Array.from(writeSet),
        },
      }
    })
  }

  const handlePermResetCompanyHr = (companyId: string) => {
    if (!permSelectedUser) return
    const orig = permSelectedUser.memberships.find((m) => m.company_id === companyId)
    if (!orig) return
    const origRole: HrCoreRole =
      orig.hr_szerepkor === "admin" || orig.hr_szerepkor === "vezeto" ? orig.hr_szerepkor : "munkavallalo"
    const origMods: HrModuleKey[] =
      origRole === "admin"
        ? [...ALL_HR_MODULES]
        : (orig.hr_modulok || []).filter((k): k is HrModuleKey => (ALL_HR_MODULES as readonly string[]).includes(k))
    const origWriteMods: HrModuleKey[] =
      origRole === "admin"
        ? [...ALL_HR_MODULES]
        : Array.isArray(orig.hr_iras_modulok)
        ? orig.hr_iras_modulok.filter(
            (k): k is HrModuleKey =>
              (ALL_HR_MODULES as readonly string[]).includes(k) && origMods.includes(k as HrModuleKey)
          )
        : [...origMods]
    setPermDraftCompanies((prev) => {
      const current = prev[companyId]
      if (!current) return prev
      return {
        ...prev,
        [companyId]: {
          ...current,
          hr_szerepkor: origRole,
          hr_modulok: origMods,
          hr_iras_modulok: origWriteMods,
        },
      }
    })
  }

  const handlePermDocsRoleChange = (companyId: string, nextDocsRole: DocsCoreRole) => {
    setPermDraftCompanies((prev) => {
      const current = prev[companyId]
      if (!current) return prev
      const nextMods: DocsModuleKey[] =
        nextDocsRole === "admin"
          ? [...ALL_DOCS_MODULES]
          : current.docs_szerepkor === "admin"
          ? [...DEFAULT_DOCS_MODULES_FOR_ROLE[nextDocsRole]]
          : current.docs_modulok || [...DEFAULT_DOCS_MODULES_FOR_ROLE[nextDocsRole]]
      const nextWriteMods: DocsModuleKey[] =
        nextDocsRole === "admin"
          ? [...ALL_DOCS_MODULES]
          : current.docs_szerepkor === "admin"
          ? [...DEFAULT_DOCS_MODULES_FOR_ROLE[nextDocsRole]]
          : (current.docs_iras_modulok || nextMods).filter((m) => nextMods.includes(m))
      return {
        ...prev,
        [companyId]: {
          ...current,
          docs_szerepkor: nextDocsRole,
          docs_modulok: nextMods,
          docs_iras_modulok: nextWriteMods,
        },
      }
    })
  }

  const handlePermToggleDocsReadModule = (companyId: string, modKey: DocsModuleKey) => {
    setPermDraftCompanies((prev) => {
      const current = prev[companyId]
      if (!current || current.docs_szerepkor === "admin") return prev
      const curMods = current.docs_modulok || []
      const hasRead = curMods.includes(modKey)
      const nextRead = hasRead ? curMods.filter((m) => m !== modKey) : [...curMods, modKey]
      const curWrite = current.docs_iras_modulok || []
      // Ha kikapcsoljuk az Olvasást, az Írás is automatikusan kikapcsol
      const nextWrite = hasRead ? curWrite.filter((m) => m !== modKey) : curWrite
      return {
        ...prev,
        [companyId]: {
          ...current,
          docs_modulok: nextRead,
          docs_iras_modulok: nextWrite,
        },
      }
    })
  }

  const handlePermToggleDocsWriteModule = (companyId: string, modKey: DocsModuleKey) => {
    setPermDraftCompanies((prev) => {
      const current = prev[companyId]
      if (!current || current.docs_szerepkor === "admin") return prev
      const curMods = current.docs_modulok || []
      const curWrite = current.docs_iras_modulok || []
      const hasWrite = curWrite.includes(modKey)
      const nextWrite = hasWrite ? curWrite.filter((m) => m !== modKey) : [...curWrite, modKey]
      // Ha bekapcsoljuk az Írást, az Olvasás is automatikusan bekapcsol
      const nextRead = !hasWrite && !curMods.includes(modKey) ? [...curMods, modKey] : curMods
      return {
        ...prev,
        [companyId]: {
          ...current,
          docs_modulok: nextRead,
          docs_iras_modulok: nextWrite,
        },
      }
    })
  }

  const handlePermSetGroupDocsMode = (
    companyId: string,
    groupMods: DocsModuleKey[],
    mode: "read_only" | "read_write" | "none"
  ) => {
    setPermDraftCompanies((prev) => {
      const current = prev[companyId]
      if (!current || current.docs_szerepkor === "admin") return prev
      const readSet = new Set<DocsModuleKey>(current.docs_modulok || [])
      const writeSet = new Set<DocsModuleKey>(current.docs_iras_modulok || [])
      for (const k of groupMods) {
        if (mode === "read_only") {
          readSet.add(k)
          writeSet.delete(k)
        } else if (mode === "read_write") {
          readSet.add(k)
          writeSet.add(k)
        } else {
          readSet.delete(k)
          writeSet.delete(k)
        }
      }
      return {
        ...prev,
        [companyId]: {
          ...current,
          docs_modulok: Array.from(readSet),
          docs_iras_modulok: Array.from(writeSet),
        },
      }
    })
  }

  const handlePermResetCompanyDocs = (companyId: string) => {
    if (!permSelectedUser) return
    const orig = permSelectedUser.memberships.find((m) => m.company_id === companyId)
    if (!orig) return
    const origDocsRole: DocsCoreRole =
      orig.docs_szerepkor === "admin" || orig.docs_szerepkor === "rendszergazda"
        ? "admin"
        : orig.docs_szerepkor === "vezeto"
        ? "vezeto"
        : "munkavallalo"
    const origDocsMods: DocsModuleKey[] =
      origDocsRole === "admin"
        ? [...ALL_DOCS_MODULES]
        : Array.isArray(orig.docs_modulok) && orig.docs_modulok.length > 0
        ? orig.docs_modulok.filter((k): k is DocsModuleKey => (ALL_DOCS_MODULES as readonly string[]).includes(k))
        : [...DEFAULT_DOCS_MODULES_FOR_ROLE[origDocsRole]]
    const origDocsWriteMods: DocsModuleKey[] =
      origDocsRole === "admin"
        ? [...ALL_DOCS_MODULES]
        : Array.isArray(orig.docs_iras_modulok)
        ? orig.docs_iras_modulok.filter(
            (k): k is DocsModuleKey =>
              (ALL_DOCS_MODULES as readonly string[]).includes(k) &&
              origDocsMods.includes(k as DocsModuleKey)
          )
        : [...origDocsMods]
    setPermDraftCompanies((prev) => {
      const current = prev[companyId]
      if (!current) return prev
      return {
        ...prev,
        [companyId]: {
          ...current,
          docs_szerepkor: origDocsRole,
          docs_modulok: origDocsMods,
          docs_iras_modulok: origDocsWriteMods,
        },
      }
    })
  }

  // Kiszámoljuk, hány módosítás van függőben a kiválasztott felhasználónál
  const permPendingCount = (() => {
    if (!permSelectedUser) return 0
    let count = 0
    const origHasDocs = permSelectedUser.elerheto_modulok.includes("docs")
    const origHasHr = permSelectedUser.elerheto_modulok.includes("hr")
    const draftHasDocs = permDraftModules.includes("docs")
    const draftHasHr = permDraftModules.includes("hr")
    if (origHasDocs !== draftHasDocs) count++
    if (origHasHr !== draftHasHr) count++

    for (const m of permSelectedUser.memberships) {
      const draft = permDraftCompanies[m.company_id]
      if (!draft) continue
      const origDocsRole: DocsCoreRole =
        m.docs_szerepkor === "admin" || m.docs_szerepkor === "rendszergazda"
          ? "admin"
          : m.docs_szerepkor === "vezeto"
          ? "vezeto"
          : "munkavallalo"
      if (draft.docs_szerepkor !== origDocsRole) count++
      const origDocsModsArr =
        origDocsRole === "admin"
          ? ALL_DOCS_MODULES
          : Array.isArray(m.docs_modulok) && m.docs_modulok.length > 0
          ? m.docs_modulok
          : DEFAULT_DOCS_MODULES_FOR_ROLE[origDocsRole]
      const origDocsModsSet = new Set<string>(origDocsModsArr)
      const draftDocsModsSet = new Set<string>(
        draft.docs_szerepkor === "admin"
          ? ALL_DOCS_MODULES
          : draft.docs_modulok || DEFAULT_DOCS_MODULES_FOR_ROLE[(draft.docs_szerepkor as DocsCoreRole) || "munkavallalo"]
      )
      const origDocsWriteSet = new Set<string>(
        origDocsRole === "admin"
          ? ALL_DOCS_MODULES
          : Array.isArray(m.docs_iras_modulok)
          ? m.docs_iras_modulok.filter((k) => origDocsModsSet.has(k))
          : origDocsModsArr
      )
      const draftDocsWriteSet = new Set<string>(
        draft.docs_szerepkor === "admin"
          ? ALL_DOCS_MODULES
          : (draft.docs_iras_modulok || []).filter((k) => draftDocsModsSet.has(k))
      )
      for (const k of ALL_DOCS_MODULES) {
        if (origDocsModsSet.has(k) !== draftDocsModsSet.has(k)) count++
        if (origDocsWriteSet.has(k) !== draftDocsWriteSet.has(k)) count++
      }

      const origHrRole: HrCoreRole =
        m.hr_szerepkor === "admin" || m.hr_szerepkor === "vezeto" ? m.hr_szerepkor : "munkavallalo"
      if (draft.hr_szerepkor !== origHrRole) count++
      const origModsArr = origHrRole === "admin" ? ALL_HR_MODULES : m.hr_modulok || []
      const origModsSet = new Set<string>(origModsArr)
      const draftModsSet = new Set<string>(
        draft.hr_szerepkor === "admin" ? ALL_HR_MODULES : draft.hr_modulok
      )
      const origHrWriteSet = new Set<string>(
        origHrRole === "admin"
          ? ALL_HR_MODULES
          : Array.isArray(m.hr_iras_modulok)
          ? m.hr_iras_modulok.filter((k) => origModsSet.has(k))
          : origModsArr
      )
      const draftHrWriteSet = new Set<string>(
        draft.hr_szerepkor === "admin"
          ? ALL_HR_MODULES
          : (draft.hr_iras_modulok || []).filter((k) => draftModsSet.has(k))
      )
      for (const k of ALL_HR_MODULES) {
        if (origModsSet.has(k) !== draftModsSet.has(k)) count++
        if (origHrWriteSet.has(k) !== draftHrWriteSet.has(k)) count++
      }
    }
    return count
  })()

  const handleSaveUserPermissions = async () => {
    if (!permSelectedUser || permPendingCount === 0) return
    setPermSaving(true)
    setPermSaveMsg(null)
    try {
      const res = await saveUserPermissionsFromManagementAction({
        userId: permSelectedUser.id,
        elerheto_modulok: permDraftModules,
        companyPermissions: Object.values(permDraftCompanies),
      })
      if (!res.success) {
        alert(res.error || "Hiba történt a jogosultságok mentésekor.")
        return
      }
      setPermSaveMsg("Mentve!")
      showToastMsg(`A(z) "${permSelectedUser.nev}" jogosultságai sikeresen elmentve!`)
      const freshData = await getManagementDashboardDataAction()
      setDashboardData(freshData)
      const freshUser = freshData.users.find((u) => u.id === permSelectedUser.id)
      if (freshUser) {
        initPermDraftForUser(freshUser)
        setPermSaveMsg("Mentve!")
      }
      setTimeout(() => setPermSaveMsg(null), 3000)
    } finally {
      setPermSaving(false)
    }
  }

  // Open Create User Modal
  const handleOpenCreateUser = () => {
    setUserModalMode("create")
    setEditingUserId(null)
    setUserFormName("")
    setUserFormEmail("")
    setUserFormPassword("")
    setUserFormModules(["docs"])
    setUserFormMemberships({})
    setUserCompanySearch("")
    setUserModalError(null)
  }

  // Open Edit User Modal
  const handleOpenEditUser = (u: ManagementUserInfo) => {
    setUserModalMode("edit")
    setEditingUserId(u.id)
    setUserFormName(u.nev)
    setUserFormEmail(u.email)
    setUserFormPassword("")
    setUserFormModules(u.elerheto_modulok.length > 0 ? [...u.elerheto_modulok] : ["docs"])

    const map: Record<string, ManagementCompanyMembershipInput> = {}
    for (const m of u.memberships) {
      map[m.company_id] = {
        company_id: m.company_id,
        role: (m.role as "owner" | "admin" | "member") || "member",
        docs_szerepkor: m.docs_szerepkor || "munkavallalo",
        hr_szerepkor: m.hr_szerepkor || "munkavallalo",
      }
    }
    setUserFormMemberships(map)
    setUserCompanySearch("")
    setUserModalError(null)
  }

  const toggleUserModule = (mod: "docs" | "hr") => {
    setUserFormModules((prev) => {
      if (prev.includes(mod)) {
        if (prev.length === 1) return prev // Keep at least one module selected
        return prev.filter((m) => m !== mod)
      }
      return [...prev, mod]
    })
  }

  const toggleUserCompanyMembership = (companyId: string) => {
    setUserFormMemberships((prev) => {
      const next = { ...prev }
      if (next[companyId]) {
        delete next[companyId]
      } else {
        next[companyId] = {
          company_id: companyId,
          role: "member",
          docs_szerepkor: "munkavallalo",
          hr_szerepkor: "munkavallalo",
        }
      }
      return next
    })
  }

  const updateUserCompanyMembershipField = (
    companyId: string,
    field: "role" | "docs_szerepkor" | "hr_szerepkor",
    value: string
  ) => {
    setUserFormMemberships((prev) => {
      const existing = prev[companyId]
      if (!existing) return prev
      const updated = { ...existing, [field]: value }
      // If user picks 'admin' in docs_szerepkor or hr_szerepkor, automatically promote company role to 'admin' (unless owner)
      if (
        (field === "docs_szerepkor" || field === "hr_szerepkor") &&
        (value === "admin" || value === "rendszergazda") &&
        updated.role === "member"
      ) {
        updated.role = "admin"
      }
      return { ...prev, [companyId]: updated }
    })
  }

  const handleSaveUserModal = async (e: React.FormEvent) => {
    e.preventDefault()
    setUserModalSaving(true)
    setUserModalError(null)
    try {
      const membershipsArray = Object.values(userFormMemberships)
      if (userModalMode === "create") {
        const res = await createManagementUserAction({
          nev: userFormName,
          email: userFormEmail,
          password: userFormPassword,
          elerheto_modulok: userFormModules,
          memberships: membershipsArray,
        })
        if (!res.success) {
          setUserModalError(res.error || "Hiba történt a létrehozáskor.")
          return
        }
        showToastMsg(`A(z) "${userFormName}" felhasználó sikeresen létrehozva!`)
      } else if (userModalMode === "edit" && editingUserId) {
        const res = await updateManagementUserAction({
          userId: editingUserId,
          nev: userFormName,
          email: userFormEmail,
          newPassword: userFormPassword || undefined,
          elerheto_modulok: userFormModules,
          memberships: membershipsArray,
        })
        if (!res.success) {
          setUserModalError(res.error || "Hiba történt a mentéskor.")
          return
        }
        showToastMsg(`A(z) "${userFormName}" felhasználó adatai és jogosultságai frissítve!`)
      }
      setUserModalMode(null)
      await loadAll()
    } finally {
      setUserModalSaving(false)
    }
  }

  // Open Create Company Modal
  const handleOpenCreateCompany = () => {
    setCompanyModalMode("create")
    setEditingCompanyId(null)
    setCompFormName("")
    setCompFormPrefix("DOCS")
    setCompFormTax("")
    setCompFormAddress("")
    setCompFormPlan("PRO")
    setCompFormModules(["docs", "hr"])
    setCompFormActive(true)
    setCompModalError(null)
  }

  // Open Edit Company Modal
  const handleOpenEditCompany = (c: ManagementCompanyInfo) => {
    setCompanyModalMode("edit")
    setEditingCompanyId(c.id)
    setCompFormName(c.name)
    setCompFormPrefix(c.filing_prefix)
    setCompFormTax(c.tax_number || "")
    setCompFormAddress(c.address || "")
    setCompFormPlan(c.plan || "PRO")
    setCompFormModules(c.elerheto_modulok.length > 0 ? [...c.elerheto_modulok] : ["docs", "hr"])
    setCompFormActive(c.is_active)
    setCompModalError(null)
  }

  const toggleCompanyModule = (mod: "docs" | "hr") => {
    setCompFormModules((prev) => {
      if (prev.includes(mod)) {
        if (prev.length === 1) return prev
        return prev.filter((m) => m !== mod)
      }
      return [...prev, mod]
    })
  }

  const handleSaveCompanyModal = async (e: React.FormEvent) => {
    e.preventDefault()
    setCompModalSaving(true)
    setCompModalError(null)
    try {
      if (companyModalMode === "create") {
        const res = await createManagementCompanyAction({
          name: compFormName,
          filing_prefix: compFormPrefix,
          tax_number: compFormTax,
          address: compFormAddress,
          plan: compFormPlan,
          elerheto_modulok: compFormModules,
        })
        if (!res.success) {
          setCompModalError(res.error || "Hiba a cég létrehozásakor.")
          return
        }
        showToastMsg(`A(z) "${compFormName}" cég sikeresen létrehozva!`)
      } else if (companyModalMode === "edit" && editingCompanyId) {
        const res = await updateManagementCompanyAction({
          companyId: editingCompanyId,
          name: compFormName,
          filing_prefix: compFormPrefix,
          tax_number: compFormTax,
          plan: compFormPlan,
          elerheto_modulok: compFormModules,
          is_active: compFormActive,
        })
        if (!res.success) {
          setCompModalError(res.error || "Hiba a cég frissítésekor.")
          return
        }
        showToastMsg(`A(z) "${compFormName}" cég moduljai és adatai frissítve!`)
      }
      setCompanyModalMode(null)
      await loadAll()
    } finally {
      setCompModalSaving(false)
    }
  }

  const handleToggleCompanyStatus = async (c: ManagementCompanyInfo) => {
    const res = await toggleManagementCompanyStatusAction(c.id, !c.is_active)
    if (res.success) {
      showToastMsg(`A(z) "${c.name}" cég státusza: ${!c.is_active ? "Aktív" : "Inaktív"}`)
      await loadAll()
    }
  }

  const handleEnterCompany = async (c: ManagementCompanyInfo, targetModule: "docs" | "hr") => {
    const res = await enterCompanyFromManagementAction(c.id, targetModule)
    if (res.success) {
      router.push(res.redirectUrl)
    } else if (res.error) {
      alert(res.error)
    }
  }

  // eaisyBill cégek betöltése és importálása
  const handleOpenEaisyBillImportModal = async () => {
    setEaisyBillModalOpen(true)
    setEaisyBillSearch("")
    setEaisyBillError(null)
    setSelectedEaisyBillIds(new Set())
    setEaisyBillLoading(true)
    try {
      const res = await getManagementEaisyBillCompaniesAction()
      if (!res.success) {
        setEaisyBillError(res.error || "Hiba történt az eaisyBill cégek betöltésekor.")
      } else {
        setEaisyBillCompanies(res.companies)
      }
    } catch (err: unknown) {
      setEaisyBillError(err instanceof Error ? err.message : "Hiba történt az eaisyBill cégek betöltésekor.")
    } finally {
      setEaisyBillLoading(false)
    }
  }

  const toggleEaisyBillModule = (mod: "docs" | "hr") => {
    setEaisyBillModules((prev) => {
      if (prev.includes(mod)) {
        if (prev.length === 1) return prev
        return prev.filter((m) => m !== mod)
      }
      return [...prev, mod]
    })
  }

  const toggleSelectEaisyBillCompany = (billCompanyId: string) => {
    setSelectedEaisyBillIds((prev) => {
      const next = new Set(prev)
      if (next.has(billCompanyId)) {
        next.delete(billCompanyId)
      } else {
        next.add(billCompanyId)
      }
      return next
    })
  }

  const handleBulkImportEaisyBillCompanies = async () => {
    if (selectedEaisyBillIds.size === 0) return
    setBulkImportingEaisyBill(true)
    setEaisyBillError(null)
    try {
      const idsToImport = Array.from(selectedEaisyBillIds)
      const res = await importManagementEaisyBillCompaniesBulkAction({
        eaisybillCompanyIds: idsToImport,
        elerheto_modulok: eaisyBillModules,
      })
      if (!res.success) {
        setEaisyBillError(res.error || "Hiba történt a kijelölt cégek importálásakor.")
        return
      }

      const importedMap = new Map<string, string>()
      for (const item of res.importedItems) {
        importedMap.set(item.eaisybillCompanyId, item.localCompanyId)
      }

      setEaisyBillCompanies((prev) =>
        prev.map((item) =>
          importedMap.has(item.id)
            ? {
                ...item,
                isImported: true,
                localCompanyId: importedMap.get(item.id),
                elerheto_modulok: Array.from(new Set([...(item.elerheto_modulok || []), ...eaisyBillModules])),
              }
            : item
        )
      )

      // Ha épp nyitva van a Felhasználó létrehozó / szerkesztő modál, automatikusan rendeljük hozzá az összes újonnan importált céget
      if (userModalMode && res.importedItems.length > 0) {
        setUserFormMemberships((prev) => {
          const next = { ...prev }
          for (const item of res.importedItems) {
            if (!next[item.localCompanyId]) {
              next[item.localCompanyId] = {
                company_id: item.localCompanyId,
                role: "member",
                docs_szerepkor: "munkavallalo",
                hr_szerepkor: "munkavallalo",
              }
            }
          }
          return next
        })
      }

      setSelectedEaisyBillIds(new Set())
      showToastMsg(`${res.importedItems.length} cég sikeresen importálva az eaisyBillből!`)
      await loadAll()
    } catch (err: unknown) {
      setEaisyBillError(err instanceof Error ? err.message : "Hiba történt a tömeges importálás során.")
    } finally {
      setBulkImportingEaisyBill(false)
    }
  }

  const handleImportEaisyBillCompany = async (bc: ManagementEaisyBillCompanyItem) => {
    setImportingBillCompanyId(bc.id)
    setEaisyBillError(null)
    try {
      const res = await importManagementEaisyBillCompanyAction({
        eaisybillCompanyId: bc.id,
        elerheto_modulok: eaisyBillModules,
      })
      if (!res.success || !res.companyId) {
        setEaisyBillError(res.error || "Hiba történt a cég importálásakor.")
        return
      }
      const importedId = res.companyId
      setEaisyBillCompanies((prev) =>
        prev.map((item) =>
          item.id === bc.id
            ? { ...item, isImported: true, localCompanyId: importedId, elerheto_modulok: [...eaisyBillModules] }
            : item
        )
      )
      // Ha épp nyitva van a Felhasználó létrehozó / szerkesztő modál, automatikusan rendeljük hozzá az újonnan importált céget
      if (userModalMode) {
        setUserFormMemberships((prev) => ({
          ...prev,
          [importedId]: prev[importedId] || {
            company_id: importedId,
            role: "member",
            docs_szerepkor: "munkavallalo",
            hr_szerepkor: "munkavallalo",
          },
        }))
      }
      showToastMsg(
        res.alreadyExisted
          ? `A(z) "${bc.name}" cég moduljai frissítve lettek!`
          : `A(z) "${bc.name}" cég sikeresen importálva az eaisyBillből!`
      )
      await loadAll()
    } catch (err: unknown) {
      setEaisyBillError(err instanceof Error ? err.message : "Hiba történt a cég importálásakor.")
    } finally {
      setImportingBillCompanyId(null)
    }
  }

  const handleConfirmDeleteCompany = async () => {
    if (!deletingCompany) return
    setDeleteCompanySaving(true)
    try {
      const res = await deleteManagementCompanyAction(deletingCompany.id)
      if (res.success) {
        showToastMsg(`A(z) "${deletingCompany.name}" cég törölve.`)
        setDeletingCompany(null)
        await loadAll()
      } else {
        alert(res.error || "Törlési hiba.")
      }
    } finally {
      setDeleteCompanySaving(false)
    }
  }

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return
    setDeleteUserSaving(true)
    try {
      const res = await deleteManagementUserAction(deletingUser.id)
      if (res.success) {
        showToastMsg(`A(z) "${deletingUser.nev}" felhasználó törölve.`)
        setDeletingUser(null)
        await loadAll()
      } else {
        alert(res.error || "Törlési hiba.")
      }
    } finally {
      setDeleteUserSaving(false)
    }
  }

  // Error selection handlers
  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredErrors.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredErrors.map((e) => e.id)))
    }
  }

  const handleResolveSingleError = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const res = await resolveErrorLogsAction([id])
    if (res.success) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      showToastMsg("Hiba áthelyezve a megoldott hibák közé.")
      await loadAll()
    }
  }

  const handleDeleteSingleError = async (id: string, permanent = false, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const res = await deleteErrorLogsAction([id], permanent)
    if (res.success) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      showToastMsg(permanent ? "Hiba véglegesen törölve." : "Hiba áthelyezve a törölt hibák közé.")
      await loadAll()
    }
  }

  const handleRestoreSingleError = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const res = await restoreErrorLogsAction([id])
    if (res.success) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      showToastMsg("Hiba visszaállítva az aktív hibák közé.")
      await loadAll()
    }
  }

  const handleResolveSelectedErrors = async () => {
    if (selectedIds.size === 0) return
    const res = await resolveErrorLogsAction(Array.from(selectedIds))
    if (res.success) {
      setSelectedIds(new Set())
      showToastMsg("Kijelölt hibák áthelyezve a megoldott hibák közé.")
      await loadAll()
    }
  }

  const handleDeleteSelectedErrors = async (permanent = false) => {
    if (selectedIds.size === 0) return
    const res = await deleteErrorLogsAction(Array.from(selectedIds), permanent)
    if (res.success) {
      setSelectedIds(new Set())
      showToastMsg(
        permanent
          ? "Kijelölt hibák véglegesen törölve."
          : "Kijelölt hibák áthelyezve a törölt hibák közé."
      )
      await loadAll()
    }
  }

  const handleRestoreSelectedErrors = async () => {
    if (selectedIds.size === 0) return
    const res = await restoreErrorLogsAction(Array.from(selectedIds))
    if (res.success) {
      setSelectedIds(new Set())
      showToastMsg("Kijelölt hibák visszaállítva az aktív hibák közé.")
      await loadAll()
    }
  }

  const handleClearAllErrors = async (permanent = false) => {
    const res = await clearAllErrorLogsAction(permanent)
    if (res.success) {
      setSelectedIds(new Set())
      showToastMsg(
        permanent
          ? "Minden hibanapló véglegesen törölve."
          : "Minden aktív hiba áthelyezve a megoldott hibák közé."
      )
      await loadAll()
    }
  }

  const handleAnalyzeSingleError = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setAnalyzingErrorIds((prev) => new Set(prev).add(id))
    try {
      const res = await analyzeErrorLogsWithAiAction([id])
      if (res.success && res.analyses) {
        setLocalAiAnalyses((prev) => ({ ...prev, ...res.analyses! }))
        setExpandedRowId(id)
        showToastMsg("AI diagnosztika elkészült!")
        await loadAll()
      } else {
        showToastMsg(res.error || "Hiba történt az AI analízis során.")
      }
    } finally {
      setAnalyzingErrorIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleAnalyzeMultipleErrors = async (ids: string[]) => {
    if (!ids || ids.length === 0) return
    setBulkAiAnalyzing(true)
    setAnalyzingErrorIds(new Set(ids))
    try {
      const res = await analyzeErrorLogsWithAiAction(ids)
      if (res.success && res.analyses) {
        setLocalAiAnalyses((prev) => ({ ...prev, ...res.analyses! }))
        setBulkAiSummaryIds(ids)
        if (ids.length === 1) {
          setExpandedRowId(ids[0])
        }
        showToastMsg(`${ids.length} hiba AI analízise elkészült!`)
        await loadAll()
      } else {
        showToastMsg(res.error || "Hiba történt a tömeges AI analízis során.")
      }
    } finally {
      setBulkAiAnalyzing(false)
      setAnalyzingErrorIds(new Set())
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const maxTrendCost = overview?.financials.daily_trend?.length
    ? Math.max(...overview.financials.daily_trend.map((d) => d.cost), 0.01)
    : 0.01

  return (
    <div className="mgmt-page-wrapper">
      {/* ── Sticky Topbar matching agent-main / visibill ── */}
      <header className="mgmt-topbar">
        <div className="mgmt-topbar-inner">
          {/* Left: Shield icon + Title */}
          <div className="mgmt-topbar-left">
            <div className="mgmt-shield-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="mgmt-topbar-headings">
              <div className="mgmt-topbar-title-row">
                <h1 className="mgmt-topbar-title">
                  {activeTab === "control-center"
                    ? "Control Center"
                    : activeTab === "financials"
                    ? "Pénzügyi áttekintés"
                    : activeTab === "workers"
                    ? "Rendszer & Workerek"
                    : "Management Dashboard"}
                </h1>
                <span className="mgmt-badge-super">SUPERADMIN</span>
              </div>
              <p className="mgmt-topbar-sub">
                {activeTab === "control-center"
                  ? "Hibák, cégek moduljai (Docs / HR), jogosultságok és felhasználók"
                  : activeTab === "financials"
                  ? "AI dokumentum-feldolgozás, LLM és infrastruktúra költségek"
                  : activeTab === "workers"
                  ? "Háttérfolyamatok, ütemezett cronok és erőforrás felügyelet"
                  : "eaisyDocs & eaisyHR platform áttekintés"}
              </p>
            </div>
          </div>

          {/* Center: EAISYDOCS & EAISYHR Logo Pill */}
          <div className="mgmt-topbar-center">
            <div className="mgmt-logo-pill-box">
              <span className="mgmt-logo-pill-text">EAISYDOCS & EAISYHR</span>
            </div>
          </div>

          {/* Right: Actions, Theme toggle & Logout */}
          <div className="mgmt-topbar-right">
            <button className="mgmt-btn" onClick={loadAll} title="Adatok frissítése">
              Frissítés
            </button>
            {activeTab === "control-center" && controlCenterTab === "errors" && (
              <>
                {errorStatusFilter === "active" && activeErrorsCount > 0 && (
                  <button
                    className="mgmt-btn mgmt-btn-danger"
                    onClick={() => handleClearAllErrors(false)}
                    title="Minden aktív hiba áthelyezése a megoldott hibák közé"
                  >
                    Napló ürítése
                  </button>
                )}
                {errorStatusFilter === "deleted" && deletedErrorsCount > 0 && (
                  <button
                    className="mgmt-btn mgmt-btn-danger"
                    onClick={() => handleClearAllErrors(true)}
                    title="Törölt hibák végleges eltávolítása az adatbázisból"
                  >
                    Töröltek végleges ürítése
                  </button>
                )}
              </>
            )}

            <button
              className="mgmt-topbar-icon-btn"
              onClick={toggleTheme}
              aria-label="Téma váltás"
              title={isDark ? "Váltás világos módra" : "Váltás sötét módra"}
            >
              {isDark ? (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <button
              className="mgmt-topbar-logout-btn"
              onClick={handleLogout}
              title={`Kijelentkezés (${currentUser?.email || "Superadmin"})`}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              <span>Kijelentkezés</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs directly under topbar */}
        <div className="mgmt-topbar-tabs">
          <div className="mgmt-topbar-tabs-inner">
            <button
              className={`mgmt-tab ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span>Áttekintés</span>
            </button>
            <button
              className={`mgmt-tab ${activeTab === "control-center" ? "active" : ""}`}
              onClick={() => setActiveTab("control-center")}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
              <span>Control Center</span>
              {errorKpis.total_errors > 0 && (
                <span className="mgmt-tab-badge" style={{ background: "rgba(239, 68, 68, 0.25)", color: "inherit" }}>
                  {errorKpis.total_errors}
                </span>
              )}
            </button>
            <button
              className={`mgmt-tab ${activeTab === "financials" ? "active" : ""}`}
              onClick={() => setActiveTab("financials")}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <span>Pénzügyi áttekintés</span>
            </button>
            <button
              className={`mgmt-tab ${activeTab === "workers" ? "active" : ""}`}
              onClick={() => setActiveTab("workers")}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
              <span>Rendszer & Workerek</span>
              <span className="mgmt-tab-badge">{workers.length}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="mgmt-container">
        {/* ═══════════════════════════════════════════════════════════════════════════
            TAB 1: ÁTTEKINTÉS (BENTO-GRID)
            ═══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div>
            {/* Top 4 Stat Cards */}
            <div className="mgmt-kpi-grid">
              <div
                className="mgmt-kpi-card"
                onClick={() => {
                  setActiveTab("control-center")
                  setControlCenterTab("users")
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="mgmt-kpi-header">
                  <span className="mgmt-kpi-label">Regisztrált Felhasználók</span>
                </div>
                <div className="mgmt-stat-big">{overview?.users_count ?? usersList.length}</div>
                <div className="mgmt-kpi-hint">
                  eaisyDocs: {overview?.docs_users_count ?? 0} fő • eaisyHR: {overview?.hr_users_count ?? 0} fő
                </div>
              </div>

              <div
                className="mgmt-kpi-card"
                onClick={() => {
                  setActiveTab("control-center")
                  setControlCenterTab("tenants")
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="mgmt-kpi-header">
                  <span className="mgmt-kpi-label">Regisztrált Cégek</span>
                </div>
                <div className="mgmt-stat-big">{overview?.companies_count ?? companies.length}</div>
                <div className="mgmt-kpi-hint">
                  {overview?.active_companies_count ?? 0} aktív • Docs: {overview?.docs_companies_count ?? 0} • HR:{" "}
                  {overview?.hr_companies_count ?? 0}
                </div>
              </div>

              <div className="mgmt-kpi-card" onClick={() => setActiveTab("financials")} style={{ cursor: "pointer" }}>
                <div className="mgmt-kpi-header">
                  <span className="mgmt-kpi-label">Havi Összköltség ({capitalizedMonth})</span>
                </div>
                <div className="mgmt-stat-big" style={{ color: "#14b8ad" }}>
                  ${overview ? overview.financials.total_monthly_cost_usd.toFixed(4) : "0.0000"}
                </div>
                <div className="mgmt-kpi-hint">
                  {overview ? `${overview.total_docs_count} irat és AI feldolgozás` : "Számítás alatt..."}
                </div>
              </div>

              <div className="mgmt-kpi-card">
                <div className="mgmt-kpi-header">
                  <span className="mgmt-kpi-label">Legaktívabb Cég (Összesen)</span>
                </div>
                <div className="mgmt-stat-big" style={{ fontSize: "20px" }}>
                  {overview?.financials.most_active_company?.name || "Nincs adat"}
                </div>
                <div className="mgmt-kpi-hint">
                  {overview?.financials.most_active_company
                    ? `Összesen: $${overview.financials.most_active_company.total_cost_usd.toFixed(2)} (${overview.financials.most_active_company.docs_count} irat, ${overview.financials.most_active_company.members_count} tag)`
                    : "Nincs aktivitás rögzítve"}
                </div>
              </div>
            </div>

            {/* Bento Grid */}
            <div className="mgmt-bento-grid">
              {/* Col 1: AI & Infrastruktúra Pénzügyi Áttekintés */}
              <div className="mgmt-bento-card">
                <div>
                  <div className="mgmt-bento-header">
                    <span className="mgmt-bento-title">AI & LLM Pénzügyi Áttekintés</span>
                    <span className="mgmt-bento-tag">Tárgyhó</span>
                  </div>

                  <div>
                    <div className="mgmt-stat-subrow">
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>
                        HAVI ÖSSZKÖLTSÉG ({capitalizedMonth.toUpperCase()})
                      </span>
                    </div>
                    <div className="mgmt-stat-big" style={{ margin: "4px 0 12px 0" }}>
                      ${overview ? overview.financials.total_monthly_cost_usd.toFixed(4) : "0.0000"}
                    </div>

                    <div className="mgmt-stat-subbox">
                      <div className="mgmt-stat-subrow">
                        <span>Input tokenek (Gemini):</span>
                        <strong>
                          {overview
                            ? `${(overview.financials.monthly_tokens.input / 1000).toFixed(1)}k ($${overview.financials.monthly_tokens.input_cost.toFixed(4)})`
                            : "-"}
                        </strong>
                      </div>
                      <div className="mgmt-stat-subrow">
                        <span>Output tokenek (Gemini):</span>
                        <strong>
                          {overview
                            ? `${(overview.financials.monthly_tokens.output / 1000).toFixed(1)}k ($${overview.financials.monthly_tokens.output_cost.toFixed(4)})`
                            : "-"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(148,163,184,0.25)" }}>
                    <div className="mgmt-stat-subrow">
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>
                        ÖSSZES EDDIGI KÖLTSÉG
                      </span>
                    </div>
                    <div className="mgmt-stat-big" style={{ fontSize: "22px", color: "#14b8ad", margin: "4px 0 10px 0" }}>
                      ${overview ? overview.financials.total_cost_usd.toFixed(4) : "0.0000"}
                    </div>
                    <div className="mgmt-stat-subbox">
                      <div className="mgmt-stat-subrow">
                        <span>Összes kezelt irat / ügyirat:</span>
                        <strong>
                          {overview ? `${overview.total_docs_count} irat / ${overview.total_dossiers_count} ügyirat` : "-"}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Provider Breakdown */}
                <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(148,163,184,0.25)" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                    Költség Megoszlás (Szolgáltatók)
                  </span>
                  <div className="mgmt-progress-list">
                    {(overview?.financials.by_provider || []).map((p, idx) => (
                      <div key={idx} className="mgmt-progress-item">
                        <div className="mgmt-progress-meta">
                          <span style={{ fontWeight: 500 }}>{p.name}</span>
                          <span style={{ fontWeight: 600, fontFamily: "monospace" }}>
                            {p.pct}% ({p.cost_formatted})
                          </span>
                        </div>
                        <div className="mgmt-progress-track">
                          <div
                            className="mgmt-progress-fill"
                            style={{
                              width: `${p.pct}%`,
                              background: p.name.includes("Gemini")
                                ? "#a855f7"
                                : p.name.includes("Brevo")
                                ? "#14b8a6"
                                : p.name.includes("Vercel")
                                ? "#3b82f6"
                                : "#64748b",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Col 2: Worker Státusz & 7 napos Költség Trend */}
              <div className="mgmt-bento-col">
                <div className="mgmt-bento-card">
                  <div>
                    <div className="mgmt-bento-header">
                      <span className="mgmt-bento-title">Worker Státusz</span>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#22c55e" }}>
                        <span className="mgmt-pulsing-dot" />
                        {workers.length}/{workers.length} Folyamat fut
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                      <div className="mgmt-subbox-item">
                        <span className="mgmt-subbox-item-label">Állapot</span>
                        <strong style={{ fontSize: "13px", color: "#22c55e" }}>Fut (Egészséges)</strong>
                      </div>
                      <div
                        className="mgmt-subbox-item"
                        style={{ cursor: "pointer" }}
                        onClick={() => setActiveTab("workers")}
                      >
                        <span className="mgmt-subbox-item-label">Feldolgozás alatt</span>
                        <strong className="mgmt-subbox-item-val">
                          {overview?.pending_ai_tasks ?? 0} aktív feladat
                        </strong>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div>
                        <div className="mgmt-stat-subrow" style={{ fontSize: "11px", marginBottom: "4px" }}>
                          <span>CPU Terheltség</span>
                          <span style={{ fontFamily: "monospace", fontWeight: 600 }}>16%</span>
                        </div>
                        <div className="mgmt-progress-track">
                          <div className="mgmt-progress-fill" style={{ width: "16%", background: "#14b8a6" }} />
                        </div>
                      </div>
                      <div>
                        <div className="mgmt-stat-subrow" style={{ fontSize: "11px", marginBottom: "4px" }}>
                          <span>RAM Használat</span>
                          <span style={{ fontFamily: "monospace", fontWeight: 600 }}>1.3 GB / 4.0 GB</span>
                        </div>
                        <div className="mgmt-progress-track">
                          <div className="mgmt-progress-fill" style={{ width: "32.5%", background: "#14b8a6" }} />
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: "16px",
                        paddingTop: "12px",
                        borderTop: "1px solid rgba(148,163,184,0.25)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>
                        Feldolgozási hibák (24h)
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background:
                            (overview?.failed_ai_tasks ?? 0) > 0
                              ? "rgba(239, 68, 68, 0.12)"
                              : "rgba(34, 197, 94, 0.12)",
                          color: (overview?.failed_ai_tasks ?? 0) > 0 ? "#ef4444" : "#16a34a",
                        }}
                      >
                        {overview?.failed_ai_tasks ?? 0} hiba
                      </span>
                    </div>
                  </div>
                </div>

                {/* 7-Day Cost Chart */}
                <div className="mgmt-bento-card" style={{ flex: 1 }}>
                  <div className="mgmt-bento-header">
                    <span className="mgmt-bento-title">Napi Költségek (7 nap)</span>
                    <div className="mgmt-trend-toggle">
                      <button
                        className={`mgmt-trend-btn ${trendMode === "daily" ? "active" : ""}`}
                        onClick={() => setTrendMode("daily")}
                      >
                        Napi
                      </button>
                      <button
                        className={`mgmt-trend-btn ${trendMode === "weekly" ? "active" : ""}`}
                        onClick={() => setTrendMode("weekly")}
                      >
                        Heti
                      </button>
                    </div>
                  </div>

                  <div className="mgmt-chart-bars">
                    {(overview?.financials.daily_trend || []).map((d, idx, arr) => {
                      const pct = Math.max((d.cost / maxTrendCost) * 100, 10)
                      const isLast = idx === arr.length - 1
                      return (
                        <div
                          key={d.key}
                          className="mgmt-chart-bar-col"
                          title={`${d.date}: $${d.cost.toFixed(2)} (${d.events} esemény)`}
                        >
                          <span className="mgmt-chart-bar-val">${d.cost.toFixed(2)}</span>
                          <div
                            className="mgmt-chart-bar-pillar"
                            style={{
                              height: `${pct}%`,
                              background: isLast
                                ? "linear-gradient(180deg, #14b8ad 0%, rgba(20, 184, 173, 0.4) 100%)"
                                : "linear-gradient(180deg, #3b82f6 0%, rgba(59, 130, 246, 0.4) 100%)",
                            }}
                          />
                          <span className="mgmt-chart-bar-lbl">{d.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Col 3: Alkalmazás Hibák & Legutóbbi Interakciók */}
              <div className="mgmt-bento-col">
                <div className="mgmt-bento-card">
                  <div>
                    <div className="mgmt-bento-header">
                      <span className="mgmt-bento-title">Alkalmazás Hibák</span>
                      <button
                        className="mgmt-btn"
                        style={{ padding: "2px 8px", fontSize: "11px", height: "24px" }}
                        onClick={() => {
                          setActiveTab("control-center")
                          setControlCenterTab("errors")
                        }}
                      >
                        Részletek →
                      </button>
                    </div>

                    <div
                      className="mgmt-error-nav-box"
                      onClick={() => {
                        setActiveTab("control-center")
                        setControlCenterTab("errors")
                      }}
                    >
                      <div>
                        <strong className="mgmt-error-nav-title">Központi Hibanapló</strong>
                        <span className="mgmt-error-nav-sub">
                          Kattints a részletes hibanapló megnyitásához
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "20px",
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: "6px",
                          background:
                            errorKpis.total_errors > 0
                              ? "rgba(239, 68, 68, 0.12)"
                              : "rgba(34, 197, 94, 0.12)",
                          color: errorKpis.total_errors > 0 ? "#ef4444" : "#16a34a",
                        }}
                      >
                        {errorKpis.total_errors}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}>
                      <div className="mgmt-subbox-item" style={{ padding: "8px 10px" }}>
                        <span className="mgmt-subbox-item-label">Érintett cégek</span>
                        <strong className="mgmt-subbox-item-val">{errorKpis.affected_tenants_count} cég</strong>
                      </div>
                      <div className="mgmt-subbox-item" style={{ padding: "8px 10px" }}>
                        <span className="mgmt-subbox-item-label">24h hiba</span>
                        <strong
                          style={{
                            fontSize: "12px",
                            color: errorKpis.last_24h_errors > 0 ? "#ef4444" : "#16a34a",
                          }}
                        >
                          {errorKpis.last_24h_errors} db
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Interactions Card */}
                <div className="mgmt-bento-card" style={{ flex: 1 }}>
                  <div>
                    <div className="mgmt-bento-header">
                      <span className="mgmt-bento-title">Legutóbbi Rendszerinterakciók</span>
                      <span className="mgmt-bento-tag">DOCS & HR</span>
                    </div>

                    <div className="mgmt-recent-list">
                      {(overview?.RecentInteractions || []).length === 0 ? (
                        <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                          Nincs rögzített esemény.
                        </div>
                      ) : (
                        overview?.RecentInteractions.map((it) => (
                          <div key={it.id} className="mgmt-recent-item">
                            <div className="mgmt-recent-info">
                              <span className="mgmt-recent-title">{it.title}</span>
                              <span className="mgmt-recent-sub">
                                {it.company_name} • {it.module} •{" "}
                                {new Date(it.created_at).toLocaleTimeString("hu-HU", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <span className="mgmt-recent-badge">{it.status}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════
            TAB 2: CONTROL CENTER (HIBAKÖZPONT, REGISZTRÁLT CÉGEK, REGISZTRÁLT FELHASZNÁLÓK)
            ═══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "control-center" && (
          <div>
            {/* Sub-Navigation Pills */}
            <div className="mgmt-subnav-container">
              <div className="mgmt-subnav-pills">
                <button
                  className={`mgmt-subnav-pill ${controlCenterTab === "errors" ? "active" : ""}`}
                  onClick={() => setControlCenterTab("errors")}
                >
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>Hibaközpont</span>
                  <span className="mgmt-subnav-badge">{errorKpis.total_errors}</span>
                </button>

                <button
                  className={`mgmt-subnav-pill ${controlCenterTab === "tenants" ? "active" : ""}`}
                  onClick={() => setControlCenterTab("tenants")}
                >
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                  <span>Regisztrált cégek</span>
                  <span className="mgmt-subnav-badge">{companies.length}</span>
                </button>

                <button
                  className={`mgmt-subnav-pill ${controlCenterTab === "users" ? "active" : ""}`}
                  onClick={() => setControlCenterTab("users")}
                >
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span>Regisztrált felhasználók</span>
                  <span className="mgmt-subnav-badge">{usersList.length}</span>
                </button>

                <button
                  className={`mgmt-subnav-pill ${controlCenterTab === "permissions" ? "active" : ""}`}
                  onClick={() => setControlCenterTab("permissions")}
                >
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Jogosultságok</span>
                </button>
              </div>
            </div>

            {/* ── SUB-TAB 1: HIBAKÖZPONT ── */}
            {controlCenterTab === "errors" && (
              <>
                <div className="mgmt-kpi-grid">
                  <div className="mgmt-kpi-card">
                    <div className="mgmt-kpi-header">
                      <span className="mgmt-kpi-label">Aktív Hibák</span>
                    </div>
                    <div className="mgmt-kpi-val">{errorKpis.total_errors}</div>
                    <div className="mgmt-kpi-hint">
                      {resolvedErrorsCount} megoldott, {deletedErrorsCount} törölt hiba az előzményekben
                    </div>
                  </div>

                  <div className="mgmt-kpi-card">
                    <div className="mgmt-kpi-header">
                      <span className="mgmt-kpi-label">Elmúlt 24 óra</span>
                    </div>
                    <div
                      className="mgmt-kpi-val"
                      style={{ color: errorKpis.last_24h_errors > 0 ? "#ef4444" : "#16a34a" }}
                    >
                      {errorKpis.last_24h_errors}
                    </div>
                    <div className="mgmt-kpi-hint">Friss események</div>
                  </div>

                  <div className="mgmt-kpi-card">
                    <div className="mgmt-kpi-header">
                      <span className="mgmt-kpi-label">Leggyakoribb Kategória</span>
                    </div>
                    <div className="mgmt-kpi-val" style={{ fontSize: "18px", textTransform: "uppercase" }}>
                      {errorKpis.top_error_type}
                    </div>
                    <div className="mgmt-kpi-hint">Fő hibaforrás</div>
                  </div>

                  <div className="mgmt-kpi-card">
                    <div className="mgmt-kpi-header">
                      <span className="mgmt-kpi-label">Érintett Cégek</span>
                    </div>
                    <div className="mgmt-kpi-val">{errorKpis.affected_tenants_count}</div>
                    <div className="mgmt-kpi-hint">{companies.length} regisztrált cégből</div>
                  </div>
                </div>

                {/* Filters Bar */}
                <div className="mgmt-filter-bar">
                  <input
                    type="text"
                    className="mgmt-filter-input"
                    placeholder="Keresés hibaüzenetben, stack trace-ben vagy komponensben..."
                    value={errorSearch}
                    onChange={(e) => setErrorSearch(e.target.value)}
                  />

                  <select
                    className="mgmt-filter-select"
                    value={selectedTenant}
                    onChange={(e) => setSelectedTenant(e.target.value)}
                  >
                    <option value="">Összes Cég</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.filing_prefix})
                      </option>
                    ))}
                  </select>

                  <select
                    className="mgmt-filter-select"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    <option value="">Minden Hibatípus</option>
                    <option value="frontend">Frontend UI</option>
                    <option value="render">React Render</option>
                    <option value="api_call">API Hívás</option>
                    <option value="auth">Autentikáció</option>
                    <option value="db_query">Adatbázis</option>
                    <option value="worker">Háttér Worker</option>
                  </select>

                  <select
                    className="mgmt-filter-select"
                    value={selectedSeverity}
                    onChange={(e) => setSelectedSeverity(e.target.value)}
                  >
                    <option value="">Minden Súlyosság</option>
                    <option value="error">Error (Hiba)</option>
                    <option value="warning">Warning (Figyelmeztetés)</option>
                    <option value="info">Info (Tájékoztató)</option>
                  </select>

                  <select
                    className="mgmt-filter-select"
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value as "all" | "24h" | "7d")}
                  >
                    <option value="all">Minden időszak</option>
                    <option value="24h">Elmúlt 24 óra</option>
                    <option value="7d">Elmúlt 7 nap</option>
                  </select>
                </div>

                {selectedIds.size > 0 && (
                  <div
                    style={{
                      background: "rgba(59, 130, 246, 0.08)",
                      border: "1px solid rgba(59, 130, 246, 0.25)",
                      borderRadius: "6px",
                      padding: "10px 16px",
                      marginBottom: "16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#3b82f6" }}>
                      {selectedIds.size} bejegyzés kijelölve
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="mgmt-btn mgmt-btn-primary"
                        disabled={bulkAiAnalyzing}
                        onClick={() => handleAnalyzeMultipleErrors(Array.from(selectedIds))}
                      >
                        {bulkAiAnalyzing
                          ? `AI analízis folyamatban (${selectedIds.size})...`
                          : `Kijelöltek AI analízise (${selectedIds.size})`}
                      </button>
                      {errorStatusFilter !== "resolved" && (
                        <button
                          className="mgmt-btn mgmt-btn-Docs"
                          onClick={handleResolveSelectedErrors}
                        >
                          Megoldva ({selectedIds.size})
                        </button>
                      )}
                      {errorStatusFilter !== "deleted" && (
                        <button
                          className="mgmt-btn"
                          onClick={() => handleDeleteSelectedErrors(false)}
                        >
                          Törlés ({selectedIds.size})
                        </button>
                      )}
                      {errorStatusFilter !== "active" && (
                        <button
                          className="mgmt-btn mgmt-btn-Docs"
                          onClick={handleRestoreSelectedErrors}
                        >
                          Kijelöltek visszaállítása ({selectedIds.size})
                        </button>
                      )}
                      <button
                        className="mgmt-btn mgmt-btn-danger"
                        onClick={() => handleDeleteSelectedErrors(true)}
                      >
                        Végleges törlés ({selectedIds.size})
                      </button>
                    </div>
                  </div>
                )}

                {/* Tömeges AI Diagnosztikai Összesítő Panel */}
                {bulkAiSummaryIds && bulkAiSummaryIds.length > 0 && (
                  <div
                    style={{
                      background: "var(--mgmt-surface)",
                      border: "1px solid rgba(13, 148, 136, 0.4)",
                      borderRadius: "8px",
                      padding: "16px 20px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "10px",
                        marginBottom: "14px",
                        paddingBottom: "10px",
                        borderBottom: "1px solid var(--mgmt-border)",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "14px", fontWeight: 600 }}>
                            AI Diagnosztikai Jelentés ({bulkAiSummaryIds.length} elemzett hiba)
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: "rgba(13, 148, 136, 0.12)",
                              color: "#0d9488",
                            }}
                          >
                            Élő Kódbázis + Gemini 2.5 Diagnózis
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--mgmt-muted)", marginTop: "2px" }}>
                          Az alábbi összefoglaló mutatja a kijelölt hibák okát, a jelenlegi kódbázis állapotát és a javasolt lépéseket.
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {bulkAiSummaryIds.some((id) => {
                          const errObj = allErrors.find((x) => x.id === id)
                          const ai = localAiAnalyses[id] || errObj?.ai_analysis
                          return ai?.fix_status === "already_fixed" && errObj?.status === "active"
                        }) && (
                          <button
                            type="button"
                            className="mgmt-btn mgmt-btn-primary"
                            onClick={async () => {
                              const fixedIds = bulkAiSummaryIds.filter((id) => {
                                const errObj = allErrors.find((x) => x.id === id)
                                const ai = localAiAnalyses[id] || errObj?.ai_analysis
                                return ai?.fix_status === "already_fixed" && errObj?.status === "active"
                              })
                              if (fixedIds.length > 0) {
                                await resolveErrorLogsAction(fixedIds)
                                showToastMsg(`${fixedIds.length} már javított hiba áthelyezve a megoldott hibák közé!`)
                                await loadAll()
                              }
                            }}
                          >
                            Már javított hibák megoldottnak jelölése
                          </button>
                        )}
                        <button
                          type="button"
                          className="mgmt-btn"
                          onClick={() => setBulkAiSummaryIds(null)}
                        >
                          Panel bezárása
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {bulkAiSummaryIds.map((id) => {
                        const errObj = allErrors.find((x) => x.id === id)
                        if (!errObj) return null
                        const ai = localAiAnalyses[id] || errObj.ai_analysis
                        if (!ai) return null
                        const isFixed = ai.fix_status === "already_fixed"
                        return (
                          <div
                            key={id}
                            style={{
                              padding: "12px 14px",
                              borderRadius: "6px",
                              background: "var(--mgmt-bg)",
                              border: `1px solid ${
                                isFixed ? "rgba(22, 163, 74, 0.35)" : "rgba(245, 158, 11, 0.35)"
                              }`,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: "10px",
                                flexWrap: "wrap",
                                marginBottom: "8px",
                              }}
                            >
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      padding: "2px 8px",
                                      borderRadius: "4px",
                                      background: isFixed
                                        ? "rgba(22, 163, 74, 0.14)"
                                        : "rgba(245, 158, 11, 0.14)",
                                      color: isFixed ? "#16a34a" : "#d97706",
                                    }}
                                  >
                                    {ai.fix_status_label}
                                  </span>
                                  <span style={{ fontSize: "12.5px", fontWeight: 600 }}>
                                    {errObj.component || "Rendszer"} ({errObj.url || "/"})
                                  </span>
                                  <span style={{ fontSize: "11.5px", color: "var(--mgmt-muted)" }}>
                                    {new Date(errObj.created_at).toLocaleString("hu-HU")}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: "var(--mgmt-muted)",
                                    marginTop: "4px",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {errObj.message}
                                </div>
                              </div>
                              {errObj.status === "active" && (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <button
                                    type="button"
                                    className="mgmt-btn mgmt-btn-Docs"
                                    style={{ padding: "4px 10px", fontSize: "11.5px" }}
                                    onClick={(e) => handleResolveSingleError(errObj.id, e)}
                                  >
                                    Megoldva
                                  </button>
                                  <button
                                    type="button"
                                    className="mgmt-btn"
                                    style={{ padding: "4px 10px", fontSize: "11.5px" }}
                                    onClick={(e) => handleDeleteSingleError(errObj.id, false, e)}
                                  >
                                    Törlés
                                  </button>
                                </div>
                              )}
                            </div>

                            <div style={{ fontSize: "12.5px", lineHeight: 1.55, display: "grid", gap: "6px" }}>
                              <div>
                                <strong>Mi a hiba:</strong> {ai.summary}
                              </div>
                              <div>
                                <strong>Mi okozta (Gyökérok):</strong> {ai.root_cause}
                              </div>
                              <div
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: "5px",
                                  background: isFixed
                                    ? "rgba(22, 163, 74, 0.08)"
                                    : "rgba(59, 130, 246, 0.08)",
                                  color: isFixed ? "#15803d" : "var(--mgmt-fg)",
                                  fontWeight: 500,
                                }}
                              >
                                <strong>Megoldottuk-e már?</strong> {ai.resolution_status_text}
                              </div>
                              {ai.solution_steps.length > 0 && (
                                <div>
                                  <strong>Megoldási lépések ({ai.affected_file}):</strong>
                                  <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
                                    {ai.solution_steps.map((step, idx) => (
                                      <li key={idx}>{step}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {liveAiWatcherEnabled && (
                  <div
                    style={{
                      background: "var(--mgmt-surface)",
                      border: "1px solid rgba(20, 184, 173, 0.45)",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      marginBottom: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                      <span
                        style={{
                          width: "9px",
                          height: "9px",
                          borderRadius: "999px",
                          backgroundColor: "#14b8ad",
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#0d9488" }}>
                          Élő AI Figyelő mód aktív
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--mgmt-muted)", marginTop: "2px" }}>
                          Az „AI Analízis” / „AI Diagnózis” gomb megnyomásakor a rendszer értesíti a fejlesztői chatet, amely megvizsgálja a kódbázist és javítási javaslatot ad (módosítás csak jóváhagyás után történik).
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mgmt-btn"
                      style={{ padding: "5px 12px", fontSize: "12px" }}
                      disabled={togglingAiWatcher}
                      onClick={handleToggleAiWatcher}
                    >
                      Figyelő kikapcsolása
                    </button>
                  </div>
                )}

                <div className="mgmt-table-wrapper">
                  <div
                    className="mgmt-table-header-bar"
                    style={{ flexWrap: "wrap", gap: "12px", padding: "12px 16px" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600 }}>
                        Hibalista ({filteredErrors.length} találat)
                      </span>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          background: "var(--mgmt-bg)",
                          padding: "3px",
                          borderRadius: "7px",
                          border: "1px solid var(--mgmt-border)",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setErrorStatusFilter("active")
                            setSelectedIds(new Set())
                          }}
                          style={{
                            padding: "4px 10px",
                            fontSize: "12px",
                            fontWeight: 600,
                            borderRadius: "5px",
                            border: "none",
                            cursor: "pointer",
                            background:
                              errorStatusFilter === "active"
                                ? "rgba(13, 148, 136, 0.14)"
                                : "transparent",
                            color:
                              errorStatusFilter === "active" ? "#0d9488" : "var(--mgmt-muted)",
                          }}
                        >
                          Aktív hibák ({activeErrorsCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setErrorStatusFilter("resolved")
                            setSelectedIds(new Set())
                          }}
                          style={{
                            padding: "4px 10px",
                            fontSize: "12px",
                            fontWeight: 600,
                            borderRadius: "5px",
                            border: "none",
                            cursor: "pointer",
                            background:
                              errorStatusFilter === "resolved"
                                ? "rgba(13, 148, 136, 0.14)"
                                : "transparent",
                            color:
                              errorStatusFilter === "resolved" ? "#0d9488" : "var(--mgmt-muted)",
                          }}
                        >
                          Megoldott hibák ({resolvedErrorsCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setErrorStatusFilter("deleted")
                            setSelectedIds(new Set())
                          }}
                          style={{
                            padding: "4px 10px",
                            fontSize: "12px",
                            fontWeight: 600,
                            borderRadius: "5px",
                            border: "none",
                            cursor: "pointer",
                            background:
                              errorStatusFilter === "deleted"
                                ? "rgba(13, 148, 136, 0.14)"
                                : "transparent",
                            color:
                              errorStatusFilter === "deleted" ? "#0d9488" : "var(--mgmt-muted)",
                          }}
                        >
                          Törölt hibák ({deletedErrorsCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setErrorStatusFilter("all")
                            setSelectedIds(new Set())
                          }}
                          style={{
                            padding: "4px 10px",
                            fontSize: "12px",
                            fontWeight: 600,
                            borderRadius: "5px",
                            border: "none",
                            cursor: "pointer",
                            background:
                              errorStatusFilter === "all"
                                ? "rgba(13, 148, 136, 0.14)"
                                : "transparent",
                            color:
                              errorStatusFilter === "all" ? "#0d9488" : "var(--mgmt-muted)",
                          }}
                        >
                          Összes ({allErrors.length})
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className={liveAiWatcherEnabled ? "mgmt-btn mgmt-btn-Docs" : "mgmt-btn"}
                        disabled={togglingAiWatcher}
                        onClick={handleToggleAiWatcher}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "7px",
                          padding: "5px 12px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: togglingAiWatcher ? "wait" : "pointer",
                        }}
                        title={
                          liveAiWatcherEnabled
                            ? "Az AI Analízis gomb megnyomásakor azonnal értesítést kap az AI chat. Kattints a kikapcsoláshoz."
                            : "Alapértelmezetten kikapcsolva (0 háttérterhelés). Kapcsold be, ha szeretnéd, hogy az AI Analízis gomb azonnal felébressze a chatet."
                        }
                      >
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "999px",
                            backgroundColor: liveAiWatcherEnabled ? "#14b8ad" : "#94a3b8",
                            display: "inline-block",
                            flexShrink: 0,
                          }}
                        />
                        {liveAiWatcherEnabled
                          ? "Élő AI Figyelő: Aktív"
                          : "Élő AI Figyelő: Kikapcsolva"}
                      </button>
                      {filteredErrors.length > 0 && (
                        <button
                          type="button"
                          className="mgmt-btn mgmt-btn-primary"
                          style={{ padding: "5px 12px", fontSize: "12px" }}
                          disabled={bulkAiAnalyzing}
                          onClick={() => handleAnalyzeMultipleErrors(filteredErrors.map((e) => e.id))}
                        >
                          {bulkAiAnalyzing
                            ? "AI analízis folyamatban..."
                            : `Lista AI analízise (${filteredErrors.length})`}
                        </button>
                      )}
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                        Kattints a sorra vagy az AI Analízis gombra a diagnózishoz
                      </span>
                    </div>
                  </div>

                  {filteredErrors.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                      {errorStatusFilter === "resolved"
                        ? "Még nincs megoldott hiba az előzményekben."
                        : errorStatusFilter === "deleted"
                        ? "Még nincs törölt hiba az előzményekben."
                        : "Nem található a szűrésnek megfelelő aktív hiba. A rendszer stabilan fut."}
                    </div>
                  ) : (
                    <table className="mgmt-table">
                      <thead>
                        <tr>
                          <th style={{ width: "40px" }}>
                            <input
                              type="checkbox"
                              checked={selectedIds.size === filteredErrors.length && filteredErrors.length > 0}
                              onChange={toggleSelectAll}
                            />
                          </th>
                          <th>Időpont</th>
                          <th>Súlyosság</th>
                          <th>Típus</th>
                          <th>Cég (Tenant)</th>
                          <th>Komponens / Akció</th>
                          <th>Hibaüzenet</th>
                          <th style={{ textAlign: "right" }}>Műveletek</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredErrors.map((err) => {
                          const isExpanded = expandedRowId === err.id
                          const isSelected = selectedIds.has(err.id)
                          const isResolved = err.status === "resolved"
                          const isDeleted = err.status === "deleted"
                          const isInactive = isResolved || isDeleted
                          const isAnalyzingThis = analyzingErrorIds.has(err.id)
                          const aiAnalysis = localAiAnalyses[err.id] || err.ai_analysis
                          return (
                            <React.Fragment key={err.id}>
                              <tr
                                className={`mgmt-row ${isExpanded ? "expanded" : ""}`}
                                onClick={() => setExpandedRowId(isExpanded ? null : err.id)}
                                style={isInactive ? { opacity: 0.78 } : undefined}
                              >
                                <td onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => toggleSelectRow(err.id, e as unknown as React.MouseEvent)}
                                  />
                                </td>
                                <td style={{ whiteSpace: "nowrap", fontSize: "12px", color: "#64748b" }}>
                                  <div>{new Date(err.created_at).toLocaleString("hu-HU")}</div>
                                  {isResolved && (
                                    <div style={{ marginTop: "3px" }}>
                                      <span
                                        style={{
                                          display: "inline-block",
                                          fontSize: "10.5px",
                                          fontWeight: 600,
                                          padding: "1px 6px",
                                          borderRadius: "4px",
                                          background: "rgba(22, 163, 74, 0.12)",
                                          color: "#16a34a",
                                          border: "1px solid rgba(22, 163, 74, 0.25)",
                                        }}
                                      >
                                        Megoldva
                                        {err.resolved_at
                                          ? ` (${new Date(err.resolved_at).toLocaleString("hu-HU")})`
                                          : ""}
                                      </span>
                                    </div>
                                  )}
                                  {isDeleted && (
                                    <div style={{ marginTop: "3px" }}>
                                      <span
                                        style={{
                                          display: "inline-block",
                                          fontSize: "10.5px",
                                          fontWeight: 600,
                                          padding: "1px 6px",
                                          borderRadius: "4px",
                                          background: "rgba(239, 68, 68, 0.12)",
                                          color: "#ef4444",
                                          border: "1px solid rgba(239, 68, 68, 0.25)",
                                        }}
                                      >
                                        Törölve
                                        {err.deleted_at || err.resolved_at
                                          ? ` (${new Date((err.deleted_at || err.resolved_at)!).toLocaleString("hu-HU")})`
                                          : ""}
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <span className={`mgmt-badge mgmt-badge-${err.severity}`}>{err.severity}</span>
                                </td>
                                <td>
                                  <span className="mgmt-type-tag">{err.error_type}</span>
                                </td>
                                <td>
                                  <div style={{ fontWeight: 600, fontSize: "13px" }}>{err.company_name}</div>
                                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>{err.company_slug}</div>
                                </td>
                                <td>
                                  <div style={{ fontWeight: 500 }}>{err.component || "-"}</div>
                                  {err.action && <div style={{ fontSize: "11px", color: "#94a3b8" }}>{err.action}</div>}
                                </td>
                                <td style={{ maxWidth: "360px" }}>
                                  <div
                                    style={{
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: isExpanded ? "normal" : "nowrap",
                                      fontWeight: 500,
                                      textDecoration: isInactive ? "line-through" : "none",
                                    }}
                                  >
                                    {err.message}
                                  </div>
                                  {aiAnalysis && (
                                    <div style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                                      <span
                                        style={{
                                          display: "inline-block",
                                          fontSize: "10.5px",
                                          fontWeight: 600,
                                          padding: "1px 6px",
                                          borderRadius: "4px",
                                          background:
                                            aiAnalysis.fix_status === "already_fixed"
                                              ? "rgba(22, 163, 74, 0.14)"
                                              : "rgba(13, 148, 136, 0.14)",
                                          color:
                                            aiAnalysis.fix_status === "already_fixed"
                                              ? "#16a34a"
                                              : "#0d9488",
                                        }}
                                      >
                                        AI: {aiAnalysis.fix_status_label}
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td
                                  style={{ textAlign: "right", whiteSpace: "nowrap" }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "flex-end",
                                      gap: "6px",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      className="mgmt-btn mgmt-btn-primary"
                                      style={{ padding: "5px 10px", fontSize: "11.5px" }}
                                      disabled={isAnalyzingThis}
                                      onClick={(e) => handleAnalyzeSingleError(err.id, e)}
                                      title="Azonnali AI hiba-analízis, gyökérok és megoldás ellenőrzése"
                                    >
                                      {isAnalyzingThis
                                        ? "Elemzés..."
                                        : aiAnalysis
                                        ? "AI Diagnózis"
                                        : "AI Analízis"}
                                    </button>
                                    {err.status === "active" && (
                                      <>
                                        <button
                                          type="button"
                                          className="mgmt-btn mgmt-btn-Docs"
                                          style={{ padding: "5px 10px", fontSize: "11.5px" }}
                                          onClick={(e) => handleResolveSingleError(err.id, e)}
                                          title="Megoldottnak jelölés (áthelyezés a Megoldott hibák fülre)"
                                        >
                                          Megoldva
                                        </button>
                                        <button
                                          type="button"
                                          className="mgmt-btn"
                                          style={{ padding: "5px 10px", fontSize: "11.5px" }}
                                          onClick={(e) => handleDeleteSingleError(err.id, false, e)}
                                          title="Törlés (áthelyezés a Törölt hibák fülre)"
                                        >
                                          Törlés
                                        </button>
                                      </>
                                    )}
                                    {err.status === "resolved" && (
                                      <>
                                        <button
                                          type="button"
                                          className="mgmt-btn mgmt-btn-Docs"
                                          style={{ padding: "5px 10px", fontSize: "11.5px" }}
                                          onClick={(e) => handleRestoreSingleError(err.id, e)}
                                          title="Visszaállítás az aktív hibák közé"
                                        >
                                          Visszaállítás
                                        </button>
                                        <button
                                          type="button"
                                          className="mgmt-btn"
                                          style={{ padding: "5px 10px", fontSize: "11.5px" }}
                                          onClick={(e) => handleDeleteSingleError(err.id, false, e)}
                                          title="Áthelyezés a Törölt hibák fülre"
                                        >
                                          Törlés
                                        </button>
                                      </>
                                    )}
                                    {err.status === "deleted" && (
                                      <>
                                        <button
                                          type="button"
                                          className="mgmt-btn mgmt-btn-Docs"
                                          style={{ padding: "5px 10px", fontSize: "11.5px" }}
                                          onClick={(e) => handleRestoreSingleError(err.id, e)}
                                          title="Visszaállítás az aktív hibák közé"
                                        >
                                          Visszaállítás
                                        </button>
                                        <button
                                          type="button"
                                          className="mgmt-btn mgmt-btn-danger"
                                          style={{ padding: "5px 10px", fontSize: "11.5px" }}
                                          onClick={(e) => handleDeleteSingleError(err.id, true, e)}
                                          title="Végleges törlés az adatbázisból"
                                        >
                                          Végleges törlés
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr>
                                  <td colSpan={8} style={{ padding: 0 }}>
                                    <div className="mgmt-detail-box">
                                      {/* AI Diagnosztika Kártya (ha már lefutott vagy innen indítják) */}
                                      {aiAnalysis ? (
                                        <div
                                          style={{
                                            marginBottom: "16px",
                                            padding: "14px 16px",
                                            borderRadius: "8px",
                                            background: "var(--mgmt-surface)",
                                            border: `1px solid ${
                                              aiAnalysis.fix_status === "already_fixed"
                                                ? "rgba(22, 163, 74, 0.45)"
                                                : "rgba(13, 148, 136, 0.45)"
                                            }`,
                                          }}
                                        >
                                          <div
                                            style={{
                                              display: "flex",
                                              justifyContent: "space-between",
                                              alignItems: "center",
                                              flexWrap: "wrap",
                                              gap: "8px",
                                              marginBottom: "10px",
                                              paddingBottom: "8px",
                                              borderBottom: "1px solid var(--mgmt-border)",
                                            }}
                                          >
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                              <span style={{ fontSize: "13px", fontWeight: 600 }}>
                                                AI Hiba-Analízis és Megoldási Javaslat
                                              </span>
                                              <span
                                                style={{
                                                  fontSize: "11px",
                                                  fontWeight: 600,
                                                  padding: "2px 8px",
                                                  borderRadius: "4px",
                                                  background:
                                                    aiAnalysis.fix_status === "already_fixed"
                                                      ? "rgba(22, 163, 74, 0.14)"
                                                      : "rgba(245, 158, 11, 0.14)",
                                                  color:
                                                    aiAnalysis.fix_status === "already_fixed"
                                                      ? "#16a34a"
                                                      : "#d97706",
                                                }}
                                              >
                                                {aiAnalysis.fix_status_label}
                                              </span>
                                              <span style={{ fontSize: "11px", color: "var(--mgmt-muted)" }}>
                                                Motor: {aiAnalysis.ai_engine}
                                              </span>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                              <button
                                                type="button"
                                                className="mgmt-btn"
                                                style={{ padding: "4px 10px", fontSize: "11.5px" }}
                                                onClick={() =>
                                                  copyToClipboard(
                                                    `HIBA: ${err.message}\nKOMPONENS: ${err.component} (${err.url})\nMI A HIBA: ${aiAnalysis.summary}\nGYÖKÉROK: ${aiAnalysis.root_cause}\nÁLLAPOT: ${aiAnalysis.resolution_status_text}\nMEGOLDÁS:\n- ${aiAnalysis.solution_steps.join("\n- ")}`,
                                                    `ai-${err.id}`
                                                  )
                                                }
                                              >
                                                {copiedId === `ai-${err.id}`
                                                  ? "AI elemzés másolva"
                                                  : "AI elemzés másolása"}
                                              </button>
                                              {!isResolved && (
                                                <button
                                                  type="button"
                                                  className="mgmt-btn mgmt-btn-primary"
                                                  style={{ padding: "4px 10px", fontSize: "11.5px" }}
                                                  onClick={(e) => handleResolveSingleError(err.id, e)}
                                                >
                                                  Megoldottnak jelölés
                                                </button>
                                              )}
                                            </div>
                                          </div>

                                          <div style={{ display: "grid", gap: "8px", fontSize: "12.5px", lineHeight: 1.55 }}>
                                            <div>
                                              <strong>Mi a hiba?</strong> {aiAnalysis.summary}
                                            </div>
                                            <div>
                                              <strong>Mi okozta (Gyökérok)?</strong> {aiAnalysis.root_cause}
                                            </div>
                                            <div
                                              style={{
                                                padding: "8px 12px",
                                                borderRadius: "6px",
                                                background:
                                                  aiAnalysis.fix_status === "already_fixed"
                                                    ? "rgba(22, 163, 74, 0.09)"
                                                    : "rgba(13, 148, 136, 0.08)",
                                                color:
                                                  aiAnalysis.fix_status === "already_fixed"
                                                    ? "#15803d"
                                                    : "var(--mgmt-fg)",
                                                fontWeight: 500,
                                              }}
                                            >
                                              <strong>Megoldottuk-e már?</strong> {aiAnalysis.resolution_status_text}
                                            </div>
                                            <div>
                                              <strong>Hogyan oldható meg / Teendők ({aiAnalysis.affected_file}):</strong>
                                              <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
                                                {aiAnalysis.solution_steps.map((step, i) => (
                                                  <li key={i}>{step}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div
                                          style={{
                                            marginBottom: "14px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: "10px 14px",
                                            borderRadius: "6px",
                                            background: "var(--mgmt-surface)",
                                            border: "1px solid var(--mgmt-border)",
                                          }}
                                        >
                                          <span style={{ fontSize: "12.5px", color: "var(--mgmt-muted)" }}>
                                            Ehhez a hibához még nem futott le az AI diagnosztika.
                                          </span>
                                          <button
                                            type="button"
                                            className="mgmt-btn mgmt-btn-primary"
                                            style={{ padding: "5px 12px", fontSize: "12px" }}
                                            disabled={isAnalyzingThis}
                                            onClick={(e) => handleAnalyzeSingleError(err.id, e)}
                                          >
                                            {isAnalyzingThis ? "AI Analízis folyamatban..." : "AI Analízis indítása most"}
                                          </button>
                                        </div>
                                      )}

                                      <div className="mgmt-detail-grid">
                                        <div className="mgmt-detail-item">
                                          <div className="mgmt-detail-item-label">Hiba Azonosító (ID)</div>
                                          <code>{err.id}</code>
                                        </div>
                                        <div className="mgmt-detail-item">
                                          <div className="mgmt-detail-item-label">Érintett Cég</div>
                                          <div>{err.company_name}</div>
                                        </div>
                                        <div className="mgmt-detail-item">
                                          <div className="mgmt-detail-item-label">URL / Útvonal</div>
                                          <div>{err.url || "Nem elérhető"}</div>
                                        </div>
                                        <div className="mgmt-detail-item">
                                          <div className="mgmt-detail-item-label">Felhasználó ID</div>
                                          <div>{err.user_id || "Rendszer / Anonim"}</div>
                                        </div>
                                      </div>

                                      {err.stack_trace && (
                                        <div>
                                          <div className="mgmt-detail-item-label">Stack Trace</div>
                                          <div style={{ position: "relative" }}>
                                            <button
                                              className="mgmt-copy-btn"
                                              onClick={() => copyToClipboard(err.stack_trace!, err.id)}
                                            >
                                              {copiedId === err.id ? "Másolva" : "Másolás"}
                                            </button>
                                            <pre className="mgmt-code-block">{err.stack_trace}</pre>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* ── SUB-TAB 2: REGISZTRÁLT CÉGEK (MODUL BADGE-EKKEL: EAISYDOCS / EAISYHR) ── */}
            {controlCenterTab === "tenants" && (
              <div className="mgmt-table-wrapper">
                <div className="mgmt-table-toolbar">
                  <div className="mgmt-table-toolbar-top">
                    <div>
                      <span style={{ fontSize: "14.5px", fontWeight: 600 }}>
                        Regisztrált Cégek ({filteredCompanies.length} / {companies.length})
                      </span>
                      <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "12px" }}>
                        Bérlői hozzáférések, regisztrált modulok (eaisyDocs / eaisyHR) és státusz kezelése
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="mgmt-btn"
                        style={{
                          padding: "7px 14px",
                          fontSize: "12.5px",
                          whiteSpace: "nowrap",
                          color: "#0d9488",
                          borderColor: "rgba(20, 184, 173, 0.45)",
                          background: "rgba(20, 184, 173, 0.08)",
                          fontWeight: 600,
                        }}
                        onClick={handleOpenEaisyBillImportModal}
                      >
                        Cég importálása eaisyBillből
                      </button>
                      <button
                        className="mgmt-btn mgmt-btn-primary"
                        style={{ padding: "7px 14px", fontSize: "12.5px", whiteSpace: "nowrap" }}
                        onClick={handleOpenCreateCompany}
                      >
                        + Új Cég Hozzáadása
                      </button>
                    </div>
                  </div>

                  <div className="mgmt-table-toolbar-filters">
                    <input
                      type="text"
                      className="mgmt-filter-input"
                      style={{ padding: "7px 12px", fontSize: "12.5px", minWidth: "240px", flex: 1 }}
                      placeholder="Keresés cégnévben, prefixben vagy adószámban..."
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                    />
                    <select
                      className="mgmt-filter-select"
                      style={{ padding: "7px 12px", fontSize: "12.5px", minWidth: "175px" }}
                      value={tenantModuleFilter}
                      onChange={(e) => setTenantModuleFilter(e.target.value as "all" | "docs" | "hr" | "both")}
                    >
                      <option value="all">Minden modul</option>
                      <option value="docs">eaisyDocs regisztrált</option>
                      <option value="hr">eaisyHR regisztrált</option>
                      <option value="both">Mindkettő (Docs + HR)</option>
                    </select>
                    <select
                      className="mgmt-filter-select"
                      style={{ padding: "7px 12px", fontSize: "12.5px", minWidth: "150px" }}
                      value={tenantStatusFilter}
                      onChange={(e) => setTenantStatusFilter(e.target.value as "all" | "active" | "inactive")}
                    >
                      <option value="all">Minden státusz</option>
                      <option value="active">Csak Aktív</option>
                      <option value="inactive">Csak Inaktív</option>
                    </select>
                  </div>
                </div>

                <table className="mgmt-table">
                  <thead>
                    <tr>
                      <th>Cég Neve</th>
                      <th>Prefix</th>
                      <th>Regisztrált Modulok</th>
                      <th>Tagok / Iratok</th>
                      <th>Létrehozva</th>
                      <th>Státusz</th>
                      <th style={{ textAlign: "right" }}>Műveletek</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                          Nem található cég a megadott szűrési feltételekkel.
                        </td>
                      </tr>
                    ) : (
                      filteredCompanies.map((c) => {
                        const hasDocs = c.elerheto_modulok.includes("docs")
                        const hasHr = c.elerheto_modulok.includes("hr")
                        const isExpanded = expandedCompanyId === c.id
                        const companyMembers = usersList
                          .map((u) => {
                            const membership = u.memberships.find((m) => m.company_id === c.id)
                            return membership ? { user: u, membership } : null
                          })
                          .filter(
                            (
                              item
                            ): item is {
                              user: ManagementUserInfo
                              membership: ManagementUserInfo["memberships"][number]
                            } => item !== null
                          )

                        return (
                          <React.Fragment key={c.id}>
                            <tr
                              className={`mgmt-row ${isExpanded ? "expanded" : ""}`}
                              onClick={() => setExpandedCompanyId(isExpanded ? null : c.id)}
                              title="Kattints a céghez rendelt tagok megtekintéséhez"
                            >
                              <td style={{ whiteSpace: "nowrap" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <svg
                                    width="14"
                                    height="14"
                                    fill="none"
                                    stroke="#64748b"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    style={{
                                      flexShrink: 0,
                                      transition: "transform 0.18s ease",
                                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                    }}
                                  >
                                    <polyline points="6 9 12 15 18 9" />
                                  </svg>
                                  <div>
                                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                                    {c.tax_number && (
                                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Adószám: {c.tax_number}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                <code>{c.filing_prefix}</code>
                              </td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                                  {hasDocs && <span className="mgmt-module-badge docs">eaisyDocs</span>}
                                  {hasHr && <span className="mgmt-module-badge hr">eaisyHR</span>}
                                </div>
                              </td>
                              <td style={{ fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" }}>
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      padding: "2px 8px",
                                      borderRadius: "999px",
                                      background: isExpanded ? "rgba(20, 184, 173, 0.18)" : "rgba(20, 184, 173, 0.1)",
                                      color: "#0d9488",
                                      border: "1px solid rgba(20, 184, 173, 0.28)",
                                      fontWeight: 600,
                                      fontSize: "11.5px",
                                    }}
                                  >
                                    {companyMembers.length} tag
                                  </span>
                                  <span>•</span>
                                  <span>
                                    <strong>{c.docs_count}</strong> irat
                                  </span>
                                </div>
                              </td>
                              <td style={{ color: "#94a3b8", fontSize: "12px", whiteSpace: "nowrap" }}>
                                {new Date(c.created_at).toLocaleDateString("hu-HU")}
                              </td>
                              <td style={{ whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      fontSize: "12px",
                                      color: c.is_active ? "#16a34a" : "#ef4444",
                                    }}
                                  >
                                    {c.is_active ? "Aktív" : "Inaktív"}
                                  </span>
                                  <button
                                    className={`mgmt-toggle-btn ${c.is_active ? "active" : "inactive"}`}
                                    style={{ padding: "3px 8px", fontSize: "11px" }}
                                    onClick={() => handleToggleCompanyStatus(c)}
                                  >
                                    {c.is_active ? "Deaktiválás" : "Aktiválás"}
                                  </button>
                                </div>
                              </td>
                              <td
                                style={{ textAlign: "right", whiteSpace: "nowrap" }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                                  {hasDocs && (
                                    <button
                                      className="mgmt-btn"
                                      style={{
                                        padding: "4px 9px",
                                        fontSize: "11.5px",
                                        color: "#0d9488",
                                        borderColor: "rgba(20, 184, 173, 0.35)",
                                      }}
                                      onClick={() => handleEnterCompany(c, "docs")}
                                      title="Belépés a cég eaisyDocs felületére"
                                    >
                                      Belépés (Docs)
                                    </button>
                                  )}
                                  {hasHr && (
                                    <button
                                      className="mgmt-btn"
                                      style={{
                                        padding: "4px 9px",
                                        fontSize: "11.5px",
                                        color: "#4f46e5",
                                        borderColor: "rgba(99, 102, 241, 0.35)",
                                      }}
                                      onClick={() => handleEnterCompany(c, "hr")}
                                      title="Belépés a cég eaisyHR felületére"
                                    >
                                      Belépés (HR)
                                    </button>
                                  )}
                                  <button
                                    className="mgmt-btn"
                                    style={{ padding: "4px 9px", fontSize: "11.5px" }}
                                    onClick={() => handleOpenEditCompany(c)}
                                    title="Cég moduljainak (Docs/HR) és adatainak szerkesztése"
                                  >
                                    Szerkesztés
                                  </button>
                                  <button
                                    className="mgmt-btn"
                                    style={{ padding: "4px 9px", fontSize: "11.5px" }}
                                    onClick={() => {
                                      setSelectedTenant(c.id)
                                      setControlCenterTab("errors")
                                    }}
                                  >
                                    Hibák
                                  </button>
                                  <button
                                    className="mgmt-btn mgmt-btn-outline-danger"
                                    style={{ padding: "4px 9px", fontSize: "11.5px" }}
                                    onClick={() => setDeletingCompany(c)}
                                  >
                                    Törlés
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr>
                                <td colSpan={7} style={{ padding: 0 }}>
                                  <div className="mgmt-detail-box" style={{ padding: "14px 20px" }}>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        marginBottom: "10px",
                                        flexWrap: "wrap",
                                        gap: "8px",
                                      }}
                                    >
                                      <div style={{ fontSize: "12.5px", fontWeight: 600 }}>
                                        Hozzárendelt tagok — {c.name} ({companyMembers.length} fő)
                                      </div>
                                      <button
                                        type="button"
                                        className="mgmt-btn"
                                        style={{ padding: "4px 10px", fontSize: "11.5px" }}
                                        onClick={() => {
                                          setUserCompanyFilter(c.id)
                                          setControlCenterTab("users")
                                        }}
                                      >
                                        Megnyitás a Felhasználók listában
                                      </button>
                                    </div>

                                    {companyMembers.length === 0 ? (
                                      <div
                                        style={{
                                          padding: "16px",
                                          textAlign: "center",
                                          fontSize: "12px",
                                          color: "#64748b",
                                          background: "rgba(255,255,255,0.6)",
                                          borderRadius: "6px",
                                          border: "1px solid rgba(148,163,184,0.2)",
                                        }}
                                      >
                                        Ehhez a céghez jelenleg nincs hozzárendelve egyetlen felhasználó sem.
                                      </div>
                                    ) : (
                                      <div
                                        style={{
                                          borderRadius: "6px",
                                          border: "1px solid rgba(148,163,184,0.25)",
                                          overflow: "hidden",
                                        }}
                                      >
                                        <table className="mgmt-table" style={{ fontSize: "12px" }}>
                                          <thead>
                                            <tr>
                                              <th style={{ padding: "8px 12px" }}>Tag Neve és E-mail Címe</th>
                                              <th style={{ padding: "8px 12px" }}>Elérhető Modulok</th>
                                              <th style={{ padding: "8px 12px" }}>Céges Jogállás</th>
                                              <th style={{ padding: "8px 12px" }}>Szerepkörök a Cégben</th>
                                              <th style={{ padding: "8px 12px" }}>Utolsó Belépés</th>
                                              <th style={{ padding: "8px 12px", textAlign: "right" }}>Műveletek</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {companyMembers.map(({ user: u, membership: m }) => {
                                              const uHasDocs = u.elerheto_modulok.includes("docs")
                                              const uHasHr = u.elerheto_modulok.includes("hr")
                                              const isSuperAccount =
                                                u.email.toLowerCase() === "management@thinkai.hu" ||
                                                u.email.toLowerCase() === "superadmin@thinkai.hu" ||
                                                u.elerheto_modulok.includes("management")

                                              return (
                                                <tr key={m.id}>
                                                  <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                      <span style={{ fontWeight: 600 }}>{u.nev}</span>
                                                      {isSuperAccount && (
                                                        <span className="mgmt-badge-super">SUPERADMIN</span>
                                                      )}
                                                    </div>
                                                    <div style={{ fontSize: "11px", color: "#64748b" }}>{u.email}</div>
                                                  </td>
                                                  <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                                                    <div
                                                      style={{
                                                        display: "inline-flex",
                                                        gap: "5px",
                                                        alignItems: "center",
                                                      }}
                                                    >
                                                      {uHasDocs && (
                                                        <span
                                                          className="mgmt-module-badge docs"
                                                          style={{ fontSize: "10.5px" }}
                                                        >
                                                          eaisyDocs
                                                        </span>
                                                      )}
                                                      {uHasHr && (
                                                        <span
                                                          className="mgmt-module-badge hr"
                                                          style={{ fontSize: "10.5px" }}
                                                        >
                                                          eaisyHR
                                                        </span>
                                                      )}
                                                    </div>
                                                  </td>
                                                  <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                                                    <span className={`mgmt-role-badge ${m.role}`}>{m.role}</span>
                                                  </td>
                                                  <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                                                    <div
                                                      style={{
                                                        display: "inline-flex",
                                                        gap: "6px",
                                                        alignItems: "center",
                                                      }}
                                                    >
                                                      {uHasDocs && m.docs_szerepkor && (
                                                        <span
                                                          className="mgmt-module-badge docs"
                                                          style={{ fontSize: "10.5px" }}
                                                        >
                                                          Docs: {DOCS_ROLE_LABELS[m.docs_szerepkor] || m.docs_szerepkor}
                                                        </span>
                                                      )}
                                                      {uHasHr && m.hr_szerepkor && (
                                                        <span
                                                          className="mgmt-module-badge hr"
                                                          style={{ fontSize: "10.5px" }}
                                                        >
                                                          HR: {HR_ROLE_LABELS[m.hr_szerepkor] || m.hr_szerepkor}
                                                        </span>
                                                      )}
                                                    </div>
                                                  </td>
                                                  <td
                                                    style={{
                                                      padding: "8px 12px",
                                                      color: "#94a3b8",
                                                      fontSize: "11.5px",
                                                      whiteSpace: "nowrap",
                                                    }}
                                                  >
                                                    {u.last_sign_in_at
                                                      ? new Date(u.last_sign_in_at).toLocaleString("hu-HU", {
                                                          year: "numeric",
                                                          month: "2-digit",
                                                          day: "2-digit",
                                                          hour: "2-digit",
                                                          minute: "2-digit",
                                                        })
                                                      : "Még nem lépett be"}
                                                  </td>
                                                  <td
                                                    style={{
                                                      padding: "8px 12px",
                                                      textAlign: "right",
                                                      whiteSpace: "nowrap",
                                                    }}
                                                  >
                                                    <div style={{ display: "inline-flex", gap: "6px" }}>
                                                      <button
                                                        type="button"
                                                        className="mgmt-btn"
                                                        style={{
                                                          padding: "3px 8px",
                                                          fontSize: "11px",
                                                          color: "#0d9488",
                                                          borderColor: "rgba(20, 184, 173, 0.35)",
                                                        }}
                                                        onClick={() => {
                                                          handleSelectPermUser(u)
                                                          setPermSelectedCompanyId(c.id)
                                                          setControlCenterTab("permissions")
                                                        }}
                                                      >
                                                        Jogosultságok
                                                      </button>
                                                      <button
                                                        type="button"
                                                        className="mgmt-btn"
                                                        style={{ padding: "3px 8px", fontSize: "11px" }}
                                                        onClick={() => handleOpenEditUser(u)}
                                                      >
                                                        Szerkesztés
                                                      </button>
                                                    </div>
                                                  </td>
                                                </tr>
                                              )
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── SUB-TAB 3: REGISZTRÁLT FELHASZNÁLÓK (MODULOK + CÉGEK + SZEREPKÖRÖK + ÚJ FELHASZNÁLÓ) ── */}
            {controlCenterTab === "users" && (
              <div className="mgmt-table-wrapper">
                <div className="mgmt-table-toolbar">
                  <div className="mgmt-table-toolbar-top">
                    <div>
                      <span style={{ fontSize: "14.5px", fontWeight: 600 }}>
                        Regisztrált Felhasználók ({filteredUsers.length} / {usersList.length})
                      </span>
                      <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "12px" }}>
                        Modul hozzáférések (eaisyDocs / eaisyHR), hozzárendelt cégek és szerepkörök kezelése
                      </span>
                    </div>
                    <button
                      className="mgmt-btn mgmt-btn-primary"
                      style={{ padding: "7px 14px", fontSize: "12.5px", whiteSpace: "nowrap" }}
                      onClick={handleOpenCreateUser}
                    >
                      + Új Felhasználó Felvétele
                    </button>
                  </div>

                  <div className="mgmt-table-toolbar-filters">
                    <input
                      type="text"
                      className="mgmt-filter-input"
                      style={{ padding: "7px 12px", fontSize: "12.5px", minWidth: "240px", flex: 1 }}
                      placeholder="Keresés névben, e-mail címben vagy cégben..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                    <select
                      className="mgmt-filter-select"
                      style={{ padding: "7px 12px", fontSize: "12.5px", minWidth: "170px" }}
                      value={userCompanyFilter}
                      onChange={(e) => setUserCompanyFilter(e.target.value)}
                    >
                      <option value="">Minden cég</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="mgmt-filter-select"
                      style={{ padding: "7px 12px", fontSize: "12.5px", minWidth: "165px" }}
                      value={userModuleFilter}
                      onChange={(e) => setUserModuleFilter(e.target.value as "all" | "docs" | "hr" | "both")}
                    >
                      <option value="all">Minden modul</option>
                      <option value="docs">eaisyDocs hozzáférés</option>
                      <option value="hr">eaisyHR hozzáférés</option>
                      <option value="both">Mindkettő (Docs + HR)</option>
                    </select>
                    <select
                      className="mgmt-filter-select"
                      style={{ padding: "7px 12px", fontSize: "12.5px", minWidth: "160px" }}
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value)}
                    >
                      <option value="">Minden szerepkör</option>
                      <option value="admin">Admin</option>
                      <option value="vezeto">Vezető</option>
                      <option value="munkavallalo">Munkavállaló</option>
                    </select>
                  </div>
                </div>

                <table className="mgmt-table">
                  <thead>
                    <tr>
                      <th>Felhasználó</th>
                      <th>Elérhető Modulok</th>
                      <th style={{ textAlign: "center" }}>Hozzárendelt Cégek</th>
                      <th>Utolsó Belépés</th>
                      <th>Regisztráció</th>
                      <th style={{ textAlign: "right" }}>Műveletek</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                          Nem található felhasználó a megadott szűrési feltételekkel.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const hasDocs = u.elerheto_modulok.includes("docs")
                        const hasHr = u.elerheto_modulok.includes("hr")
                        const isSuperAccount =
                          u.email.toLowerCase() === "management@thinkai.hu" ||
                          u.email.toLowerCase() === "superadmin@thinkai.hu" ||
                          u.elerheto_modulok.includes("management")
                        const isExpanded = expandedUserId === u.id

                        return (
                          <React.Fragment key={u.id}>
                            <tr
                              className={`mgmt-row ${isExpanded ? "expanded" : ""}`}
                              onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                              title="Kattints a hozzárendelt cégek és szerepkörök megtekintéséhez"
                            >
                              <td style={{ whiteSpace: "nowrap" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <svg
                                    width="14"
                                    height="14"
                                    fill="none"
                                    stroke="#64748b"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    style={{
                                      flexShrink: 0,
                                      transition: "transform 0.18s ease",
                                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                    }}
                                  >
                                    <polyline points="6 9 12 15 18 9" />
                                  </svg>
                                  <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <span style={{ fontWeight: 600, fontSize: "13px" }}>{u.nev}</span>
                                      {isSuperAccount && <span className="mgmt-badge-super">SUPERADMIN</span>}
                                    </div>
                                    <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                                      {u.email || "-"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                                  {hasDocs && <span className="mgmt-module-badge docs">eaisyDocs</span>}
                                  {hasHr && <span className="mgmt-module-badge hr">eaisyHR</span>}
                                </div>
                              </td>
                              <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                                {u.memberships.length > 0 ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      minWidth: "28px",
                                      height: "28px",
                                      padding: "0 8px",
                                      borderRadius: "999px",
                                      background: isExpanded ? "rgba(20, 184, 173, 0.22)" : "rgba(20, 184, 173, 0.12)",
                                      color: "#0d9488",
                                      border: "1px solid rgba(20, 184, 173, 0.3)",
                                      fontSize: "12px",
                                      fontWeight: 600,
                                    }}
                                    title={u.memberships.map((m) => m.company_name).join(", ")}
                                  >
                                    {u.memberships.length}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>0</span>
                                )}
                              </td>
                              <td style={{ color: "#94a3b8", fontSize: "12px", whiteSpace: "nowrap" }}>
                                {u.last_sign_in_at
                                  ? new Date(u.last_sign_in_at).toLocaleString("hu-HU", {
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Még nem lépett be"}
                              </td>
                              <td style={{ color: "#94a3b8", fontSize: "12px", whiteSpace: "nowrap" }}>
                                {new Date(u.created_at).toLocaleDateString("hu-HU")}
                              </td>
                              <td
                                style={{ textAlign: "right", whiteSpace: "nowrap" }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div style={{ display: "inline-flex", gap: "6px" }}>
                                  <button
                                    className="mgmt-btn"
                                    style={{
                                      padding: "4px 10px",
                                      fontSize: "12px",
                                      color: "#0d9488",
                                      borderColor: "rgba(20, 184, 173, 0.35)",
                                    }}
                                    onClick={() => {
                                      handleSelectPermUser(u)
                                      setControlCenterTab("permissions")
                                    }}
                                  >
                                    Jogosultságok
                                  </button>
                                  <button
                                    className="mgmt-btn"
                                    style={{ padding: "4px 10px", fontSize: "12px" }}
                                    onClick={() => handleOpenEditUser(u)}
                                  >
                                    Szerkesztés
                                  </button>
                                  {currentUser?.id !== u.id && (
                                    <button
                                      className="mgmt-btn mgmt-btn-outline-danger"
                                      style={{ padding: "4px 8px", fontSize: "12px" }}
                                      onClick={() => setDeletingUser(u)}
                                    >
                                      Törlés
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr>
                                <td colSpan={6} style={{ padding: 0 }}>
                                  <div className="mgmt-detail-box" style={{ padding: "12px 20px" }}>
                                    {u.memberships.length === 0 ? (
                                      <div
                                        style={{
                                          padding: "14px",
                                          textAlign: "center",
                                          fontSize: "12px",
                                          color: "#64748b",
                                          background: "rgba(255,255,255,0.6)",
                                          borderRadius: "6px",
                                          border: "1px solid rgba(148,163,184,0.2)",
                                        }}
                                      >
                                        {isSuperAccount
                                          ? "Központi Rendszer (SUPERADMIN) — nincs külön bérlői céghez rendelve."
                                          : "Ez a felhasználó jelenleg nincs hozzárendelve egyetlen céghez sem."}
                                      </div>
                                    ) : (
                                      <div
                                        style={{
                                          borderRadius: "6px",
                                          border: "1px solid rgba(148,163,184,0.25)",
                                          overflow: "hidden",
                                        }}
                                      >
                                        <table className="mgmt-table" style={{ fontSize: "12px" }}>
                                          <thead>
                                            <tr>
                                              <th style={{ padding: "8px 14px" }}>Cég</th>
                                              <th style={{ padding: "8px 14px" }}>Rang</th>
                                              <th style={{ padding: "8px 14px" }}>eaisyDocs Szerepkör</th>
                                              <th style={{ padding: "8px 14px" }}>eaisyHR Szerepkör</th>
                                              <th style={{ padding: "8px 14px", textAlign: "center" }}>Iratok</th>
                                              <th style={{ padding: "8px 14px", textAlign: "center" }}>Ügyiratok</th>
                                              <th style={{ padding: "8px 14px", textAlign: "right" }}>Havi költség</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {u.memberships.map((m) => {
                                              const compStats = companies.find((c) => c.id === m.company_id)
                                              return (
                                                <tr key={m.id}>
                                                  <td style={{ padding: "8px 14px", fontWeight: 600, whiteSpace: "nowrap" }}>
                                                    {m.company_name}
                                                  </td>
                                                  <td style={{ padding: "8px 14px", whiteSpace: "nowrap" }}>
                                                    <span className={`mgmt-role-badge ${m.role}`}>{m.role}</span>
                                                  </td>
                                                  <td style={{ padding: "8px 14px", whiteSpace: "nowrap" }}>
                                                    {hasDocs && m.docs_szerepkor ? (
                                                      <span
                                                        className="mgmt-module-badge docs"
                                                        style={{ fontSize: "10.5px" }}
                                                      >
                                                        {DOCS_ROLE_LABELS[m.docs_szerepkor] || m.docs_szerepkor}
                                                      </span>
                                                    ) : (
                                                      <span style={{ color: "#94a3b8" }}>—</span>
                                                    )}
                                                  </td>
                                                  <td style={{ padding: "8px 14px", whiteSpace: "nowrap" }}>
                                                    {hasHr && m.hr_szerepkor ? (
                                                      <span
                                                        className="mgmt-module-badge hr"
                                                        style={{ fontSize: "10.5px" }}
                                                      >
                                                        {HR_ROLE_LABELS[m.hr_szerepkor] || m.hr_szerepkor}
                                                      </span>
                                                    ) : (
                                                      <span style={{ color: "#94a3b8" }}>—</span>
                                                    )}
                                                  </td>
                                                  <td
                                                    style={{
                                                      padding: "8px 14px",
                                                      textAlign: "center",
                                                      color: "#64748b",
                                                      fontVariantNumeric: "tabular-nums",
                                                    }}
                                                  >
                                                    {compStats?.docs_count ?? 0}
                                                  </td>
                                                  <td
                                                    style={{
                                                      padding: "8px 14px",
                                                      textAlign: "center",
                                                      color: "#64748b",
                                                      fontVariantNumeric: "tabular-nums",
                                                    }}
                                                  >
                                                    {compStats?.dossiers_count ?? 0}
                                                  </td>
                                                  <td
                                                    style={{
                                                      padding: "8px 14px",
                                                      textAlign: "right",
                                                      fontWeight: 600,
                                                      fontVariantNumeric: "tabular-nums",
                                                      whiteSpace: "nowrap",
                                                    }}
                                                  >
                                                    ${(compStats?.cost_usd ?? 0).toFixed(4)}
                                                  </td>
                                                </tr>
                                              )
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── SUB-TAB 4: JOGOSULTSÁGOK (FELHASZNÁLÓ LISTA + MODUL KAPCSOLÓ + CÉGES HR/DOCS JOGOSULTSÁGI MÁTRIX) ── */}
            {controlCenterTab === "permissions" && (
              <div className="mgmt-perms-grid">
                {/* Bal oszlop: Felhasználók listája */}
                <div className="mgmt-perms-user-card">
                  <div className="mgmt-perms-user-header">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontWeight: 600,
                        fontSize: "13.5px",
                        marginBottom: "10px",
                      }}
                    >
                      <svg width="16" height="16" fill="none" stroke="#14b8ad" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <span>Felhasználók</span>
                    </div>
                    <input
                      type="text"
                      className="mgmt-form-input"
                      style={{ padding: "7px 10px", fontSize: "12px" }}
                      placeholder="Keresés név, email vagy cég..."
                      value={permUserSearch}
                      onChange={(e) => setPermUserSearch(e.target.value)}
                    />
                  </div>

                  <div className="mgmt-perms-user-list">
                    {permFilteredUsers.length === 0 ? (
                      <div style={{ padding: "24px 16px", textAlign: "center", fontSize: "12px", color: "#64748b" }}>
                        Nincs találat a keresésre.
                      </div>
                    ) : (
                      permFilteredUsers.map((u) => {
                        const isSelected = permSelectedUserId === u.id
                        return (
                          <button
                            key={u.id}
                            type="button"
                            className={`mgmt-perms-user-row ${isSelected ? "active" : ""}`}
                            onClick={() => handleSelectPermUser(u)}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "6px",
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 600,
                                  fontSize: "13px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {u.nev}
                              </span>
                              <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                                {u.elerheto_modulok.includes("docs") && (
                                  <span className="mgmt-module-badge docs" style={{ fontSize: "9.5px", padding: "1px 5px" }}>
                                    Docs
                                  </span>
                                )}
                                {u.elerheto_modulok.includes("hr") && (
                                  <span className="mgmt-module-badge hr" style={{ fontSize: "9.5px", padding: "1px 5px" }}>
                                    HR
                                  </span>
                                )}
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#64748b",
                                marginTop: "2px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {u.email}
                            </div>
                            {u.memberships.length > 0 && (
                              <div
                                style={{
                                  fontSize: "10.5px",
                                  color: "#0d9488",
                                  marginTop: "5px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={u.memberships.map((m) => m.company_name).join(", ")}
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                  style={{ flexShrink: 0 }}
                                >
                                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                </svg>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {u.memberships.map((m) => m.company_name).join(", ")}
                                </span>
                              </div>
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Jobb oszlop: Kiválasztott felhasználó jogosultságai */}
                <div>
                  {!permSelectedUser ? (
                    <div
                      className="mgmt-table-wrapper"
                      style={{
                        padding: "64px 24px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "6px" }}>
                        Nincs kiválasztott felhasználó
                      </div>
                      <div style={{ fontSize: "13px", color: "#64748b" }}>
                        Válassz ki egy felhasználót a bal oldali listából a jogosultságok megtekintéséhez és szerkesztéséhez.
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* 1. Felső Fejléc Kártya (Felhasználó adatai + Másodlagos Modul Hozzáférés Switch + Mentés gomb) */}
                      <div className="mgmt-perms-header-card">
                        <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap", flex: 1 }}>
                          {/* Bal: Név, Email, Alap fiók jelvény */}
                          <div style={{ minWidth: "200px" }}>
                            <div style={{ fontSize: "16px", fontWeight: 600 }}>{permSelectedUser.nev}</div>
                            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                              {permSelectedUser.email}
                            </div>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "6px" }}>
                              <span
                                className={`mgmt-module-badge ${permBaseModule === "hr" ? "hr" : "docs"}`}
                                style={{ fontSize: "10.5px" }}
                              >
                                {permBaseModule === "hr" ? "eaisyHR fiók" : "eaisyDocs fiók"}
                              </span>
                              <span className={`mgmt-role-badge ${permSelectedUser.szerepkor}`}>
                                {permSelectedUser.szerepkor}
                              </span>
                            </div>
                          </div>

                          {/* Elválasztó vonal */}
                          <div
                            style={{
                              width: "1px",
                              height: "36px",
                              background: "rgba(148, 163, 184, 0.3)",
                            }}
                          />

                          {/* Közép: Ha eaisyHR fiók -> "eaisyDocs hozzáférés" kapcsoló; ha eaisyDocs fiók -> "eaisyHR hozzáférés" kapcsoló */}
                          <div className="mgmt-perms-access-box">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={permSecondaryEnabled}
                              className={`mgmt-switch ${permSecondaryEnabled ? "checked" : ""}`}
                              onClick={handleToggleSecondaryModule}
                            >
                              <span className="mgmt-switch-thumb" />
                            </button>
                            <span
                              style={{
                                fontSize: "12.5px",
                                fontWeight: 600,
                                cursor: "pointer",
                                userSelect: "none",
                              }}
                              onClick={handleToggleSecondaryModule}
                            >
                              {permBaseModule === "hr" ? "eaisyDocs hozzáférés" : "eaisyHR hozzáférés"}
                            </span>
                          </div>
                        </div>

                        {/* Jobb: Mentés gomb */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          {permSaveMsg && (
                            <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#0d9488" }}>
                              {permSaveMsg}
                            </span>
                          )}
                          <button
                            type="button"
                            className="mgmt-btn mgmt-btn-primary"
                            style={{ padding: "8px 16px", fontSize: "12.5px" }}
                            disabled={permPendingCount === 0 || permSaving}
                            onClick={handleSaveUserPermissions}
                          >
                            {permSaving
                              ? "Mentés..."
                              : `Mentés${permPendingCount > 0 ? ` (${permPendingCount})` : ""}`}
                          </button>
                        </div>
                      </div>

                      {/* 2. Platform Pill Választó (eaisyHR | eaisyDocs) + Cég Legördülő Menü */}
                      {permSelectedUser.memberships.length === 0 ? (
                        <div
                          className="mgmt-table-wrapper"
                          style={{ padding: "40px 24px", textAlign: "center" }}
                        >
                          <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                            Ez a felhasználó még nincs hozzárendelve egyetlen céghez sem.
                          </div>
                          <div style={{ fontSize: "12.5px", color: "#64748b", marginBottom: "16px" }}>
                            A céges jogosultságok beállításához először rendeld hozzá legalább egy céghez.
                          </div>
                          <button
                            type="button"
                            className="mgmt-btn mgmt-btn-primary"
                            onClick={() => handleOpenEditUser(permSelectedUser)}
                          >
                            Cégek Hozzárendelése
                          </button>
                        </div>
                      ) : (
                        <>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              flexWrap: "wrap",
                              marginBottom: "16px",
                            }}
                          >
                            {/* Platform választó pillek */}
                            <div className="mgmt-subnav-pills">
                              {permDraftModules.includes("hr") && (
                                <button
                                  type="button"
                                  className={`mgmt-subnav-pill ${permPlatform === "hr" ? "active" : ""}`}
                                  onClick={() => setPermPlatform("hr")}
                                >
                                  <span>eaisyHR</span>
                                </button>
                              )}
                              {permDraftModules.includes("docs") && (
                                <button
                                  type="button"
                                  className={`mgmt-subnav-pill ${permPlatform === "docs" ? "active" : ""}`}
                                  onClick={() => setPermPlatform("docs")}
                                >
                                  <span>eaisyDocs</span>
                                </button>
                              )}
                            </div>

                            {/* Cég választó legördülő */}
                            <select
                              className="mgmt-filter-select"
                              style={{ padding: "8px 14px", fontSize: "12.5px", fontWeight: 600, minWidth: "240px" }}
                              value={permSelectedCompanyId || permSelectedUser.memberships[0]?.company_id || ""}
                              onChange={(e) => setPermSelectedCompanyId(e.target.value)}
                            >
                              {permSelectedUser.memberships.map((m) => {
                                const draft = permDraftCompanies[m.company_id]
                                const roleDisplay =
                                  permPlatform === "hr"
                                    ? CANONICAL_HR_ROLE_LABELS[draft?.hr_szerepkor || "munkavallalo"] ||
                                      draft?.hr_szerepkor ||
                                      "Munkavállaló"
                                    : CANONICAL_DOCS_ROLE_LABELS[
                                        (draft?.docs_szerepkor as DocsCoreRole) || "munkavallalo"
                                      ] ||
                                      DOCS_ROLE_LABELS[draft?.docs_szerepkor || "munkavallalo"] ||
                                      "Munkavállaló"
                                return (
                                  <option key={m.company_id} value={m.company_id}>
                                    {m.company_name} ({roleDisplay})
                                  </option>
                                )
                              })}
                            </select>
                          </div>

                          {/* 3. Aktív Cég Jogosultsági Mátrix Kártya */}
                          {(() => {
                            const activeCompId =
                              permSelectedCompanyId || permSelectedUser.memberships[0]?.company_id
                            const activeMembership = permSelectedUser.memberships.find(
                              (m) => m.company_id === activeCompId
                            )
                            const activeDraft = activeCompId ? permDraftCompanies[activeCompId] : undefined

                            if (!activeCompId || !activeMembership || !activeDraft) return null

                            // ── A) EAISYHR MODUL-HOZZÁFÉRÉSI MÁTRIX (OLVASÁS / ÍRÁS KAPCSOLÓKKAL) ──
                            if (permPlatform === "hr" && permDraftModules.includes("hr")) {
                              const isHrAdmin = activeDraft.hr_szerepkor === "admin"
                              const origHrRole: HrCoreRole =
                                activeMembership.hr_szerepkor === "admin" ||
                                activeMembership.hr_szerepkor === "vezeto"
                                  ? activeMembership.hr_szerepkor
                                  : "munkavallalo"
                              const origHrModsArr =
                                origHrRole === "admin" ? ALL_HR_MODULES : activeMembership.hr_modulok || []
                              const origHrModsSet = new Set<string>(origHrModsArr)
                              const origHrWriteSet = new Set<string>(
                                origHrRole === "admin"
                                  ? ALL_HR_MODULES
                                  : Array.isArray(activeMembership.hr_iras_modulok)
                                  ? activeMembership.hr_iras_modulok.filter((k) => origHrModsSet.has(k))
                                  : origHrModsArr
                              )
                              const draftHrWriteMods =
                                activeDraft.hr_iras_modulok || activeDraft.hr_modulok

                              const filteredHrDefs = HR_MODULE_DEFINITIONS.filter((def) => {
                                const q = permModSearch.trim().toLowerCase()
                                if (!q) return true
                                return (
                                  def.label.toLowerCase().includes(q) ||
                                  def.shortLabel.toLowerCase().includes(q) ||
                                  def.description.toLowerCase().includes(q) ||
                                  def.group.toLowerCase().includes(q)
                                )
                              })

                              const groups: Array<"HR Munkaasztal" | "Dolgozói Életút" | "Rendszer"> = [
                                "HR Munkaasztal",
                                "Dolgozói Életút",
                                "Rendszer",
                              ]

                              return (
                                <div className="mgmt-table-wrapper">
                                  <div className="mgmt-table-header-bar">
                                    <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                                      <div>
                                        <div style={{ fontSize: "14.5px", fontWeight: 600 }}>
                                          {activeMembership.company_name}
                                        </div>
                                        <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                                          eaisyHR Vállalati Modul-hozzáférési Mátrix
                                        </div>
                                      </div>

                                      {/* Alapszerepkör választó (Munkavállaló / Vezető / Admin) */}
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
                                          Alapszerepkör:
                                        </span>
                                        <select
                                          className="mgmt-form-select"
                                          style={{ padding: "5px 10px", fontSize: "12px", fontWeight: 600, width: "auto" }}
                                          value={activeDraft.hr_szerepkor}
                                          onChange={(e) =>
                                            handlePermHrRoleChange(
                                              activeCompId,
                                              e.target.value as HrCoreRole
                                            )
                                          }
                                        >
                                          {HR_CORE_ROLES.map((r) => (
                                            <option key={r.value} value={r.value}>
                                              {r.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                      {!isHrAdmin && (
                                        <>
                                          <button
                                            type="button"
                                            className="mgmt-btn"
                                            style={{ padding: "5px 10px", fontSize: "11.5px" }}
                                            onClick={() =>
                                              handlePermSetGroupHrMode(
                                                activeCompId,
                                                [...ALL_HR_MODULES],
                                                "read_only"
                                              )
                                            }
                                            title="Minden modul csak olvasási joggal (Auditor / Betekintő)"
                                          >
                                            Csak olvasás (R+)
                                          </button>
                                          <button
                                            type="button"
                                            className="mgmt-btn"
                                            style={{ padding: "5px 10px", fontSize: "11.5px" }}
                                            onClick={() =>
                                              handlePermSetGroupHrMode(
                                                activeCompId,
                                                [...ALL_HR_MODULES],
                                                "read_write"
                                              )
                                            }
                                            title="Minden modul olvasási és írási joggal"
                                          >
                                            Teljes (W+)
                                          </button>
                                          <button
                                            type="button"
                                            className="mgmt-btn"
                                            style={{ padding: "5px 10px", fontSize: "11.5px" }}
                                            onClick={() =>
                                              handlePermSetGroupHrMode(
                                                activeCompId,
                                                [...ALL_HR_MODULES],
                                                "none"
                                              )
                                            }
                                          >
                                            Tilt
                                          </button>
                                        </>
                                      )}
                                      <input
                                        type="text"
                                        className="mgmt-filter-input"
                                        style={{ padding: "6px 10px", fontSize: "12px", width: "200px" }}
                                        placeholder="Modul szűrése..."
                                        value={permModSearch}
                                        onChange={(e) => setPermModSearch(e.target.value)}
                                      />
                                    </div>
                                  </div>

                                  <table className="mgmt-table">
                                    <thead>
                                      <tr>
                                        <th>Modul</th>
                                        <th style={{ textAlign: "center", width: "120px" }}>Olvasás</th>
                                        <th style={{ textAlign: "center", width: "120px" }}>Írás</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {groups.map((grpName) => {
                                        const grpDefs = filteredHrDefs.filter((d) => d.group === grpName)
                                        if (grpDefs.length === 0) return null
                                        const grpKeys = grpDefs.map((d) => d.key)

                                        return (
                                          <React.Fragment key={grpName}>
                                            <tr className="mgmt-perms-group-row">
                                              <td>{grpName}</td>
                                              <td colSpan={2} style={{ textAlign: "right" }}>
                                                {!isHrAdmin ? (
                                                  <div
                                                    style={{
                                                      display: "inline-flex",
                                                      alignItems: "center",
                                                      gap: "8px",
                                                    }}
                                                  >
                                                    <button
                                                      type="button"
                                                      style={{
                                                        background: "transparent",
                                                        border: "none",
                                                        fontSize: "10.5px",
                                                        fontWeight: 600,
                                                        color: "#0d9488",
                                                        cursor: "pointer",
                                                      }}
                                                      onClick={() =>
                                                        handlePermSetGroupHrMode(activeCompId, grpKeys, "read_only")
                                                      }
                                                      title="Csoport: Csak olvasás (Olvasás BE, Írás KI)"
                                                    >
                                                      R+
                                                    </button>
                                                    <span style={{ color: "#cbd5e1" }}>|</span>
                                                    <button
                                                      type="button"
                                                      style={{
                                                        background: "transparent",
                                                        border: "none",
                                                        fontSize: "10.5px",
                                                        fontWeight: 600,
                                                        color: "#0d9488",
                                                        cursor: "pointer",
                                                      }}
                                                      onClick={() =>
                                                        handlePermSetGroupHrMode(activeCompId, grpKeys, "read_write")
                                                      }
                                                      title="Csoport: Teljes hozzáférés (Olvasás BE, Írás BE)"
                                                    >
                                                      W+
                                                    </button>
                                                    <span style={{ color: "#cbd5e1" }}>|</span>
                                                    <button
                                                      type="button"
                                                      style={{
                                                        background: "transparent",
                                                        border: "none",
                                                        fontSize: "10.5px",
                                                        fontWeight: 600,
                                                        color: "#ef4444",
                                                        cursor: "pointer",
                                                      }}
                                                      onClick={() =>
                                                        handlePermSetGroupHrMode(activeCompId, grpKeys, "none")
                                                      }
                                                      title="Csoport: Hozzáférés tiltása"
                                                    >
                                                      Tilt
                                                    </button>
                                                    <span style={{ color: "#cbd5e1" }}>|</span>
                                                    <button
                                                      type="button"
                                                      style={{
                                                        background: "transparent",
                                                        border: "none",
                                                        fontSize: "10.5px",
                                                        fontWeight: 600,
                                                        color: "#64748b",
                                                        cursor: "pointer",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "4px",
                                                      }}
                                                      onClick={() => handlePermResetCompanyHr(activeCompId)}
                                                      title="Visszaállítás a mentett állapotra"
                                                    >
                                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                                        <path d="M3 3v5h5" />
                                                      </svg>
                                                      <span>Alaphelyzet</span>
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <span style={{ fontSize: "10.5px", color: "#0d9488" }}>
                                                    Admin szerepkör: Teljes hozzáférés
                                                  </span>
                                                )}
                                              </td>
                                            </tr>

                                            {grpDefs.map((mod) => {
                                              const isReadEnabled =
                                                isHrAdmin || activeDraft.hr_modulok.includes(mod.key)
                                              const isWriteEnabled =
                                                isHrAdmin ||
                                                (isReadEnabled && draftHrWriteMods.includes(mod.key))
                                              const wasReadEnabled = origHrModsSet.has(mod.key)
                                              const wasWriteEnabled = origHrWriteSet.has(mod.key)
                                              const isModified =
                                                isReadEnabled !== wasReadEnabled ||
                                                isWriteEnabled !== wasWriteEnabled

                                              return (
                                                <tr key={mod.key}>
                                                  <td>
                                                    <div
                                                      style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "8px",
                                                      }}
                                                    >
                                                      <span style={{ fontWeight: 600 }}>{mod.label}</span>
                                                      {!isHrAdmin && isReadEnabled && !isWriteEnabled && (
                                                        <span
                                                          style={{
                                                            fontSize: "10px",
                                                            fontWeight: 600,
                                                            color: "#0284c7",
                                                            background: "rgba(14, 165, 233, 0.12)",
                                                            border: "1px solid rgba(14, 165, 233, 0.28)",
                                                            padding: "1px 6px",
                                                            borderRadius: "4px",
                                                          }}
                                                        >
                                                          csak olvasás
                                                        </span>
                                                      )}
                                                      {!isHrAdmin && isReadEnabled && isWriteEnabled && (
                                                        <span
                                                          className="mgmt-module-badge docs"
                                                          style={{ fontSize: "10px", padding: "1px 6px" }}
                                                        >
                                                          egyedi
                                                        </span>
                                                      )}
                                                      {isModified && (
                                                        <span
                                                          style={{
                                                            fontSize: "10px",
                                                            fontWeight: 600,
                                                            color: "#f97316",
                                                            background: "rgba(249, 115, 22, 0.12)",
                                                            padding: "1px 6px",
                                                            borderRadius: "4px",
                                                          }}
                                                        >
                                                          módosítva
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div
                                                      style={{
                                                        fontSize: "11px",
                                                        color: "#64748b",
                                                        marginTop: "2px",
                                                      }}
                                                    >
                                                      {mod.description}
                                                    </div>
                                                  </td>
                                                  <td style={{ textAlign: "center" }}>
                                                    <button
                                                      type="button"
                                                      disabled={isHrAdmin}
                                                      onClick={() =>
                                                        handlePermToggleHrReadModule(activeCompId, mod.key)
                                                      }
                                                      title={
                                                        isHrAdmin
                                                          ? "Admin szerepkör esetén minden modul olvasható"
                                                          : isReadEnabled
                                                          ? "Olvasás engedélyezve (kattints a tiltáshoz)"
                                                          : "Olvasás tiltva (kattints az engedélyezéshez)"
                                                      }
                                                      style={{
                                                        width: "32px",
                                                        height: "32px",
                                                        borderRadius: "6px",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        cursor: isHrAdmin ? "not-allowed" : "pointer",
                                                        transition: "all 0.15s ease",
                                                        border: isReadEnabled
                                                          ? "1px solid rgba(20, 184, 173, 0.55)"
                                                          : "1px solid rgba(148, 163, 184, 0.35)",
                                                        background: isReadEnabled
                                                          ? "rgba(20, 184, 173, 0.14)"
                                                          : "transparent",
                                                        color: isReadEnabled ? "#0d9488" : "#94a3b8",
                                                        opacity: isHrAdmin ? 0.75 : 1,
                                                      }}
                                                    >
                                                      <svg
                                                        width="15"
                                                        height="15"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                      >
                                                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                                        <circle cx="12" cy="12" r="3" />
                                                      </svg>
                                                    </button>
                                                  </td>
                                                  <td style={{ textAlign: "center" }}>
                                                    <button
                                                      type="button"
                                                      disabled={isHrAdmin}
                                                      onClick={() =>
                                                        handlePermToggleHrWriteModule(activeCompId, mod.key)
                                                      }
                                                      title={
                                                        isHrAdmin
                                                          ? "Admin szerepkör esetén minden modul írható"
                                                          : isWriteEnabled
                                                          ? "Írás engedélyezve (kattints a csak olvasás módhoz)"
                                                          : "Írás tiltva (kattints az írási jog engedélyezéséhez)"
                                                      }
                                                      style={{
                                                        width: "32px",
                                                        height: "32px",
                                                        borderRadius: "6px",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        cursor: isHrAdmin ? "not-allowed" : "pointer",
                                                        transition: "all 0.15s ease",
                                                        border: isWriteEnabled
                                                          ? "1px solid rgba(20, 184, 173, 0.55)"
                                                          : "1px solid rgba(148, 163, 184, 0.35)",
                                                        background: isWriteEnabled
                                                          ? "rgba(20, 184, 173, 0.14)"
                                                          : "transparent",
                                                        color: isWriteEnabled ? "#0d9488" : "#94a3b8",
                                                        opacity: isHrAdmin ? 0.75 : 1,
                                                      }}
                                                    >
                                                      <svg
                                                        width="14"
                                                        height="14"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                      >
                                                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                                        <path d="m15 5 4 4" />
                                                      </svg>
                                                    </button>
                                                  </td>
                                                </tr>
                                              )
                                            })}
                                          </React.Fragment>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )
                            }

                            // ── B) EAISYDOCS MODUL-HOZZÁFÉRÉSI MÁTRIX (OLVASÁS / ÍRÁS KAPCSOLÓKKAL) ──
                            const currentDocsRole: DocsCoreRole =
                              activeDraft.docs_szerepkor === "admin" ||
                              activeDraft.docs_szerepkor === "rendszergazda"
                                ? "admin"
                                : activeDraft.docs_szerepkor === "vezeto"
                                ? "vezeto"
                                : "munkavallalo"
                            const isDocsAdmin = currentDocsRole === "admin"
                            const origDocsRole: DocsCoreRole =
                              activeMembership.docs_szerepkor === "admin" ||
                              activeMembership.docs_szerepkor === "rendszergazda"
                                ? "admin"
                                : activeMembership.docs_szerepkor === "vezeto"
                                ? "vezeto"
                                : "munkavallalo"
                            const origDocsModsArr =
                              origDocsRole === "admin"
                                ? ALL_DOCS_MODULES
                                : Array.isArray(activeMembership.docs_modulok) &&
                                  activeMembership.docs_modulok.length > 0
                                ? activeMembership.docs_modulok
                                : DEFAULT_DOCS_MODULES_FOR_ROLE[origDocsRole]
                            const origDocsModsSet = new Set<string>(origDocsModsArr)
                            const origDocsWriteSet = new Set<string>(
                              origDocsRole === "admin"
                                ? ALL_DOCS_MODULES
                                : Array.isArray(activeMembership.docs_iras_modulok)
                                ? activeMembership.docs_iras_modulok.filter((k) => origDocsModsSet.has(k))
                                : origDocsModsArr
                            )
                            const draftDocsMods =
                              activeDraft.docs_modulok || DEFAULT_DOCS_MODULES_FOR_ROLE[currentDocsRole]
                            const draftDocsWriteMods =
                              activeDraft.docs_iras_modulok || draftDocsMods

                            const filteredDocsDefs = DOCS_MODULE_DEFINITIONS.filter((def) => {
                              const q = permModSearch.trim().toLowerCase()
                              if (!q) return true
                              return (
                                def.label.toLowerCase().includes(q) ||
                                def.shortLabel.toLowerCase().includes(q) ||
                                def.description.toLowerCase().includes(q) ||
                                def.group.toLowerCase().includes(q)
                              )
                            })

                            const docsGroups: Array<
                              "Iratkezelési Munkaasztal" | "Automatizáció és Szervezet" | "Rendszer"
                            > = ["Iratkezelési Munkaasztal", "Automatizáció és Szervezet", "Rendszer"]

                            return (
                              <div className="mgmt-table-wrapper">
                                <div className="mgmt-table-header-bar">
                                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                                    <div>
                                      <div style={{ fontSize: "14.5px", fontWeight: 600 }}>
                                        {activeMembership.company_name}
                                      </div>
                                      <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                                        eaisyDocs Vállalati Modul-hozzáférési Mátrix
                                      </div>
                                    </div>

                                    {/* Alapszerepkör választó (Munkavállaló / Vezető / Admin) */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
                                        Alapszerepkör:
                                      </span>
                                      <select
                                        className="mgmt-form-select"
                                        style={{ padding: "5px 10px", fontSize: "12px", fontWeight: 600, width: "auto" }}
                                        value={currentDocsRole}
                                        onChange={(e) =>
                                          handlePermDocsRoleChange(
                                            activeCompId,
                                            e.target.value as DocsCoreRole
                                          )
                                        }
                                      >
                                        {DOCS_CORE_ROLES.map((r) => (
                                          <option key={r.value} value={r.value}>
                                            {r.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                    {!isDocsAdmin && (
                                      <>
                                        <button
                                          type="button"
                                          className="mgmt-btn"
                                          style={{ padding: "5px 10px", fontSize: "11.5px" }}
                                          onClick={() =>
                                            handlePermSetGroupDocsMode(
                                              activeCompId,
                                              [...ALL_DOCS_MODULES],
                                              "read_only"
                                            )
                                          }
                                          title="Minden modul csak olvasási joggal (Auditor / Betekintő)"
                                        >
                                          Csak olvasás (R+)
                                        </button>
                                        <button
                                          type="button"
                                          className="mgmt-btn"
                                          style={{ padding: "5px 10px", fontSize: "11.5px" }}
                                          onClick={() =>
                                            handlePermSetGroupDocsMode(
                                              activeCompId,
                                              [...ALL_DOCS_MODULES],
                                              "read_write"
                                            )
                                          }
                                          title="Minden modul olvasási és írási joggal"
                                        >
                                          Teljes (W+)
                                        </button>
                                        <button
                                          type="button"
                                          className="mgmt-btn"
                                          style={{ padding: "5px 10px", fontSize: "11.5px" }}
                                          onClick={() =>
                                            handlePermSetGroupDocsMode(
                                              activeCompId,
                                              [...ALL_DOCS_MODULES],
                                              "none"
                                            )
                                          }
                                        >
                                          Tilt
                                        </button>
                                      </>
                                    )}
                                    <input
                                      type="text"
                                      className="mgmt-filter-input"
                                      style={{ padding: "6px 10px", fontSize: "12px", width: "200px" }}
                                      placeholder="Modul szűrése..."
                                      value={permModSearch}
                                      onChange={(e) => setPermModSearch(e.target.value)}
                                    />
                                  </div>
                                </div>

                                <table className="mgmt-table">
                                  <thead>
                                    <tr>
                                      <th>Modul</th>
                                      <th style={{ textAlign: "center", width: "120px" }}>Olvasás</th>
                                      <th style={{ textAlign: "center", width: "120px" }}>Írás</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {docsGroups.map((grpName) => {
                                      const grpDefs = filteredDocsDefs.filter((d) => d.group === grpName)
                                      if (grpDefs.length === 0) return null
                                      const grpKeys = grpDefs.map((d) => d.key)

                                      return (
                                        <React.Fragment key={grpName}>
                                          <tr className="mgmt-perms-group-row">
                                            <td>{grpName}</td>
                                            <td colSpan={2} style={{ textAlign: "right" }}>
                                              {!isDocsAdmin ? (
                                                <div
                                                  style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                  }}
                                                >
                                                  <button
                                                    type="button"
                                                    style={{
                                                      background: "transparent",
                                                      border: "none",
                                                      fontSize: "10.5px",
                                                      fontWeight: 600,
                                                      color: "#0d9488",
                                                      cursor: "pointer",
                                                    }}
                                                    onClick={() =>
                                                      handlePermSetGroupDocsMode(activeCompId, grpKeys, "read_only")
                                                    }
                                                    title="Csoport: Csak olvasás (Olvasás BE, Írás KI)"
                                                  >
                                                    R+
                                                  </button>
                                                  <span style={{ color: "#cbd5e1" }}>|</span>
                                                  <button
                                                    type="button"
                                                    style={{
                                                      background: "transparent",
                                                      border: "none",
                                                      fontSize: "10.5px",
                                                      fontWeight: 600,
                                                      color: "#0d9488",
                                                      cursor: "pointer",
                                                    }}
                                                    onClick={() =>
                                                      handlePermSetGroupDocsMode(activeCompId, grpKeys, "read_write")
                                                    }
                                                    title="Csoport: Teljes hozzáférés (Olvasás BE, Írás BE)"
                                                  >
                                                    W+
                                                  </button>
                                                  <span style={{ color: "#cbd5e1" }}>|</span>
                                                  <button
                                                    type="button"
                                                    style={{
                                                      background: "transparent",
                                                      border: "none",
                                                      fontSize: "10.5px",
                                                      fontWeight: 600,
                                                      color: "#ef4444",
                                                      cursor: "pointer",
                                                    }}
                                                    onClick={() =>
                                                      handlePermSetGroupDocsMode(activeCompId, grpKeys, "none")
                                                    }
                                                    title="Csoport: Hozzáférés tiltása"
                                                  >
                                                    Tilt
                                                  </button>
                                                  <span style={{ color: "#cbd5e1" }}>|</span>
                                                  <button
                                                    type="button"
                                                    style={{
                                                      background: "transparent",
                                                      border: "none",
                                                      fontSize: "10.5px",
                                                      fontWeight: 600,
                                                      color: "#64748b",
                                                      cursor: "pointer",
                                                      display: "inline-flex",
                                                      alignItems: "center",
                                                      gap: "4px",
                                                    }}
                                                    onClick={() => handlePermResetCompanyDocs(activeCompId)}
                                                    title="Visszaállítás a mentett állapotra"
                                                  >
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                                      <path d="M3 3v5h5" />
                                                    </svg>
                                                    <span>Alaphelyzet</span>
                                                  </button>
                                                </div>
                                              ) : (
                                                <span style={{ fontSize: "10.5px", color: "#0d9488" }}>
                                                  Admin szerepkör: Teljes hozzáférés
                                                </span>
                                              )}
                                            </td>
                                          </tr>

                                          {grpDefs.map((mod) => {
                                            const isReadEnabled =
                                              isDocsAdmin || draftDocsMods.includes(mod.key)
                                            const isWriteEnabled =
                                              isDocsAdmin ||
                                              (isReadEnabled && draftDocsWriteMods.includes(mod.key))
                                            const wasReadEnabled = origDocsModsSet.has(mod.key)
                                            const wasWriteEnabled = origDocsWriteSet.has(mod.key)
                                            const isDefaultForRole =
                                              DEFAULT_DOCS_MODULES_FOR_ROLE[currentDocsRole].includes(mod.key)
                                            const isModified =
                                              isReadEnabled !== wasReadEnabled ||
                                              isWriteEnabled !== wasWriteEnabled

                                            return (
                                              <tr key={mod.key}>
                                                <td>
                                                  <div
                                                    style={{
                                                      display: "flex",
                                                      alignItems: "center",
                                                      gap: "8px",
                                                    }}
                                                  >
                                                    <span style={{ fontWeight: 600 }}>{mod.label}</span>
                                                    {!isDocsAdmin && isReadEnabled && !isWriteEnabled && (
                                                      <span
                                                        style={{
                                                          fontSize: "10px",
                                                          fontWeight: 600,
                                                          color: "#0284c7",
                                                          background: "rgba(14, 165, 233, 0.12)",
                                                          border: "1px solid rgba(14, 165, 233, 0.28)",
                                                          padding: "1px 6px",
                                                          borderRadius: "4px",
                                                        }}
                                                      >
                                                        csak olvasás
                                                      </span>
                                                    )}
                                                    {!isDocsAdmin &&
                                                      isReadEnabled &&
                                                      isWriteEnabled &&
                                                      !isDefaultForRole && (
                                                        <span
                                                          className="mgmt-module-badge docs"
                                                          style={{ fontSize: "10px", padding: "1px 6px" }}
                                                        >
                                                          egyedi
                                                        </span>
                                                      )}
                                                    {isModified && (
                                                      <span
                                                        style={{
                                                          fontSize: "10px",
                                                          fontWeight: 600,
                                                          color: "#f97316",
                                                          background: "rgba(249, 115, 22, 0.12)",
                                                          padding: "1px 6px",
                                                          borderRadius: "4px",
                                                        }}
                                                      >
                                                        módosítva
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div
                                                    style={{
                                                      fontSize: "11px",
                                                      color: "#64748b",
                                                      marginTop: "2px",
                                                    }}
                                                  >
                                                    {mod.description}
                                                  </div>
                                                </td>
                                                <td style={{ textAlign: "center" }}>
                                                  <button
                                                    type="button"
                                                    disabled={isDocsAdmin}
                                                    onClick={() =>
                                                      handlePermToggleDocsReadModule(activeCompId, mod.key)
                                                    }
                                                    title={
                                                      isDocsAdmin
                                                        ? "Admin szerepkör esetén minden modul olvasható"
                                                        : isReadEnabled
                                                        ? "Olvasás engedélyezve (kattints a tiltáshoz)"
                                                        : "Olvasás tiltva (kattints az engedélyezéshez)"
                                                    }
                                                    style={{
                                                      width: "32px",
                                                      height: "32px",
                                                      borderRadius: "6px",
                                                      display: "inline-flex",
                                                      alignItems: "center",
                                                      justifyContent: "center",
                                                      cursor: isDocsAdmin ? "not-allowed" : "pointer",
                                                      transition: "all 0.15s ease",
                                                      border: isReadEnabled
                                                        ? "1px solid rgba(20, 184, 173, 0.55)"
                                                        : "1px solid rgba(148, 163, 184, 0.35)",
                                                      background: isReadEnabled
                                                        ? "rgba(20, 184, 173, 0.14)"
                                                        : "transparent",
                                                      color: isReadEnabled ? "#0d9488" : "#94a3b8",
                                                      opacity: isDocsAdmin ? 0.75 : 1,
                                                    }}
                                                  >
                                                    <svg
                                                      width="15"
                                                      height="15"
                                                      viewBox="0 0 24 24"
                                                      fill="none"
                                                      stroke="currentColor"
                                                      strokeWidth="2"
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                    >
                                                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                                      <circle cx="12" cy="12" r="3" />
                                                    </svg>
                                                  </button>
                                                </td>
                                                <td style={{ textAlign: "center" }}>
                                                  <button
                                                    type="button"
                                                    disabled={isDocsAdmin}
                                                    onClick={() =>
                                                      handlePermToggleDocsWriteModule(activeCompId, mod.key)
                                                    }
                                                    title={
                                                      isDocsAdmin
                                                        ? "Admin szerepkör esetén minden modul írható"
                                                        : isWriteEnabled
                                                        ? "Írás engedélyezve (kattints a csak olvasás módhoz)"
                                                        : "Írás tiltva (kattints az írási jog engedélyezéséhez)"
                                                    }
                                                    style={{
                                                      width: "32px",
                                                      height: "32px",
                                                      borderRadius: "6px",
                                                      display: "inline-flex",
                                                      alignItems: "center",
                                                      justifyContent: "center",
                                                      cursor: isDocsAdmin ? "not-allowed" : "pointer",
                                                      transition: "all 0.15s ease",
                                                      border: isWriteEnabled
                                                        ? "1px solid rgba(20, 184, 173, 0.55)"
                                                        : "1px solid rgba(148, 163, 184, 0.35)",
                                                      background: isWriteEnabled
                                                        ? "rgba(20, 184, 173, 0.14)"
                                                        : "transparent",
                                                      color: isWriteEnabled ? "#0d9488" : "#94a3b8",
                                                      opacity: isDocsAdmin ? 0.75 : 1,
                                                    }}
                                                  >
                                                    <svg
                                                      width="14"
                                                      height="14"
                                                      viewBox="0 0 24 24"
                                                      fill="none"
                                                      stroke="currentColor"
                                                      strokeWidth="2"
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                    >
                                                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                                      <path d="m15 5 4 4" />
                                                    </svg>
                                                  </button>
                                                </td>
                                              </tr>
                                            )
                                          })}
                                        </React.Fragment>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )
                          })()}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════
            TAB 3: PÉNZÜGYI ÁTTEKINTÉS
            ═══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "financials" && (
          <div>
            <div className="mgmt-kpi-grid">
              <div className="mgmt-kpi-card">
                <div className="mgmt-kpi-header">
                  <span className="mgmt-kpi-label">Összesített Költség</span>
                </div>
                <div className="mgmt-stat-big" style={{ color: "#14b8ad" }}>
                  ${overview ? overview.financials.total_cost_usd.toFixed(4) : "0.0000"}
                </div>
                <div className="mgmt-kpi-hint">AI OCR, LLM és infrastruktúra</div>
              </div>

              <div className="mgmt-kpi-card">
                <div className="mgmt-kpi-header">
                  <span className="mgmt-kpi-label">Kezelt Iratok & Ügyiratok</span>
                </div>
                <div className="mgmt-stat-big">{overview?.total_docs_count ?? 0} db</div>
                <div className="mgmt-kpi-hint">{overview?.total_dossiers_count ?? 0} aktív ügyiratban</div>
              </div>

              <div className="mgmt-kpi-card">
                <div className="mgmt-kpi-header">
                  <span className="mgmt-kpi-label">AI Feldolgozási Feladatok</span>
                </div>
                <div className="mgmt-kpi-big mgmt-stat-big">{overview?.total_ai_tasks ?? 0} db</div>
                <div className="mgmt-kpi-hint">Gemini 2.5 Flash kivonatolás és OCR</div>
              </div>

              <div className="mgmt-kpi-card">
                <div className="mgmt-kpi-header">
                  <span className="mgmt-kpi-label">Aktív Cégek</span>
                </div>
                <div className="mgmt-stat-big">{overview?.active_companies_count ?? 0}</div>
                <div className="mgmt-kpi-hint">{companies.length} regisztrált cégből</div>
              </div>
            </div>

            <div className="mgmt-table-wrapper" style={{ marginBottom: "24px" }}>
              <div className="mgmt-table-header-bar">
                <span style={{ fontSize: "14px", fontWeight: 600 }}>
                  Cégek Szerinti Használat és Költségbontás
                </span>
              </div>
              <table className="mgmt-table">
                <thead>
                  <tr>
                    <th>Cég Neve</th>
                    <th>Azonosító (Prefix)</th>
                    <th>Regisztrált Modulok</th>
                    <th>Tagok Száma</th>
                    <th>Iratok / AI Feladatok</th>
                    <th>Interakciók</th>
                    <th>Becsült Költség ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>
                        <code>{c.filing_prefix}</code>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {c.elerheto_modulok.includes("docs") && (
                            <span className="mgmt-module-badge docs">eaisyDocs</span>
                          )}
                          {c.elerheto_modulok.includes("hr") && <span className="mgmt-module-badge hr">eaisyHR</span>}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{c.members_count} fő</td>
                      <td>
                        {c.docs_count} irat / {c.ai_tasks_count} AI
                      </td>
                      <td>{c.interactions_count} db</td>
                      <td style={{ fontWeight: 700, color: "#14b8ad", fontSize: "14px" }}>
                        ${c.cost_usd.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mgmt-bento-card">
              <div className="mgmt-bento-header">
                <span className="mgmt-bento-title">Díjszabási és Elszámolási Referencia</span>
                <span className="mgmt-bento-tag">THINKAI API RATE CARD</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                  fontSize: "13px",
                }}
              >
                <div className="mgmt-subbox-item" style={{ padding: "12px" }}>
                  <span className="mgmt-subbox-item-label">Google Gemini 2.5 Flash Input</span>
                  <strong style={{ fontSize: "16px" }}>$0.075 / 1M token</strong>
                </div>
                <div className="mgmt-subbox-item" style={{ padding: "12px" }}>
                  <span className="mgmt-subbox-item-label">Google Gemini 2.5 Flash Output</span>
                  <strong style={{ fontSize: "16px" }}>$0.300 / 1M token</strong>
                </div>
                <div className="mgmt-subbox-item" style={{ padding: "12px" }}>
                  <span className="mgmt-subbox-item-label">AI OCR & Dokumentum Kivonatolás</span>
                  <strong style={{ fontSize: "16px" }}>$0.012 / dokumentum</strong>
                </div>
                <div className="mgmt-subbox-item" style={{ padding: "12px" }}>
                  <span className="mgmt-subbox-item-label">Supabase Multi-Tenant DB & Storage</span>
                  <strong style={{ fontSize: "16px" }}>$2.50 / aktív cég / hó</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════
            TAB 4: RENDSZER & WORKEREK
            ═══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "workers" && (
          <div>
            <div className="mgmt-system-banner">
              <div>
                <div className="mgmt-detail-item-label">Rendszer Uptime</div>
                <div style={{ fontSize: "16px", fontWeight: 600 }}>
                  {Math.floor((systemInfo?.uptime_seconds || 0) / 3600)}ó{" "}
                  {Math.floor(((systemInfo?.uptime_seconds || 0) % 3600) / 60)}p
                </div>
              </div>
              <div>
                <div className="mgmt-detail-item-label">Környezet</div>
                <div style={{ fontSize: "16px", fontWeight: 600, textTransform: "capitalize" }}>
                  {systemInfo?.app_env || "development"}
                </div>
              </div>
              <div>
                <div className="mgmt-detail-item-label">Node.js / Platform</div>
                <div style={{ fontSize: "14px", color: "#64748b" }}>
                  {systemInfo?.node_version} ({systemInfo?.platform})
                </div>
              </div>
              <div>
                <div className="mgmt-detail-item-label">Platform Modulok</div>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>eaisyDocs + eaisyHR Unified Core</div>
              </div>
            </div>

            <div className="mgmt-workers-grid">
              {workers.map((w) => (
                <div key={w.id} className="mgmt-worker-card">
                  <div className="mgmt-worker-top">
                    <div className="mgmt-worker-title">{w.name}</div>
                    <span className={`mgmt-worker-status-pill ${w.status}`}>
                      {w.status === "running" ? "Aktív" : "Ütemezve"}
                    </span>
                  </div>
                  <p className="mgmt-worker-desc">{w.description}</p>
                  <div className="mgmt-worker-meta">
                    <span>Típus: {w.type}</span>
                    <span>Ciklus: {w.interval}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODAL 1: ÚJ FELHASZNÁLÓ FELVÉTELE / FELHASZNÁLÓ SZERKESZTÉSE
          (Modulok: eaisyDocs / eaisyHR + Több cég + Cégenkénti Docs & HR szerepkör)
          ═══════════════════════════════════════════════════════════════════════════ */}
      {userModalMode && (
        <div className="mgmt-modal-backdrop" onClick={() => !userModalSaving && setUserModalMode(null)}>
          <div
            className="mgmt-modal-card"
            style={{ maxWidth: "700px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSaveUserModal}>
              <div className="mgmt-modal-header">
                <div>
                  <h3 className="mgmt-modal-title">
                    {userModalMode === "create"
                      ? "Új Felhasználó Felvétele"
                      : "Felhasználó Moduljainak, Cégeinek és Szerepköreinek Szerkesztése"}
                  </h3>
                  <p className="mgmt-modal-sub">
                    Állítsd be, hogy a felhasználó mely modulokat (eaisyDocs / eaisyHR) lássa, mely cégekhez tartozzon, és cégenként milyen szerepköre legyen.
                  </p>
                </div>
                <button
                  type="button"
                  className="mgmt-modal-close-btn"
                  onClick={() => !userModalSaving && setUserModalMode(null)}
                >
                  ✕
                </button>
              </div>

              <div className="mgmt-modal-body">
                {userModalError && <div className="mgmt-modal-error">{userModalError}</div>}

                {/* Alapadatok */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="mgmt-form-group">
                    <label className="mgmt-form-label">Teljes Név *</label>
                    <input
                      type="text"
                      className="mgmt-form-input"
                      placeholder="pl. Kovács János"
                      value={userFormName}
                      onChange={(e) => setUserFormName(e.target.value)}
                      required
                      disabled={userModalSaving}
                    />
                  </div>
                  <div className="mgmt-form-group">
                    <label className="mgmt-form-label">E-mail Cím *</label>
                    <input
                      type="email"
                      className="mgmt-form-input"
                      placeholder="pl. kovacs.janos@ceg.hu"
                      value={userFormEmail}
                      onChange={(e) => setUserFormEmail(e.target.value)}
                      required
                      disabled={userModalSaving}
                    />
                  </div>
                </div>

                <div className="mgmt-form-group">
                  <label className="mgmt-form-label">
                    {userModalMode === "create" ? "Kezdő Jelszó * (min. 6 karakter)" : "Új Jelszó (hagyd üresen, ha nem változik)"}
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    className="mgmt-form-input"
                    placeholder={userModalMode === "create" ? "Min. 6 karakter..." : "Csak jelszócsere esetén töltsd ki..."}
                    value={userFormPassword}
                    onChange={(e) => setUserFormPassword(e.target.value)}
                    required={userModalMode === "create"}
                    disabled={userModalSaving}
                  />
                </div>

                {/* 1. Modulok kiválasztása (eaisyDocs / eaisyHR) */}
                <div className="mgmt-form-group">
                  <label className="mgmt-form-label">Elérhető Modulok (Mit lásson a felhasználó?)</label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "4px" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        borderRadius: "6px",
                        border: userFormModules.includes("docs")
                          ? "1px solid #14b8ad"
                          : "1px solid rgba(148,163,184,0.3)",
                        background: userFormModules.includes("docs") ? "rgba(20, 184, 173, 0.08)" : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={userFormModules.includes("docs")}
                        onChange={() => toggleUserModule("docs")}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "13px" }}>eaisyDocs modul</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>Elektronikus irat- és ügyiratkezelő</div>
                      </div>
                    </label>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        borderRadius: "6px",
                        border: userFormModules.includes("hr")
                          ? "1px solid #6366f1"
                          : "1px solid rgba(148,163,184,0.3)",
                        background: userFormModules.includes("hr") ? "rgba(99, 102, 241, 0.08)" : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={userFormModules.includes("hr")}
                        onChange={() => toggleUserModule("hr")}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "13px" }}>eaisyHR modul</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>Humánügyviteli és HR rendszer</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 2. Hozzárendelt Cégek és Cégenkénti Szerepkörök */}
                <div className="mgmt-form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <label className="mgmt-form-label" style={{ margin: 0 }}>
                      Hozzárendelt Cégek és Cégenkénti Szerepkörök ({Object.keys(userFormMemberships).length} cég kiválasztva)
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="mgmt-btn"
                        style={{
                          padding: "4px 10px",
                          fontSize: "11.5px",
                          color: "#0d9488",
                          borderColor: "rgba(20, 184, 173, 0.45)",
                          background: "rgba(20, 184, 173, 0.08)",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                        onClick={handleOpenEaisyBillImportModal}
                      >
                        + Cég importálása eaisyBillből
                      </button>
                      <input
                        type="text"
                        className="mgmt-form-input"
                        style={{ width: "180px", padding: "4px 8px", fontSize: "12px" }}
                        placeholder="Cég keresése..."
                        value={userCompanySearch}
                        onChange={(e) => setUserCompanySearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                    {companies
                      .filter(
                        (c) =>
                          !userCompanySearch.trim() ||
                          c.name.toLowerCase().includes(userCompanySearch.trim().toLowerCase()) ||
                          c.filing_prefix.toLowerCase().includes(userCompanySearch.trim().toLowerCase())
                      )
                      .map((c) => {
                        const membership = userFormMemberships[c.id]
                        const isSelected = Boolean(membership)
                        return (
                          <div
                            key={c.id}
                            className={`mgmt-company-assign-row ${isSelected ? "selected" : ""}`}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                  fontSize: "13px",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleUserCompanyMembership(c.id)}
                                />
                                <span>{c.name}</span>
                                <code>{c.filing_prefix}</code>
                              </label>
                              <div style={{ display: "flex", gap: "4px" }}>
                                {c.elerheto_modulok.includes("docs") && (
                                  <span className="mgmt-module-badge docs" style={{ fontSize: "10px" }}>
                                    eaisyDocs
                                  </span>
                                )}
                                {c.elerheto_modulok.includes("hr") && (
                                  <span className="mgmt-module-badge hr" style={{ fontSize: "10px" }}>
                                    eaisyHR
                                  </span>
                                )}
                              </div>
                            </div>

                            {isSelected && membership && (
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    userFormModules.includes("docs") && userFormModules.includes("hr")
                                      ? "1fr 1.3fr 1.3fr"
                                      : "1fr 1.6fr",
                                  gap: "10px",
                                  paddingTop: "8px",
                                  borderTop: "1px dashed rgba(148,163,184,0.3)",
                                }}
                              >
                                <div>
                                  <label className="mgmt-form-label" style={{ fontSize: "11px" }}>
                                    Céges Jogállás
                                  </label>
                                  <select
                                    className="mgmt-form-select"
                                    style={{ padding: "6px 8px", fontSize: "12px", marginTop: "3px" }}
                                    value={membership.role}
                                    onChange={(e) =>
                                      updateUserCompanyMembershipField(c.id, "role", e.target.value)
                                    }
                                  >
                                    <option value="member">Tag (member)</option>
                                    <option value="admin">Cég Admin (admin)</option>
                                    <option value="owner">Tulajdonos (owner)</option>
                                  </select>
                                </div>

                                {userFormModules.includes("docs") && (
                                  <div>
                                    <label className="mgmt-form-label" style={{ fontSize: "11px", color: "#0d9488" }}>
                                      eaisyDocs Szerepkör ({c.name})
                                    </label>
                                    <select
                                      className="mgmt-form-select"
                                      style={{ padding: "6px 8px", fontSize: "12px", marginTop: "3px" }}
                                      value={membership.docs_szerepkor || "munkavallalo"}
                                      onChange={(e) =>
                                        updateUserCompanyMembershipField(c.id, "docs_szerepkor", e.target.value)
                                      }
                                    >
                                      {DOCS_ROLES.map((r) => (
                                        <option key={r.value} value={r.value}>
                                          {r.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {userFormModules.includes("hr") && (
                                  <div>
                                    <label className="mgmt-form-label" style={{ fontSize: "11px", color: "#4f46e5" }}>
                                      eaisyHR Szerepkör ({c.name})
                                    </label>
                                    <select
                                      className="mgmt-form-select"
                                      style={{ padding: "6px 8px", fontSize: "12px", marginTop: "3px" }}
                                      value={membership.hr_szerepkor || "munkavallalo"}
                                      onChange={(e) =>
                                        updateUserCompanyMembershipField(c.id, "hr_szerepkor", e.target.value)
                                      }
                                    >
                                      {HR_ROLES.map((r) => (
                                        <option key={r.value} value={r.value}>
                                          {r.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>

              <div className="mgmt-modal-footer">
                <button
                  type="button"
                  className="mgmt-btn"
                  onClick={() => setUserModalMode(null)}
                  disabled={userModalSaving}
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="mgmt-btn mgmt-btn-primary"
                  disabled={userModalSaving}
                >
                  {userModalSaving
                    ? "Mentés folyamatban..."
                    : userModalMode === "create"
                    ? "Felhasználó Létrehozása"
                    : "Módosítások Mentése"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODAL 2: ÚJ CÉG LÉTREHOZÁSA / CÉG MODULJAINAK SZERKESZTÉSE
          ═══════════════════════════════════════════════════════════════════════════ */}
      {companyModalMode && (
        <div className="mgmt-modal-backdrop" onClick={() => !compModalSaving && setCompanyModalMode(null)}>
          <div className="mgmt-modal-card" style={{ maxWidth: "540px" }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveCompanyModal}>
              <div className="mgmt-modal-header">
                <div>
                  <h3 className="mgmt-modal-title">
                    {companyModalMode === "create"
                      ? "Új Cég (Tenant) Regisztrációja"
                      : "Cég Moduljainak és Adatainak Szerkesztése"}
                  </h3>
                  <p className="mgmt-modal-sub">
                    Állítsd be, hogy a cég az eaisyDocs, az eaisyHR vagy mindkét modulban regisztrálva van-e.
                  </p>
                </div>
                <button
                  type="button"
                  className="mgmt-modal-close-btn"
                  onClick={() => !compModalSaving && setCompanyModalMode(null)}
                >
                  ✕
                </button>
              </div>

              <div className="mgmt-modal-body">
                {compModalError && <div className="mgmt-modal-error">{compModalError}</div>}

                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "12px" }}>
                  <div className="mgmt-form-group">
                    <label className="mgmt-form-label">Cég Neve *</label>
                    <input
                      type="text"
                      className="mgmt-form-input"
                      placeholder="pl. Mauroni Marco Romano"
                      value={compFormName}
                      onChange={(e) => setCompFormName(e.target.value)}
                      required
                      disabled={compModalSaving}
                    />
                  </div>
                  <div className="mgmt-form-group">
                    <label className="mgmt-form-label">Iktatási Prefix / Slug *</label>
                    <input
                      type="text"
                      className="mgmt-form-input"
                      placeholder="pl. MMR"
                      value={compFormPrefix}
                      onChange={(e) => setCompFormPrefix(e.target.value.toUpperCase())}
                      required
                      disabled={compModalSaving}
                    />
                  </div>
                </div>

                <div className="mgmt-form-group">
                  <label className="mgmt-form-label">Adószám</label>
                  <input
                    type="text"
                    className="mgmt-form-input"
                    placeholder="pl. 12345678-2-42"
                    value={compFormTax}
                    onChange={(e) => setCompFormTax(e.target.value)}
                    disabled={compModalSaving}
                  />
                </div>

                <div className="mgmt-form-group">
                  <label className="mgmt-form-label">Regisztrált Modulok a Céghez *</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        borderRadius: "6px",
                        border: compFormModules.includes("docs")
                          ? "1px solid #14b8ad"
                          : "1px solid rgba(148,163,184,0.3)",
                        background: compFormModules.includes("docs") ? "rgba(20, 184, 173, 0.08)" : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={compFormModules.includes("docs")}
                        onChange={() => toggleCompanyModule("docs")}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "13px" }}>eaisyDocs</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>Iratkezelő rendszer</div>
                      </div>
                    </label>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        borderRadius: "6px",
                        border: compFormModules.includes("hr")
                          ? "1px solid #6366f1"
                          : "1px solid rgba(148,163,184,0.3)",
                        background: compFormModules.includes("hr") ? "rgba(99, 102, 241, 0.08)" : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={compFormModules.includes("hr")}
                        onChange={() => toggleCompanyModule("hr")}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "13px" }}>eaisyHR</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>HR rendszer</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mgmt-modal-footer">
                <button
                  type="button"
                  className="mgmt-btn"
                  onClick={() => setCompanyModalMode(null)}
                  disabled={compModalSaving}
                >
                  Mégse
                </button>
                <button type="submit" className="mgmt-btn mgmt-btn-primary" disabled={compModalSaving}>
                  {compModalSaving
                    ? "Mentés..."
                    : companyModalMode === "create"
                    ? "Cég Létrehozása"
                    : "Módosítások Mentése"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Cég Törlése Megerősítő Modal ── */}
      {deletingCompany && (
        <div className="mgmt-modal-backdrop" onClick={() => !deleteCompanySaving && setDeletingCompany(null)}>
          <div className="mgmt-modal-card" style={{ maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
            <div className="mgmt-modal-header">
              <h3 className="mgmt-modal-title" style={{ color: "#ef4444" }}>
                Cég Végleges Törlése
              </h3>
              <button
                type="button"
                className="mgmt-modal-close-btn"
                onClick={() => !deleteCompanySaving && setDeletingCompany(null)}
              >
                ✕
              </button>
            </div>
            <div className="mgmt-modal-body">
              <p style={{ fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
                Biztosan véglegesen törölni szeretnéd a(z) <strong>{deletingCompany.name}</strong> (
                <code>{deletingCompany.filing_prefix}</code>) céget?
              </p>
            </div>
            <div className="mgmt-modal-footer">
              <button
                type="button"
                className="mgmt-btn"
                onClick={() => setDeletingCompany(null)}
                disabled={deleteCompanySaving}
              >
                Mégse
              </button>
              <button
                type="button"
                className="mgmt-btn mgmt-btn-danger"
                onClick={handleConfirmDeleteCompany}
                disabled={deleteCompanySaving}
              >
                {deleteCompanySaving ? "Törlés..." : "Végleges Törlés"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Felhasználó Törlése Megerősítő Modal ── */}
      {deletingUser && (
        <div className="mgmt-modal-backdrop" onClick={() => !deleteUserSaving && setDeletingUser(null)}>
          <div className="mgmt-modal-card" style={{ maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
            <div className="mgmt-modal-header">
              <h3 className="mgmt-modal-title" style={{ color: "#ef4444" }}>
                Felhasználó Végleges Törlése
              </h3>
              <button
                type="button"
                className="mgmt-modal-close-btn"
                onClick={() => !deleteUserSaving && setDeletingUser(null)}
              >
                ✕
              </button>
            </div>
            <div className="mgmt-modal-body">
              <p style={{ fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
                Biztosan véglegesen törölni szeretnéd <strong>{deletingUser.nev}</strong> ({deletingUser.email}) felhasználót és minden cégtagságát?
              </p>
            </div>
            <div className="mgmt-modal-footer">
              <button
                type="button"
                className="mgmt-btn"
                onClick={() => setDeletingUser(null)}
                disabled={deleteUserSaving}
              >
                Mégse
              </button>
              <button
                type="button"
                className="mgmt-btn mgmt-btn-danger"
                onClick={handleConfirmDeleteUser}
                disabled={deleteUserSaving}
              >
                {deleteUserSaving ? "Törlés..." : "Felhasználó Törlése"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODAL 3: CÉG IMPORTÁLÁSA EAISYBILLBŐL (EGYÉNI VAGY TÖMEGES IMPORTÁLÁS)
          ═══════════════════════════════════════════════════════════════════════════ */}
      {eaisyBillModalOpen && (
        <div
          className="mgmt-modal-backdrop"
          style={{ zIndex: 1100 }}
          onClick={() => !importingBillCompanyId && !bulkImportingEaisyBill && setEaisyBillModalOpen(false)}
        >
          <div className="mgmt-modal-card" style={{ maxWidth: "700px" }} onClick={(e) => e.stopPropagation()}>
            <div className="mgmt-modal-header">
              <div>
                <h3 className="mgmt-modal-title">Cég Importálása eaisyBillből</h3>
                <p className="mgmt-modal-sub">
                  Jelöld ki a kívánt cégeket (akár egyszerre többet is), állítsd be a regisztrált modulokat (eaisyDocs / eaisyHR), és importáld őket tömegesen vagy egyesével.
                </p>
              </div>
              <button
                type="button"
                className="mgmt-modal-close-btn"
                onClick={() => !importingBillCompanyId && !bulkImportingEaisyBill && setEaisyBillModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="mgmt-modal-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {eaisyBillError && <div className="mgmt-modal-error">{eaisyBillError}</div>}

              {/* Modul választó az importálandó cégekhez */}
              <div className="mgmt-form-group" style={{ margin: 0 }}>
                <label className="mgmt-form-label">
                  Mely modulokban legyenek regisztrálva az importált cégek?
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "4px" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "9px 12px",
                      borderRadius: "6px",
                      border: eaisyBillModules.includes("docs")
                        ? "1px solid #14b8ad"
                        : "1px solid rgba(148,163,184,0.3)",
                      background: eaisyBillModules.includes("docs") ? "rgba(20, 184, 173, 0.08)" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={eaisyBillModules.includes("docs")}
                      onChange={() => toggleEaisyBillModule("docs")}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "12.5px" }}>eaisyDocs</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Iratkezelő rendszer</div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "9px 12px",
                      borderRadius: "6px",
                      border: eaisyBillModules.includes("hr")
                        ? "1px solid #6366f1"
                        : "1px solid rgba(148,163,184,0.3)",
                      background: eaisyBillModules.includes("hr") ? "rgba(99, 102, 241, 0.08)" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={eaisyBillModules.includes("hr")}
                      onChange={() => toggleEaisyBillModule("hr")}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "12.5px" }}>eaisyHR</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>HR rendszer</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Keresőmező + Tömeges kijelölő sáv */}
              {(() => {
                const q = eaisyBillSearch.trim().toLowerCase()
                const filteredBill = eaisyBillCompanies.filter(
                  (bc) =>
                    !q ||
                    bc.name.toLowerCase().includes(q) ||
                    (bc.tax_number && bc.tax_number.toLowerCase().includes(q)) ||
                    (bc.address && bc.address.toLowerCase().includes(q))
                )
                const unimportedFiltered = filteredBill.filter((bc) => !bc.isImported)

                return (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <input
                        type="text"
                        className="mgmt-form-input"
                        placeholder="Keresés az eaisyBill cégek között név vagy adószám alapján..."
                        value={eaisyBillSearch}
                        onChange={(e) => setEaisyBillSearch(e.target.value)}
                        autoFocus
                      />

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "8px",
                          fontSize: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: 600, color: selectedEaisyBillIds.size > 0 ? "#0d9488" : "#64748b" }}>
                            {selectedEaisyBillIds.size} cég kijelölve
                          </span>
                          <span style={{ color: "#94a3b8" }}>•</span>
                          <span style={{ color: "#64748b" }}>
                            {unimportedFiltered.length} még nem importált / összesen {filteredBill.length} találat
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {unimportedFiltered.length > 0 && (
                            <button
                              type="button"
                              className="mgmt-btn"
                              style={{ padding: "3px 9px", fontSize: "11.5px" }}
                              onClick={() => {
                                setSelectedEaisyBillIds((prev) => {
                                  const next = new Set(prev)
                                  for (const item of unimportedFiltered) {
                                    next.add(item.id)
                                  }
                                  return next
                                })
                              }}
                            >
                              Még nem importáltak kijelölése ({unimportedFiltered.length})
                            </button>
                          )}
                          {selectedEaisyBillIds.size > 0 && (
                            <button
                              type="button"
                              className="mgmt-btn"
                              style={{ padding: "3px 9px", fontSize: "11.5px" }}
                              onClick={() => setSelectedEaisyBillIds(new Set())}
                            >
                              Kijelölés törlése
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cégek listája */}
                    <div
                      style={{
                        maxHeight: "340px",
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        paddingRight: "2px",
                      }}
                    >
                      {eaisyBillLoading ? (
                        <div style={{ textAlign: "center", padding: "32px 16px", color: "#64748b", fontSize: "13px" }}>
                          eaisyBill cégek betöltése...
                        </div>
                      ) : filteredBill.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "32px 16px", color: "#64748b", fontSize: "13px" }}>
                          Nem található eaisyBill cég a megadott keresési feltétellel.
                        </div>
                      ) : (
                        filteredBill.map((bc) => {
                          const isImportingThis = importingBillCompanyId === bc.id
                          const isChecked = selectedEaisyBillIds.has(bc.id)
                          const alreadySelectedInUserModal = Boolean(
                            userModalMode && bc.localCompanyId && userFormMemberships[bc.localCompanyId]
                          )

                          return (
                            <div
                              key={bc.id}
                              className={`mgmt-company-assign-row ${isChecked ? "selected" : ""}`}
                              onClick={() => toggleSelectEaisyBillCompany(bc.id)}
                              style={{
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                textAlign: "left",
                                gap: "12px",
                                padding: "10px 14px",
                                cursor: "pointer",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", minWidth: 0, flex: 1 }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSelectEaisyBillCompany(bc.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ marginTop: "3px", flexShrink: 0, cursor: "pointer" }}
                                />
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                    <span style={{ fontWeight: 600, fontSize: "13px" }}>{bc.name}</span>
                                    {bc.isImported && (
                                      <span
                                        style={{
                                          fontSize: "10.5px",
                                          fontWeight: 600,
                                          padding: "2px 7px",
                                          borderRadius: "999px",
                                          background: "rgba(22, 163, 74, 0.12)",
                                          color: "#16a34a",
                                          border: "1px solid rgba(22, 163, 74, 0.28)",
                                        }}
                                      >
                                        Már importálva
                                      </span>
                                    )}
                                    {bc.elerheto_modulok?.includes("docs") && (
                                      <span className="mgmt-module-badge docs" style={{ fontSize: "10px" }}>
                                        eaisyDocs
                                      </span>
                                    )}
                                    {bc.elerheto_modulok?.includes("hr") && (
                                      <span className="mgmt-module-badge hr" style={{ fontSize: "10px" }}>
                                        eaisyHR
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                                    {bc.tax_number ? `Adószám: ${bc.tax_number}` : "Adószám nincs megadva"}
                                    {bc.address ? ` • ${bc.address}` : ""}
                                  </div>
                                </div>
                              </div>

                              <div
                                style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {bc.isImported ? (
                                  userModalMode && bc.localCompanyId ? (
                                    alreadySelectedInUserModal ? (
                                      <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#0d9488" }}>
                                        Hozzárendelve
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        className="mgmt-btn"
                                        style={{
                                          padding: "5px 10px",
                                          fontSize: "11.5px",
                                          color: "#0d9488",
                                          borderColor: "rgba(20, 184, 173, 0.4)",
                                        }}
                                        onClick={() => {
                                          if (!bc.localCompanyId) return
                                          setUserFormMemberships((prev) => ({
                                            ...prev,
                                            [bc.localCompanyId!]: {
                                              company_id: bc.localCompanyId!,
                                              role: "member",
                                              docs_szerepkor: "munkavallalo",
                                              hr_szerepkor: "munkavallalo",
                                            },
                                          }))
                                          showToastMsg(`A(z) "${bc.name}" cég kiválasztva a felhasználóhoz!`)
                                        }}
                                      >
                                        Kiválasztás
                                      </button>
                                    )
                                  ) : (
                                    <button
                                      type="button"
                                      className="mgmt-btn"
                                      style={{ padding: "5px 10px", fontSize: "11.5px" }}
                                      disabled={Boolean(importingBillCompanyId) || bulkImportingEaisyBill}
                                      onClick={() => handleImportEaisyBillCompany(bc)}
                                      title="Kiválasztott modulok hozzáadása a már importált céghez"
                                    >
                                      {isImportingThis ? "Frissítés..." : "Modulok frissítése"}
                                    </button>
                                  )
                                ) : (
                                  <button
                                    type="button"
                                    className="mgmt-btn"
                                    style={{
                                      padding: "5px 10px",
                                      fontSize: "11.5px",
                                      color: "#0d9488",
                                      borderColor: "rgba(20, 184, 173, 0.4)",
                                      whiteSpace: "nowrap",
                                    }}
                                    disabled={Boolean(importingBillCompanyId) || bulkImportingEaisyBill}
                                    onClick={() => handleImportEaisyBillCompany(bc)}
                                  >
                                    {isImportingThis ? "Importálás..." : "Importálás"}
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </>
                )
              })()}
            </div>

            <div className="mgmt-modal-footer">
              <button
                type="button"
                className="mgmt-btn"
                onClick={() => setEaisyBillModalOpen(false)}
                disabled={Boolean(importingBillCompanyId) || bulkImportingEaisyBill}
              >
                Bezárás
              </button>
              <button
                type="button"
                className="mgmt-btn mgmt-btn-primary"
                disabled={selectedEaisyBillIds.size === 0 || Boolean(importingBillCompanyId) || bulkImportingEaisyBill}
                onClick={handleBulkImportEaisyBillCompanies}
              >
                {bulkImportingEaisyBill
                  ? `Importálás folyamatban (${selectedEaisyBillIds.size} db)...`
                  : userModalMode
                  ? `Kijelölt cégek importálása és hozzárendelése (${selectedEaisyBillIds.size} db)`
                  : `Kijelölt cégek importálása (${selectedEaisyBillIds.size} db)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 1300,
            background: "var(--mgmt-surface)",
            border: "1px solid rgba(20, 184, 173, 0.55)",
            borderRadius: "8px",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "12.5px",
            fontWeight: 600,
            color: "#0d9488",
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "999px",
              backgroundColor: "#14b8ad",
              flexShrink: 0,
            }}
          />
          <span>{actionMessage}</span>
        </div>
      )}
    </div>
  )
}
