"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OffboardingList } from "@/components/hr/offboarding-list"
import { ExitInterviewSummary } from "@/components/hr/exit-interview-summary"
import { Users, BarChart2 } from "lucide-react"

import { type OffboardingProfile, type Employee, type ExitInterview } from "@/types/hr"

interface OffboardingTabsProps {
  offboardings: OffboardingProfile[]
  employees: Employee[]
  exitInterviews: ExitInterview[]
}

export function OffboardingTabs({ offboardings, employees, exitInterviews }: OffboardingTabsProps) {
  return (
    <Tabs defaultValue="folyamatok" className="space-y-6">
      <TabsList className="h-9">
        <TabsTrigger value="folyamatok" className="gap-2 text-xs">
          <Users className="w-3.5 h-3.5" />
          Kiléptetési Folyamatok
        </TabsTrigger>
        <TabsTrigger value="interju-osszesito" className="gap-2 text-xs">
          <BarChart2 className="w-3.5 h-3.5" />
          Kilépési Interjú Összesítő
          {exitInterviews.length > 0 && (
            <span className="ml-1 bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-primary/20">
              {exitInterviews.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="folyamatok" className="m-0">
        <OffboardingList offboardings={offboardings} employees={employees} />
      </TabsContent>

      <TabsContent value="interju-osszesito" className="m-0">
        <ExitInterviewSummary interviews={exitInterviews} />
      </TabsContent>
    </Tabs>
  )
}
