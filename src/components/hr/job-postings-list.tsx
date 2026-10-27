"use client"

import { useState, useMemo, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { KpiCard } from "@/components/kpi-card"
import {
  ExternalLink, Edit, Trash2, Briefcase,
  Users, Search, Clock, Plus, MapPin
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { ManagePostingDialog } from "./manage-posting-dialog"
import {
  WORK_MODE_SHORT_LABELS,
  SENIORITY_LABELS,
  formatSalaryBand,
} from "@/utils/hr/career-constants"

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

const FILTERS = [
  { key: "all",     label: "Összes"  },
  { key: "aktiv",   label: "Aktív"   },
  { key: "inaktiv", label: "Inaktív" },
  { key: "publikus",label: "Publikus"},
] as const

type FilterKey = typeof FILTERS[number]["key"]

export interface JobPostingItem {
  id: string
  cim?: string
  munkakor_id?: string
  aktiv?: boolean
  publikus?: boolean
  created_at?: string
  munkavegzes_modja?: string | null
  helyszin?: string | null
  foglalkoztatas_tipusa?: string | null
  tapasztalati_szint?: string | null
  reszleg_nev?: string | null
  bersav_min?: number | null
  bersav_max?: number | null
  bersav_publikus?: boolean
  hr_munkakor?: { megnevezes?: string } | null
  [key: string]: any
}

export interface JobItem {
  id: string
  megnevezes: string
  [key: string]: any
}

export interface CandidateItem {
  id: string
  allashirdetes_id?: string | null
  megpalyazott_munkakor_id?: string | null
  [key: string]: any
}

interface JobPostingsListProps {
  postings?: JobPostingItem[]
  initialPostings?: JobPostingItem[]
  jobs: JobItem[]
  candidates: CandidateItem[]
}

export function JobPostingsList({
  postings: propPostings,
  initialPostings,
  jobs,
  candidates = [],
}: JobPostingsListProps) {
  const [postings, setPostings] = useState<JobPostingItem[]>(initialPostings || propPostings || [])
  const [search, setSearch]     = useState("")
  const [filter, setFilter]     = useState<FilterKey>("all")
  const supabase = createClient()

  useEffect(() => {
    setPostings(initialPostings || propPostings || [])
  }, [initialPostings, propPostings])

  /* ───── Stats ───── */
  const activePublicCount = postings.filter(p => p.aktiv && p.publikus).length

  /* ───── Filter ───── */
  const filtered = useMemo(() => {
    let result = postings
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.cim?.toLowerCase().includes(q) ||
        p.hr_munkakor?.megnevezes?.toLowerCase().includes(q) ||
        p.helyszin?.toLowerCase().includes(q)
      )
    }
    if (filter === "aktiv")    result = result.filter(p => p.aktiv)
    if (filter === "inaktiv")  result = result.filter(p => !p.aktiv)
    if (filter === "publikus") result = result.filter(p => p.publikus && p.aktiv)
    return result
  }, [postings, search, filter])

  /* ───── Helpers ───── */
  function getApplicantCount(posting: JobPostingItem): number {
    return candidates.filter(
      c =>
        c.allashirdetes_id === posting.id ||
        (!c.allashirdetes_id && c.megpalyazott_munkakor_id === posting.munkakor_id)
    ).length
  }

  function addOrUpdate(savedPosting: any) {
    const job = jobs.find(j => j.id === savedPosting.munkakor_id)
    const full: JobPostingItem = {
      ...savedPosting,
      hr_munkakor: savedPosting.hr_munkakor || { megnevezes: job?.megnevezes },
    }
    setPostings(prev => {
      const exists = prev.find(p => p.id === savedPosting.id)
      return exists ? prev.map(p => p.id === savedPosting.id ? full : p) : [full, ...prev]
    })
  }

  async function toggleStatus(id: string, field: "aktiv" | "publikus", current: boolean) {
    const next = !current
    setPostings(prev => prev.map(p => p.id === id ? { ...p, [field]: next } : p))
    const { error } = await supabase.from("hr_allashirdetes").update({ [field]: next }).eq("id", id)
    if (error) {
      toast.error("Hiba a mentés során")
      setPostings(prev => prev.map(p => p.id === id ? { ...p, [field]: current } : p))
    } else {
      toast.success(
        field === "publikus"
          ? next ? "Hirdetés publikálva" : "Hirdetés levéve a karrieroldalról"
          : "Státusz frissítve"
      )
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Biztosan törlöd a hirdetést? Ezt nem lehet visszavonni.")) return
    setPostings(prev => prev.filter(p => p.id !== id))
    const { error } = await supabase.from("hr_allashirdetes").delete().eq("id", id)
    if (error) toast.error("Hiba a törlés során")
    else toast.success("Hirdetés törölve")
  }

  /* ───── Render ───── */
  return (
    <div className="space-y-5">

      {/* Stat kártyák */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Összes Hirdetés"
          value={`${postings.length} db`}
        />
        <KpiCard
          label="Aktív & Publikus"
          value={`${activePublicCount} db`}
          sub="karrieroldalon látható"
        />
        <KpiCard
          label="Összes Jelentkező"
          value={`${candidates.length} fő`}
        />
      </div>

      {/* Keresés + Filter + Új hirdetés */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Keresés hirdetés neve alapján..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1 border border-border rounded-md p-1 bg-muted/40">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <ManagePostingDialog jobs={jobs} onSaved={addOrUpdate}>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Plus className="h-4 w-4" />
              Új hirdetés feladása
            </Button>
          </ManagePostingDialog>
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        /* Üres állapot */
        <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
          <h3 className="text-base font-semibold text-foreground mb-1">
            {search || filter !== "all" ? "Nincs találat" : "Még nincsenek álláshirdetések"}
          </h3>
          <p className="text-sm text-muted-foreground mb-5">
            {search || filter !== "all"
              ? "Próbálj más keresési feltételt vagy szűrőt"
              : "Hozd létre az első pozíciót a toborzás megkezdéséhez"}
          </p>
          {!search && filter === "all" && (
            <ManagePostingDialog jobs={jobs} onSaved={addOrUpdate}>
              <Button className="bg-primary text-primary-foreground gap-2">
                <Plus className="h-4 w-4" />
                Új hirdetés feladása
              </Button>
            </ManagePostingDialog>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(posting => {
            const applicantCount = getApplicantCount(posting)
            const days = daysSince(posting.created_at || "")
            const salaryLabel = formatSalaryBand(posting.bersav_min, posting.bersav_max)

            return (
              <div
                key={posting.id}
                className="bg-card border border-border rounded-lg p-5 flex items-center gap-6 transition-colors hover:border-primary/30"
              >
                {/* Bal: Cím + Munkakör + Badge-ek */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base text-foreground truncate">{posting.cim}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {posting.hr_munkakor?.megnevezes || "–"}
                    {posting.reszleg_nev ? ` • ${posting.reszleg_nev}` : ""}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {posting.aktiv && posting.publikus ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-success-subtle text-success">
                        <span className="w-1.5 h-1.5 rounded-full bg-success" />
                        Publikus
                      </span>
                    ) : posting.aktiv ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-warning-subtle text-warning">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                        Csak belső
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-muted text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                        Inaktív
                      </span>
                    )}

                    {posting.munkavegzes_modja && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border border-border bg-muted/40 text-foreground">
                        {WORK_MODE_SHORT_LABELS[posting.munkavegzes_modja] || posting.munkavegzes_modja}
                      </span>
                    )}

                    {posting.tapasztalati_szint && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border border-border bg-muted/40 text-foreground">
                        {SENIORITY_LABELS[posting.tapasztalati_szint] || posting.tapasztalati_szint}
                      </span>
                    )}

                    {posting.helyszin && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-muted-foreground border border-border/60">
                        <MapPin className="w-3 h-3" />
                        {posting.helyszin.split(",")[0]}
                      </span>
                    )}

                    {salaryLabel && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium tabular-nums border border-primary/30 bg-primary/5 text-primary">
                        {salaryLabel}
                        {!posting.bersav_publikus ? " (belső)" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Közép: Metrikák */}
                <div className="hidden md:flex flex-col gap-1.5 shrink-0 w-36">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
                    <Users className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                    {applicantCount} db jelentkező
                  </span>
                  <span className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                    {days === 0 ? "Ma feladva" : `${days} napja feladva`}
                  </span>
                </div>

                {/* Jobb: Togglek + Akciók */}
                <div className="flex items-center gap-4 shrink-0">
                  {/* Aktív / Publikus togglek */}
                  <div className="flex items-center gap-4 border-r border-border pr-4">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[11px] text-muted-foreground">Aktív</span>
                      <Switch
                        checked={posting.aktiv}
                        onCheckedChange={() => toggleStatus(posting.id, "aktiv", !!posting.aktiv)}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[11px] text-muted-foreground">Publikus</span>
                      <Switch
                        checked={posting.publikus}
                        onCheckedChange={() => toggleStatus(posting.id, "publikus", !!posting.publikus)}
                      />
                    </div>
                  </div>

                  {/* Akció gombok */}
                  <div className="flex items-center gap-1">
                    <ManagePostingDialog jobs={jobs} existingData={posting as any} onSaved={addOrUpdate}>
                      <Button variant="ghost" size="icon" title="Szerkesztés">
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </ManagePostingDialog>

                    {posting.publikus && (
                      <Link href={`/karrier/${posting.id}`} target="_blank">
                        <Button variant="ghost" size="icon" title="Megtekintés karrieroldalon">
                          <ExternalLink className="h-4 w-4 text-primary" />
                        </Button>
                      </Link>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      title="Törlés"
                      onClick={() => handleDelete(posting.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
