"use client"

import { useState } from "react"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { OffboardingCard } from "./offboarding-card"
import { OffboardingProfileModal } from "./offboarding-profile-modal"
import { updateOffboardingDate } from "@/app/hr/offboarding/actions"
import { AddOffboardingDialog } from "./add-offboarding-dialog"

import { type Employee, type OffboardingTask } from "@/types/hr"
export { type OffboardingTask }

export interface OffboardingListItem {
  id: string
  dolgozo_id?: string
  felhasznalo_profil?: { nev?: string | null } | null
  statusz: "folyamatban" | "lezart" | string
  utolso_munkanap?: string | null
  hr_offboarding_feladat?: OffboardingTask[]
  hr_kilepes_interju?: any[]
  [key: string]: any
}

interface OffboardingListProps {
  offboardings: OffboardingListItem[]
  employees: Employee[]
}

export function OffboardingList({ offboardings, employees }: OffboardingListProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredOffboardings = offboardings.filter(o => {
    const ujNev = o.felhasznalo_profil?.nev?.toLowerCase() || ""
    const query = searchQuery.toLowerCase()
    return ujNev.includes(query)
  })

  const handleDateChange = async (id: string, newDate: string) => {
    await updateOffboardingDate(id, newDate)
  }

  const columns = [
    { id: 'folyamatban', title: 'Folyamatban lévő kiléptetések' },
    { id: 'lezart', title: 'Lezárt kiléptetések' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Keresés név szerint..."
            className="pl-9 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <AddOffboardingDialog employees={employees} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {columns.map(column => {
          const colItems = filteredOffboardings.filter(o => 
            column.id === 'lezart' ? o.statusz === 'lezart' : o.statusz !== 'lezart'
          )
          
          return (
            <div key={column.id} className="bg-muted/30 rounded-xl p-4 border border-border/50">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-semibold text-sm text-foreground/80 flex items-center gap-2">
                  {column.title}
                  <span className="bg-background px-2 py-0.5 rounded-full text-xs border">
                    {colItems.length}
                  </span>
                </h3>
              </div>
              
              <div className="space-y-3">
                {colItems.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                    Nincs adat a kategóriában
                  </div>
                ) : (
                  colItems.map((person) => (
                    <OffboardingCard key={person.id} offboarding={person} />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
