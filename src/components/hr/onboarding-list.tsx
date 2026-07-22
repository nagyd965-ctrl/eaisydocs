"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { OnboardingCard } from "./onboarding-card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { LayoutGrid, List, Search } from "lucide-react"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { updateOnboardingDate } from "@/app/hr/onboarding/actions"
import { OnboardingProfileModal } from "./onboarding-profile-modal"
import { toast } from "sonner"

interface OnboardingListProps {
  onboardings: any[]
}

export function OnboardingList({ onboardings }: OnboardingListProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [search, setSearch] = useState("")

  const filteredOnboardings = onboardings.filter(o => 
    o.nev.toLowerCase().includes(search.toLowerCase()) || 
    o.munkakor?.toLowerCase().includes(search.toLowerCase())
  )

  const handleDateChange = async (id: string, newDate: string) => {
    if (!newDate) return
    const result = await updateOnboardingDate(id, newDate)
    if (result.error) toast.error(result.error)
    else toast.success("Dátum sikeresen frissítve!")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20 p-2 rounded-lg border border-dashed">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Keresés név vagy pozíció alapján..." 
            className="pl-8 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant={viewMode === "grid" ? "default" : "outline"} 
            size="sm"
            onClick={() => setViewMode("grid")}
            className="gap-2"
          >
            <LayoutGrid className="w-4 h-4" /> Kártyák
          </Button>
          <Button 
            variant={viewMode === "list" ? "default" : "outline"} 
            size="sm"
            onClick={() => setViewMode("list")}
            className="gap-2"
          >
            <List className="w-4 h-4" /> Táblázat
          </Button>
        </div>
      </div>

      {filteredOnboardings.length === 0 ? (
        <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
          {search ? "Nincs a keresésnek megfelelő jelölt." : "Jelenleg nincsenek aktív beléptetési folyamatok."}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredOnboardings.map((person) => (
            <OnboardingCard key={person.id} onboarding={person} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 overflow-x-auto bg-card">
          <Table className="compact-table min-w-[800px]">
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Név és Munkakör</TableHead>
                <TableHead>Belépés Dátuma</TableHead>
                <TableHead className="w-[300px]">Állapot</TableHead>
                <TableHead className="w-[100px] text-right">Műveletek</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOnboardings.map((person) => {
                const tasks = person.hr_onboarding_feladat || []
                const doneCount = tasks.filter((t: any) => t.statusz === 'done').length
                const progress = tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0
                const isDone = progress === 100

                return (
                  <TableRow key={person.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="font-medium text-sm">{person.nev}</div>
                      <div className="text-xs text-muted-foreground">{person.munkakor}</div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{person.belepes_datuma}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        <span className="text-xs tabular-nums text-muted-foreground w-8">
                          {Math.round(progress)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger render={<Button variant="ghost" size="sm" className="text-primary" />}>
                          Részletek
                        </DialogTrigger>
                        <OnboardingProfileModal onboarding={person} onDateChange={(newDate) => handleDateChange(person.id, newDate)} />
                      </Dialog>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
