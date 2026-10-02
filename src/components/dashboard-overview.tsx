"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import {
  Inbox, AlertTriangle, FolderOpen, Archive,
  ArrowRight, ArrowUpRight, Clock, Building2,
  Calendar, FileCheck2,
  Users, TrendingUp, ChevronRight, Zap, FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { KpiCard } from "@/components/kpi-card"
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  BarChart, Bar, LabelList,
} from "recharts"

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardIratItem {
  id: string
  erkezes_datuma: string | null
  erkeztetoszam: string | null
  targy: string
  irany: string
  erkezes_modja: string
  minosites: string
  ugyirat_id: string | null
  created_at: string
  partner_nev: string
  bizonylat_tipus?: string | null
}

export interface DashboardUgyiratItem {
  id: string
  iktatoszam: string
  statusz: string
  iktatas_datuma: string | null
  megorzesi_ido_vege: string | null
  dept_id: string | null
  dept_name: string
  ugy_targy: string
  hatarido: string | null
  felelos_user_id: string | null
  bizonylat_tipus_nev: string | null
}

export interface DashboardTaskItem {
  id: string
  leiras: string
  hatarido: string | null
  allapot: string
  felelos_user_id: string
  ugyirat_id: string | null
  iktatoszam: string | null
}

export interface DashboardDepartmentItem {
  id: string
  nev: string
}

interface DashboardOverviewProps {
  currentUserId: string
  currentUserRole: string
  allIratok: DashboardIratItem[]
  allUgyiratok: DashboardUgyiratItem[]
  allTasks: DashboardTaskItem[]
  allDepts: DashboardDepartmentItem[]
  batchesCount: number
  disposalStats: {
    pending: number
    expired: number
    scrapped: number
  }
}

// ─── Color palette ──────────────────────────────────────────────────────────────

const BRAND = "#0D9488"
const COLORS = {
  teal:    "#0D9488",
  blue:    "#3B82F6",
  violet:  "#8B5CF6",
  amber:   "#F59E0B",
  emerald: "#10B981",
  rose:    "#F43F5E",
  slate:   "#64748B",
}

const CHANNEL_LABELS: Record<string, string> = {
  email: "E-mail", szkenner: "Szkenner", szemelyes: "Személyes",
  posta: "Posta", rendszer: "Manuális érkeztetés", cegkapu: "Cégkapu",
  eaisybill: "eaisyBill", egyeb: "Egyéb",
}
const CHANNEL_COLORS = [
  COLORS.teal, COLORS.blue, COLORS.amber,
  COLORS.violet, COLORS.emerald, COLORS.rose, COLORS.slate,
]

const TYPE_COLORS = [
  "#0D9488", // Teal
  "#3B82F6", // Blue
  "#8B5CF6", // Violet
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#EC4899", // Rose
  "#64748B", // Slate
]

function inferBizonylatTipus(targy: string, officialName?: string | null): string {
  const combined = `${officialName || ""} ${targy || ""}`.toLowerCase()
  if (
    combined.includes("számla") ||
    combined.includes("szla") ||
    combined.includes("számvitel") ||
    combined.includes("pénzügy") ||
    combined.includes("díjbekérő") ||
    combined.includes("előleg") ||
    combined.includes("invoice")
  ) {
    return "Számla / Bizonylat"
  }
  if (
    combined.includes("szerződés") ||
    combined.includes("megállapodás") ||
    combined.includes("bérlet") ||
    combined.includes("szerzodes") ||
    combined.includes("jogi")
  ) {
    return "Szerződés"
  }
  if (
    combined.includes("hatósági") ||
    combined.includes("végzés") ||
    combined.includes("nav") ||
    combined.includes("bíróság") ||
    combined.includes("kormányhivatal")
  ) {
    return "Hatósági levél / Végzés"
  }
  if (
    combined.includes("hr") ||
    combined.includes("munkaügy") ||
    combined.includes("munkavállaló") ||
    combined.includes("bérlap") ||
    combined.includes("orvosi") ||
    combined.includes("szabadság")
  ) {
    return "HR / Munkaügyi irat"
  }
  if (
    combined.includes("jegyzőkönyv") ||
    combined.includes("határozat") ||
    combined.includes("igazolás") ||
    combined.includes("teljesítés")
  ) {
    return "Igazolás / Tanúsítvány"
  }
  if (
    combined.includes("ajánlat") ||
    combined.includes("megrendelés") ||
    combined.includes("szállítólevél") ||
    combined.includes("cmr")
  ) {
    return "Kereskedelmi irat"
  }
  if (
    combined.includes("adminisztráció") ||
    combined.includes("levelezés") ||
    combined.includes("levél")
  ) {
    return "Hivatalos levél"
  }
  return "Egyéb irat"
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  return Math.ceil(
    (new Date(iso).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000
  )
}



function SectionHeader({
  title, sub, action,
}: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/80 bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="tabular-nums">
          {p.value} db
        </p>
      ))}
    </div>
  )
}

function BizonylatChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  return (
    <div className="rounded-lg border border-border/80 bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground mt-0.5">
        Darabszám: <span className="font-semibold text-primary tabular-nums">{data?.count} db</span> ({data?.pct}%)
      </p>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────────

export function DashboardOverview({
  currentUserId,
  currentUserRole,
  allIratok,
  allUgyiratok,
  allTasks,
  allDepts,
  batchesCount,
  disposalStats,
}: DashboardOverviewProps) {
  const [mounted, setMounted] = useState(false)
  const [period, setPeriod] = useState<"all" | "today" | "7days" | "30days" | "year">("all")
  useEffect(() => { setMounted(true) }, [])

  // Period filter
  const filteredIratok = useMemo(() => {
    const now = new Date()
    let start: Date | null = null
    if (period === "today")  start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (period === "7days")  start = new Date(now.getTime() - 7 * 86400000)
    if (period === "30days") start = new Date(now.getFullYear(), now.getMonth(), 1)
    if (period === "year")   start = new Date(now.getFullYear(), 0, 1)
    return start ? allIratok.filter(i => new Date(i.created_at) >= start!) : allIratok
  }, [period, allIratok])

  // KPI values
  const todayDate = new Date(); todayDate.setHours(0,0,0,0)
  const in3 = new Date(todayDate); in3.setDate(todayDate.getDate() + 3)

  const inboxCount     = filteredIratok.filter(i => i.ugyirat_id === null).length
  const incomingTotal  = filteredIratok.filter(i => i.irany === "bejovo").length
  const activeDossiers = allUgyiratok.filter(u =>
    !["lezart","irattarban","selejtezheto","selejtezett"].includes(u.statusz))
  const urgentDossiers = activeDossiers.filter(u => {
    if (!u.hatarido) return false
    const d = new Date(u.hatarido); d.setHours(0,0,0,0); return d <= in3
  })
  const overdueCount   = urgentDossiers.filter(u => {
    const d = new Date(u.hatarido!); d.setHours(0,0,0,0); return d < todayDate
  }).length
  const archivedCount  = allUgyiratok.filter(u => ["irattarban","lezart"].includes(u.statusz)).length
  const scrapCount     = allUgyiratok.filter(u => ["selejtezheto","selejtezett"].includes(u.statusz)).length

  // Lifecycle
  const lc = useMemo(() => {
    const m = { iktatva:0, szignalt:0, elintezett:0, irattarban:0, selejtezett:0 }
    allUgyiratok.forEach(u => {
      if      (u.statusz === "iktatva") m.iktatva++
      else if (u.statusz === "szignalt" || u.statusz === "ugyintezes_alatt") m.szignalt++
      else if (u.statusz === "elintezett" || u.statusz === "lezart") m.elintezett++
      else if (u.statusz === "irattarban") m.irattarban++
      else if (u.statusz === "selejtezheto" || u.statusz === "selejtezett") m.selejtezett++
    })
    return m
  }, [allUgyiratok])
  const lcTotal = allUgyiratok.length || 1

  const lcStages = [
    { key:"iktatva",     label:"Iktatva",    count:lc.iktatva,     color:COLORS.blue },
    { key:"szignalt",    label:"Szignálva",  count:lc.szignalt,    color:COLORS.violet },
    { key:"elintezett",  label:"Elintézett", count:lc.elintezett,  color:COLORS.emerald },
    { key:"irattarban",  label:"Irattárban", count:lc.irattarban,  color:COLORS.teal },
    { key:"selejtezett", label:"Selejtezve", count:lc.selejtezett, color:COLORS.rose },
  ]

  // Channel donut
  const channelData = useMemo(() => {
    const counts: Record<string,number> = {}
    filteredIratok.forEach(i => { const m = i.erkezes_modja||"egyeb"; counts[m]=(counts[m]||0)+1 })
    return Object.entries(counts).map(([key,value],idx) => ({
      name: CHANNEL_LABELS[key]||key, value,
      color: CHANNEL_COLORS[idx % CHANNEL_COLORS.length],
    }))
  }, [filteredIratok])

  // Dynamic trend data based on selected period
  const { trendData, trendTitle, trendSub } = useMemo(() => {
    const now = new Date()

    if (period === "today") {
      const slots = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"]
      const counts: Record<string, number> = {}
      slots.forEach((s) => { counts[s] = 0 })

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      allIratok.forEach((irat) => {
        const d = new Date(irat.created_at)
        if (d >= todayStart) {
          const hour = d.getHours()
          let slot = "08:00"
          if (hour >= 20) slot = "20:00"
          else if (hour >= 18) slot = "18:00"
          else if (hour >= 16) slot = "16:00"
          else if (hour >= 14) slot = "14:00"
          else if (hour >= 12) slot = "12:00"
          else if (hour >= 10) slot = "10:00"
          else slot = "08:00"
          counts[slot]++
        }
      })

      return {
        trendData: slots.map((date) => ({ date, count: counts[date] })),
        trendTitle: "Iratforgalom — Ma",
        trendSub: "Óránként érkeztetett iratok darabszáma a mai napon",
      }
    }

    if (period === "7days") {
      const days: Record<string, number> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        days[d.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })] = 0
      }
      const since = new Date(now)
      since.setDate(since.getDate() - 6)
      since.setHours(0, 0, 0, 0)

      allIratok.forEach((irat) => {
        const d = new Date(irat.created_at)
        if (d >= since) {
          const k = d.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })
          if (k in days) days[k]++
        }
      })

      return {
        trendData: Object.entries(days).map(([date, count]) => ({ date, count })),
        trendTitle: "Iratforgalom — Elmúlt 7 nap",
        trendSub: "Naponta érkeztetett iratok darabszáma az elmúlt 7 napban",
      }
    }

    if (period === "30days") {
      const days: Record<string, number> = {}
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

      for (let day = 1; day <= daysInMonth; day++) {
        const label = `${day}.`
        days[label] = 0
      }

      allIratok.forEach((irat) => {
        const d = new Date(irat.created_at)
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
          const label = `${d.getDate()}.`
          if (label in days) days[label]++
        }
      })

      return {
        trendData: Object.entries(days).map(([date, count]) => ({ date, count })),
        trendTitle: "Iratforgalom — Havi bontás",
        trendSub: `${now.toLocaleDateString("hu-HU", { month: "long" })} napi érkeztetéseinek megoszlása`,
      }
    }

    if (period === "year") {
      const months = ["Jan", "Feb", "Már", "Ápr", "Máj", "Jún", "Júl", "Aug", "Szept", "Okt", "Nov", "Dec"]
      const counts: Record<number, number> = {}
      months.forEach((_, i) => { counts[i] = 0 })

      allIratok.forEach((irat) => {
        const d = new Date(irat.created_at)
        if (d.getFullYear() === now.getFullYear()) {
          counts[d.getMonth()]++
        }
      })

      return {
        trendData: months.map((name, i) => ({ date: name, count: counts[i] })),
        trendTitle: `Iratforgalom — ${now.getFullYear()}. év`,
        trendSub: "Havi bontású iratforgalom ebben a naptári évben",
      }
    }

    // "all"
    const monthsMap: Record<string, number> = {}
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleDateString("hu-HU", { year: "2-digit", month: "short" })
      monthsMap[label] = 0
    }

    allIratok.forEach((irat) => {
      const d = new Date(irat.created_at)
      const label = d.toLocaleDateString("hu-HU", { year: "2-digit", month: "short" })
      if (label in monthsMap) monthsMap[label]++
    })

    return {
      trendData: Object.entries(monthsMap).map(([date, count]) => ({ date, count })),
      trendTitle: "Iratforgalom — Teljes időszak",
      trendSub: "Összesített havi iratforgalom trend az elmúlt 12 hónapban",
    }
  }, [period, allIratok])

  // Bizonylattípus-megoszlás a kiválasztott időszakban
  const bizonylatData = useMemo(() => {
    const counts: Record<string, number> = {}

    filteredIratok.forEach((irat) => {
      const type = inferBizonylatTipus(irat.targy, irat.bizonylat_tipus)
      counts[type] = (counts[type] || 0) + 1
    })

    if (Object.keys(counts).length === 0 && allUgyiratok.length > 0) {
      allUgyiratok.forEach((u) => {
        const type = u.bizonylat_tipus_nev || "Általános irat"
        counts[type] = (counts[type] || 0) + 1
      })
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
  }, [filteredIratok, allUgyiratok])

  // Top Partnerek a kiválasztott időszakban
  const topPartnersData = useMemo(() => {
    const counts: Record<string, { count: number; incoming: number; outgoing: number }> = {}

    filteredIratok.forEach((irat) => {
      const name = irat.partner_nev && irat.partner_nev !== "Ismeretlen küldő"
        ? irat.partner_nev
        : null
      if (name) {
        if (!counts[name]) counts[name] = { count: 0, incoming: 0, outgoing: 0 }
        counts[name].count++
        if (irat.irany === "bejovo") counts[name].incoming++
        else counts[name].outgoing++
      }
    })

    const total = Object.values(counts).reduce((a, b) => a + b.count, 0) || 1

    return Object.entries(counts)
      .map(([name, data]) => ({
        name,
        count: data.count,
        incoming: data.incoming,
        outgoing: data.outgoing,
        pct: Math.round((data.count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [filteredIratok])

  // My items
  const isPrivileged = ["admin","rendszergazda","iktato","vezeto"].includes(currentUserRole)
  const myDossiers = allUgyiratok.filter(u => isPrivileged||u.felelos_user_id===currentUserId).slice(0,6)
  const myTasks    = allTasks.filter(t => (isPrivileged||t.felelos_user_id===currentUserId) && t.allapot !== "kesz" && t.allapot !== "elutasitott").slice(0,6)

  const PERIOD_TABS = [
    { key:"all",    label:"Összes" },
    { key:"today",  label:"Ma" },
    { key:"7days",  label:"7 nap" },
    { key:"30days", label:"Hónap" },
    { key:"year",   label:"Év" },
  ] as const

  return (
    <div className="space-y-8">

      {/* ── Period filter */}
      <div className="flex items-center">
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-border/60 bg-muted/40 p-1">
          {PERIOD_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setPeriod(t.key as typeof period)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150",
                period === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Bejövő iratok"
          value={incomingTotal || filteredIratok.length}
          sub={`${inboxCount} iktatásra vár`}
          href="/inbox"
        />
        <KpiCard
          label="Kritikus határidők"
          value={urgentDossiers.length}
          sub={overdueCount > 0 ? `${overdueCount} lejárt határidő!` : "3 napon belüli"}
          highlight={urgentDossiers.length > 0}
          href="/dossiers"
        />
        <KpiCard
          label="Aktív ügyiratok"
          value={activeDossiers.length}
          sub={`${allUgyiratok.length} ügyirat összesen`}
          href="/dossiers"
        />
        <KpiCard
          label="Irattár & Selejtezés"
          value={archivedCount + scrapCount}
          sub={`${scrapCount} selejtezésre vár`}
          href="/archive"
        />
      </div>

      {/* ── Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Area chart — Dynamic period trend */}
        <div className="lg:col-span-2 rounded-xl border border-border/60 bg-card p-5">
          <SectionHeader
            title={trendTitle}
            sub={trendSub}
            action={
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />Trend
              </span>
            }
          />
          <div className="mt-5 h-[180px]">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                  <defs>
                    <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BRAND} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize:10, fill:"#888" }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize:10, fill:"#888" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone" dataKey="count"
                    stroke={BRAND} strokeWidth={2}
                    fill="url(#tealGrad)"
                    dot={false}
                    activeDot={{ r:4, fill:BRAND, strokeWidth:0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-lg bg-muted/30 animate-pulse" />
            )}
          </div>
        </div>

        {/* Donut — channels */}
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <SectionHeader
            title="Érkezési csatornák"
            sub={`${filteredIratok.length} irat ebben az időszakban`}
          />
          <div className="mt-4">
            {mounted && channelData.length > 0 ? (
              <>
                <div className="flex justify-center">
                  <div className="h-[140px] w-[140px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={channelData} dataKey="value"
                          cx="50%" cy="50%"
                          innerRadius={42} outerRadius={64}
                          paddingAngle={3} strokeWidth={0}
                        >
                          {channelData.map((e,i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip
                          formatter={(v: any) => [`${v} db`]}
                          contentStyle={{
                            background:"hsl(var(--popover))",
                            border:"1px solid hsl(var(--border))",
                            borderRadius:8, fontSize:11,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {channelData.map((item,i) => {
                    const pct = Math.round((item.value / filteredIratok.length) * 100)
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background:item.color }} />
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                        <span className="tabular-nums font-medium text-foreground">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="flex h-48 items-center justify-center">
                <p className="text-sm text-muted-foreground">Nincs adat a kiválasztott időszakban</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 2: Bizonylattípus-megoszlás & Partner szerinti kimutatás */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Dokumentumtípus-megoszlás */}
        <div className="lg:col-span-2 rounded-xl border border-border/60 bg-card p-5 flex flex-col justify-between">
          <div>
            <SectionHeader
              title="Dokumentumtípus-megoszlás"
              sub={`${filteredIratok.length} irat típus szerinti megoszlása`}
              action={
                <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span>{bizonylatData.length} típus</span>
                </span>
              }
            />

            {mounted && bizonylatData.length > 0 ? (
              <div className="mt-5 space-y-5">
                {/* 1. Összesített eloszlási sáv (Stacked Distribution Bar) */}
                <div className="space-y-1.5">
                  <div className="h-2.5 w-full rounded-full bg-muted/40 overflow-hidden flex gap-0.5 p-0.5 border border-border/50">
                    {bizonylatData.map((item, idx) => (
                      <div
                        key={item.name}
                        className="h-full rounded-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                        style={{
                          width: `${Math.max(item.pct, 4)}%`,
                          background: TYPE_COLORS[idx % TYPE_COLORS.length],
                        }}
                        title={`${item.name}: ${item.count} db (${item.pct}%)`}
                      />
                    ))}
                  </div>
                </div>

                {/* 2. Tételes kategórialista progress sávokkal és pontos adatokkal */}
                <div className="space-y-3.5">
                  {bizonylatData.map((item, idx) => {
                    const color = TYPE_COLORS[idx % TYPE_COLORS.length]
                    return (
                      <div key={item.name} className="space-y-1.5 group">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-background"
                              style={{ background: color }}
                            />
                            <span className="font-semibold text-foreground truncate">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-xs shrink-0 ml-3">
                            <span className="font-bold tabular-nums text-foreground">
                              {item.count} db
                            </span>
                            <span className="text-muted-foreground text-[11px] tabular-nums font-normal">
                              ({item.pct}%)
                            </span>
                          </div>
                        </div>

                        {/* Finom progress bar */}
                        <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${item.pct}%`,
                              background: color,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex h-44 items-center justify-center">
                <p className="text-sm text-muted-foreground">Nincs bizonylat adat a kiválasztott időszakban</p>
              </div>
            )}
          </div>

          {/* Lábléc */}
          {bizonylatData.length > 0 && (
            <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Dokumentumok összesített forgalma</span>
              <span className="font-semibold text-foreground tabular-nums">
                Összesen: {filteredIratok.length} db irat
              </span>
            </div>
          )}
        </div>

        {/* Top Partnerek kimutatás */}
        <div className="rounded-xl border border-border/60 bg-card p-5 flex flex-col justify-between">
          <div>
            <SectionHeader
              title="Top Partnerek"
              sub="Leggyakoribb partnerek az időszakban"
              action={
                <Link href="/partners" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  Partnertörzs <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />

            <div className="mt-4">
              {mounted && topPartnersData.length > 0 ? (
                <div className="space-y-3">
                  {topPartnersData.map((p, idx) => {
                    const maxCount = topPartnersData[0]?.count || 1
                    const barWidth = Math.max(12, Math.round((p.count / maxCount) * 100))

                    return (
                      <div key={p.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground truncate max-w-[170px]" title={p.name}>
                            {idx + 1}. {p.name}
                          </span>
                          <span className="tabular-nums font-semibold text-foreground shrink-0 font-mono text-[11px]">
                            {p.count} irat
                          </span>
                        </div>
                        {/* Progress Bar showing relative volume */}
                        <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/80 transition-all duration-300"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{p.incoming} bejövő • {p.outgoing} kimenő</span>
                          <span className="tabular-nums font-mono">{p.pct}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex h-44 items-center justify-center">
                  <p className="text-sm text-muted-foreground">Nincs partner adat az időszakban</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Aktív partnerek forgalma</span>
            <Link href="/partners" className="text-primary hover:underline font-medium">
              Összes megtekintése →
            </Link>
          </div>
        </div>

      </div>


      {/* ── Option A: Lejáró határidők & Saját feladataim */}
      <div className="rounded-xl border border-border/60 bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Lejáró határidők & Saját feladataim</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Sürgős teendők és rád rendelt feladatok</p>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/dossiers" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Határidők →
            </Link>
            <Link href="/tasks" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Feladatok →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:divide-x lg:divide-border/40">

          {/* Bal: Lejáró határidők */}
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Lejáró határidők
            </p>
            {urgentDossiers.length > 0 ? (
              <div className="divide-y divide-border/30">
                {urgentDossiers.slice(0, 6).map(d => {
                  const days = daysUntil(d.hatarido)
                  const overdue = days !== null && days < 0
                  return (
                    <Link
                      key={d.id}
                      href={`/dossiers/${d.id}`}
                      className="flex items-center justify-between gap-4 py-3.5 transition-opacity hover:opacity-60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground leading-snug">
                          {d.ugy_targy || "Nincs tárgy"}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/70">
                          {d.iktatoszam}
                        </p>
                      </div>
                      <span className={cn(
                        "flex-shrink-0 rounded px-2 py-0.5 text-[11px] font-medium tabular-nums",
                        overdue ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                      )}>
                        {days === 0 ? "Ma"
                          : days !== null && days < 0 ? `${Math.abs(days)} napja lejárt`
                          : `${days} nap`}
                      </span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center">
                <p className="text-sm text-muted-foreground">Nincsenek sürgős határidők</p>
              </div>
            )}
          </div>

          {/* Jobb: Saját feladataim */}
          <div className="lg:pl-8">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Saját feladataim
            </p>
            {myTasks.length > 0 ? (
              <div className="divide-y divide-border/30">
                {myTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between gap-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground leading-snug">{task.leiras}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/70">{task.iktatoszam || "—"}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {task.hatarido && (
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {new Date(task.hatarido).toLocaleDateString("hu-HU", { month: "short", day: "numeric" })}
                        </span>
                      )}
                      <span className={cn(
                        "rounded px-2 py-0.5 text-[11px] font-medium",
                        task.allapot === "folyamatban" ? "bg-primary/10 text-primary"
                          : task.allapot === "kesz" ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {task.allapot === "folyamatban" ? "Folyamatban"
                          : task.allapot === "kesz" ? "Kész"
                          : task.allapot === "elutasitott" ? "Elutasítva"
                          : task.allapot}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : myDossiers.length > 0 ? (
              <div className="divide-y divide-border/30">
                {myDossiers.slice(0, 6).map(d => (
                  <Link
                    key={d.id}
                    href={`/dossiers/${d.id}`}
                    className="flex items-center justify-between gap-4 py-3.5 transition-opacity hover:opacity-60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground leading-snug">{d.ugy_targy || "Nincs tárgy"}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/70">{d.iktatoszam}</p>
                    </div>
                    <span className="flex-shrink-0 rounded px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">
                      {d.statusz}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center">
                <p className="text-sm text-muted-foreground">Jelenleg nincs rád szignált feladat</p>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  )
}