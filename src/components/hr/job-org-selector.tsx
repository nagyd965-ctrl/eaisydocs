"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Building2, Briefcase, Sparkles, Pencil, ListFilter, RotateCcw } from "lucide-react"
import { getJobsAndOrgUnitsAction, type OrgUnitOption, type JobOption } from "@/app/hr/actions/job-org-actions"

interface JobOrgSelectorProps {
  orgUnits?: OrgUnitOption[]
  jobs?: JobOption[]
  selectedOrgUnitName?: string
  selectedMunkakor?: string
  onOrgUnitChange: (orgUnitName: string, orgUnitId?: string) => void
  onMunkakorChange: (jobTitle: string, jobId?: string, feorKod?: string) => void
  required?: boolean
  disabled?: boolean
  compact?: boolean
  className?: string
  orgUnitLabel?: string
  munkakorLabel?: string
}

export function JobOrgSelector({
  orgUnits: propOrgUnits,
  jobs: propJobs,
  selectedOrgUnitName = "",
  selectedMunkakor = "",
  onOrgUnitChange,
  onMunkakorChange,
  required = true,
  disabled = false,
  compact = false,
  className = "",
  orgUnitLabel = "Szervezeti Egység / Részleg",
  munkakorLabel = "Munkakör / Pozíció"
}: JobOrgSelectorProps) {
  const [internalOrgUnits, setInternalOrgUnits] = useState<OrgUnitOption[]>(propOrgUnits || [])
  const [internalJobs, setInternalJobs] = useState<JobOption[]>(propJobs || [])
  const [isLoading, setIsLoading] = useState(false)
  const [isCustomMode, setIsCustomMode] = useState(false)

  // Aktív választások (ID vagy "all" / "none")
  const [selectedOrgUnitId, setSelectedOrgUnitId] = useState<string>("all")
  const [selectedJobId, setSelectedJobId] = useState<string>("none")

  // Refs a duplikált frissítési ciklusok megelőzésére
  const isSyncingRef = useRef(false)

  // 1. Ha nem kaptunk propként adatokat, lekérjük a szerver akcióval
  useEffect(() => {
    if (propOrgUnits && propOrgUnits.length > 0) {
      setInternalOrgUnits(propOrgUnits)
    }
    if (propJobs && propJobs.length > 0) {
      setInternalJobs(propJobs)
    }

    if ((!propOrgUnits || propOrgUnits.length === 0) || (!propJobs || propJobs.length === 0)) {
      setIsLoading(true)
      getJobsAndOrgUnitsAction().then((res) => {
        setIsLoading(false)
        if (res.orgUnits && res.orgUnits.length > 0) {
          setInternalOrgUnits(res.orgUnits)
        }
        if (res.jobs && res.jobs.length > 0) {
          setInternalJobs(res.jobs)
        }
      })
    }
  }, [propOrgUnits, propJobs])

  const orgUnits = internalOrgUnits
  const jobs = internalJobs

  // 2. Kezdeti szinkronizáció és külső propok változásának követése
  useEffect(() => {
    if (isSyncingRef.current || jobs.length === 0) return

    // Ha van megadott munkakör cím (pl. "Flottakezelő")
    if (selectedMunkakor && selectedMunkakor.trim()) {
      const matchedJob = jobs.find(
        (j) => j.megnevezes.toLowerCase().trim() === selectedMunkakor.toLowerCase().trim()
      )

      if (matchedJob) {
        setSelectedJobId(matchedJob.id)

        // Ha a munkakörhöz tartozik szervezeti egység, automatikusan beállítjuk
        if (matchedJob.szervezeti_egyseg_id) {
          const matchedOrg = orgUnits.find((o) => o.id === matchedJob.szervezeti_egyseg_id)
          if (matchedOrg) {
            setSelectedOrgUnitId(matchedOrg.id)
            if (!selectedOrgUnitName || selectedOrgUnitName !== matchedOrg.nev) {
              onOrgUnitChange(matchedOrg.nev, matchedOrg.id)
            }
          }
        }
        return
      }
    }

    // Ha csak szervezeti egység név van megadva
    if (selectedOrgUnitName && selectedOrgUnitName.trim()) {
      const matchedOrg = orgUnits.find(
        (o) => o.nev.toLowerCase().trim() === selectedOrgUnitName.toLowerCase().trim()
      )
      if (matchedOrg) {
        setSelectedOrgUnitId(matchedOrg.id)
      }
    }
  }, [selectedMunkakor, selectedOrgUnitName, jobs, orgUnits])

  // 3. Szűrt munkakörök a kiválasztott szervezeti egység alapján
  const filteredJobs = useMemo(() => {
    if (!selectedOrgUnitId || selectedOrgUnitId === "all" || selectedOrgUnitId === "none") {
      return jobs
    }
    return jobs.filter((j) => j.szervezeti_egyseg_id === selectedOrgUnitId)
  }, [jobs, selectedOrgUnitId])

  // 4. Szervezeti egység váltás kezelése
  const handleOrgUnitChange = (unitIdVal: string | null) => {
    const unitId = unitIdVal || "all"
    isSyncingRef.current = true
    setSelectedOrgUnitId(unitId)

    if (unitId === "all" || unitId === "none") {
      onOrgUnitChange("", undefined)
      isSyncingRef.current = false
      return
    }

    const org = orgUnits.find((o) => o.id === unitId)
    if (org) {
      onOrgUnitChange(org.nev, org.id)

      // Ellenőrizzük, hogy a jelenlegi munkakör ebbe az egységbe tartozik-e
      const currentJob = jobs.find((j) => j.id === selectedJobId)
      if (currentJob && currentJob.szervezeti_egyseg_id !== unitId) {
        // Ha nem ebbe tartozik, válasszuk ki az új egység munkakörét ha csak 1 van, vagy töröljük
        const availableInDept = jobs.filter((j) => j.szervezeti_egyseg_id === unitId)
        if (availableInDept.length === 1) {
          const singleJob = availableInDept[0]
          setSelectedJobId(singleJob.id)
          onMunkakorChange(singleJob.megnevezes, singleJob.id, singleJob.feor_kod || undefined)
        } else {
          setSelectedJobId("none")
          onMunkakorChange("", undefined, undefined)
        }
      } else if (!currentJob || selectedJobId === "none") {
        const availableInDept = jobs.filter((j) => j.szervezeti_egyseg_id === unitId)
        if (availableInDept.length === 1) {
          const singleJob = availableInDept[0]
          setSelectedJobId(singleJob.id)
          onMunkakorChange(singleJob.megnevezes, singleJob.id, singleJob.feor_kod || undefined)
        }
      }
    }

    setTimeout(() => {
      isSyncingRef.current = false
    }, 50)
  }

  // 5. Munkakör váltás kezelése
  const handleJobChange = (jobIdVal: string | null) => {
    const jobId = jobIdVal || "none"
    isSyncingRef.current = true
    setSelectedJobId(jobId)

    if (jobId === "none") {
      onMunkakorChange("", undefined, undefined)
      isSyncingRef.current = false
      return
    }

    const job = jobs.find((j) => j.id === jobId)
    if (job) {
      onMunkakorChange(job.megnevezes, job.id, job.feor_kod || undefined)

      // KULCSFONTOSSÁGÚ AUTOMATIZMUS:
      // Ha a munkakörhöz tartozik szervezeti egység, azonnal beállítjuk!
      if (job.szervezeti_egyseg_id) {
        const matchingOrg = orgUnits.find((o) => o.id === job.szervezeti_egyseg_id)
        if (matchingOrg) {
          setSelectedOrgUnitId(matchingOrg.id)
          onOrgUnitChange(matchingOrg.nev, matchingOrg.id)
        }
      }
    }

    setTimeout(() => {
      isSyncingRef.current = false
    }, 50)
  }

  // Ha a felhasználó egyéni, katalógusban nem szereplő munkakört szeretne begépelni
  if (isCustomMode) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
          <span className="flex items-center gap-1.5 font-medium">
            <Pencil className="w-3.5 h-3.5 text-primary" /> Egyéni Munkakör & Egység Megadása
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-[11px] gap-1 text-primary hover:text-primary"
            onClick={() => setIsCustomMode(false)}
          >
            <RotateCcw className="w-3 h-3" /> Vissza a katalógushoz
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {orgUnitLabel} {required && <span className="text-destructive">*</span>}
            </Label>
            <div className="relative">
              <Building2 className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Pl. FCM vagy IT"
                value={selectedOrgUnitName}
                onChange={(e) => onOrgUnitChange(e.target.value)}
                disabled={disabled}
                required={required}
                className={compact ? "h-8 text-xs pl-8" : "h-9 text-sm pl-8"}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {munkakorLabel} {required && <span className="text-destructive">*</span>}
            </Label>
            <div className="relative">
              <Briefcase className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Pl. Flottakezelő"
                value={selectedMunkakor}
                onChange={(e) => onMunkakorChange(e.target.value)}
                disabled={disabled}
                required={required}
                className={compact ? "h-8 text-xs pl-8" : "h-9 text-sm pl-8 font-medium"}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const selectedOrgUnit = orgUnits.find((o) => o.id === selectedOrgUnitId)
  const currentJob = jobs.find((j) => j.id === selectedJobId)

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. Szervezeti Egység Választó */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              {orgUnitLabel} {required && <span className="text-destructive">*</span>}
            </Label>
          </div>

          <Select
            value={selectedOrgUnitId}
            onValueChange={handleOrgUnitChange}
            disabled={disabled || isLoading}
          >
            <SelectTrigger className={compact ? "h-8 text-xs" : "h-9 text-sm"}>
              <SelectValue placeholder="Válassz szervezeti egységet">
                {selectedOrgUnit?.nev || (selectedOrgUnitId === "all" ? "Összes szervezeti egység" : "Válassz egységet...")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="text-muted-foreground">-- Összes szervezeti egység ({orgUnits.length}) --</span>
              </SelectItem>
              {orgUnits.map((unit) => {
                const unitJobCount = jobs.filter((j) => j.szervezeti_egyseg_id === unit.id).length
                return (
                  <SelectItem key={unit.id} value={unit.id}>
                    <span className="font-medium text-foreground">{unit.nev}</span>
                    <span className="text-muted-foreground text-xs ml-2">
                      ({unitJobCount} munkakör)
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {/* 2. Munkakör Választó (összekapcsolva) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-primary" />
              {munkakorLabel} {required && <span className="text-destructive">*</span>}
            </Label>
            {selectedOrgUnit && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" />
                {selectedOrgUnit.nev}
              </span>
            )}
          </div>

          <Select
            value={selectedJobId}
            onValueChange={handleJobChange}
            disabled={disabled || isLoading}
          >
            <SelectTrigger className={compact ? "h-8 text-xs font-medium" : "h-9 text-sm font-medium"}>
              <SelectValue placeholder="Válassz nyilvántartott munkakört">
                {currentJob ? (
                  <span>
                    {currentJob.megnevezes}
                    {currentJob.feor_kod ? ` (FEOR: ${currentJob.feor_kod})` : ""}
                  </span>
                ) : (
                  "Válassz nyilvántartott munkakört..."
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="none">
                <span className="text-muted-foreground">-- Válassz munkakört ({filteredJobs.length} elérhető) --</span>
              </SelectItem>
              {filteredJobs.map((job) => {
                const orgName = job.szervezeti_egyseg_nev || orgUnits.find((o) => o.id === job.szervezeti_egyseg_id)?.nev
                return (
                  <SelectItem key={job.id} value={job.id}>
                    <div className="flex items-center justify-between gap-3 w-full">
                      <span className="font-medium">{job.megnevezes}</span>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {job.feor_kod && (
                          <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">
                            FEOR: {job.feor_kod}
                          </span>
                        )}
                        {orgName && selectedOrgUnitId === "all" && (
                          <span className="text-[11px] font-semibold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                            {orgName}
                          </span>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                )
              })}
              {filteredJobs.length === 0 && (
                <div className="p-2 text-xs text-muted-foreground text-center italic">
                  Ehhez a szervezeti egységhez még nincs munkakör rögzítve a katalógusban.
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Finom alsó információs és egyéni mód gomb */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
        <span>
          {currentJob?.szervezeti_egyseg_nev ? (
            <span className="text-primary font-medium">
              Kapcsolt egység: {currentJob.szervezeti_egyseg_nev}
            </span>
          ) : (
            "A kiválasztott munkakör automatikusan kitölti a hozzá kapcsolt szervezeti egységet."
          )}
        </span>
        <button
          type="button"
          onClick={() => setIsCustomMode(true)}
          className="text-muted-foreground hover:text-foreground hover:underline transition-colors flex items-center gap-1"
        >
          <Pencil className="w-3 h-3" /> Egyéni cím megadása
        </button>
      </div>
    </div>
  )
}
