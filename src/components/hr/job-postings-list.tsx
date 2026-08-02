"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  ExternalLink, Edit, Trash2, Briefcase, CheckCircle,
  Users, Search, Clock, Plus
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { ManagePostingDialog } from "./manage-posting-dialog"

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

export function JobPostingsList({
  initialPostings,
  jobs,
  candidates = [],
}: {
  initialPostings: any[]
  jobs: any[]
  candidates?: any[]
}) {
  const [postings, setPostings] = useState(initialPostings)
  const [search, setSearch]     = useState("")
  const [filter, setFilter]     = useState<FilterKey>("all")
  const supabase = createClient()

  /* ───── Stats ───── */
  const activePublicCount = postings.filter(p => p.aktiv && p.publikus).length

  /* ───── Filter ───── */
  const filtered = useMemo(() => {
    let result = postings
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.cim?.toLowerCase().includes(q) ||
        p.hr_munkakor?.megnevezes?.toLowerCase().includes(q)
      )
    }
    if (filter === "aktiv")    result = result.filter(p => p.aktiv)
    if (filter === "inaktiv")  result = result.filter(p => !p.aktiv)
    if (filter === "publikus") result = result.filter(p => p.publikus && p.aktiv)
    return result
  }, [postings, search, filter])

  /* ───── Helpers ───── */
  function getApplicantCount(posting: any): number {
    return candidates.filter(c => c.megpalyazott_munkakor_id === posting.munkakor_id).length
  }

  function addOrUpdate(savedPosting: any) {
    const job = jobs.find(j => j.id === savedPosting.munkakor_id)
    const full = { ...savedPosting, hr_munkakor: { megnevezes: job?.megnevezes } }
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
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4 border-l-4 border-l-primary">
          <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Briefcase className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Összes hirdetés</p>
            <p className="text-2xl font-semibold tabular-nums">{postings.length}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4 border-l-4 border-l-success">
          <div className="h-9 w-9 rounded-md bg-success/10 flex items-center justify-center shrink-0">
            <CheckCircle className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Aktív & Publikus</p>
            <p className="text-2xl font-semibold tabular-nums">{activePublicCount}</p>
            <p className="text-[11px] text-muted-foreground">karrieroldalon látható</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4 border-l-4 border-l-info">
          <div className="h-9 w-9 rounded-md bg-info/10 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-info" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Összes jelentkező</p>
            <p className="text-2xl font-semibold tabular-nums">{candidates.length}</p>
          </div>
        </div>
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
          <Briefcase className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
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
            const days = daysSince(posting.created_at)

            return (
              <div
                key={posting.id}
                className="bg-card border border-border rounded-lg p-5 flex items-center gap-6 transition-colors hover:border-primary/30"
              >
                {/* Bal: Cím + Munkakör + Badge-ek */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base text-foreground truncate">{posting.cim}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{posting.hr_munkakor?.megnevezes || "–"}</p>
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
                    {posting.aktiv && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border border-success/40 text-success">
                        Aktív
                      </span>
                    )}
                  </div>
                </div>

                {/* Közép: Metrikák */}
                <div className="hidden md:flex flex-col gap-1.5 shrink-0 w-36">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                    {applicantCount} db jelentkező
                  </span>
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
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
                        onCheckedChange={() => toggleStatus(posting.id, "aktiv", posting.aktiv)}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[11px] text-muted-foreground">Publikus</span>
                      <Switch
                        checked={posting.publikus}
                        onCheckedChange={() => toggleStatus(posting.id, "publikus", posting.publikus)}
                      />
                    </div>
                  </div>

                  {/* Akció gombok */}
                  <div className="flex items-center gap-1">
                    <ManagePostingDialog jobs={jobs} existingData={posting} onSaved={posting2 => {
                      const job = jobs.find(j => j.id === posting2.munkakor_id)
                      setPostings(prev => prev.map(p => p.id === posting2.id
                        ? { ...posting2, hr_munkakor: { megnevezes: job?.megnevezes } }
                        : p
                      ))
                    }}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </ManagePostingDialog>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(posting.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    {posting.publikus && posting.aktiv && (
                      <Link href={`/karrier/${posting.id}`} target="_blank">
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs ml-1">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Karrieroldal
                        </Button>
                      </Link>
                    )}
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
