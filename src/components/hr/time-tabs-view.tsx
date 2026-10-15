"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ShiftPlannerWeeklyGrid } from "@/components/hr/shift-planner-weekly-grid"
import { ShiftTemplatesManager } from "@/components/hr/shift-templates-manager"
import { TeamCalendar } from "@/components/hr/team-calendar"
import { WeeklyRosterData, ShiftTemplate } from "@/types/shifts"

interface TimeTabsViewProps {
  initialRosterData: WeeklyRosterData
  initialTemplates: ShiftTemplate[]
  teamMembers: any[]
  leaves: any[]
  orgUnits: any[]
}

export function TimeTabsView({
  initialRosterData,
  initialTemplates,
  teamMembers,
  leaves,
  orgUnits,
}: TimeTabsViewProps) {
  const [activeTab, setActiveTab] = useState("shifts")

  return (
    <div className="space-y-6">
      {/* Cím és leírás */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Munkaidő & Műszakbeosztás
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Központi heti műszaktervező, távollét- és szabadságkezelés, valamint munkarend-sablonok.
          </p>
        </div>
      </div>

      {/* Tabs Fejléc */}
      <Tabs
        defaultValue="shifts"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full space-y-4"
      >
        <div className="border-b border-border pb-px">
          <TabsList className="bg-transparent p-0 gap-2 h-auto" variant="line">
            <TabsTrigger
              value="shifts"
              className="px-3 py-2 text-xs sm:text-sm font-medium data-active:border-primary data-active:text-primary rounded-none border-b-2 border-transparent transition-all cursor-pointer"
            >
              Műszakbeosztás Tervező
            </TabsTrigger>

            <TabsTrigger
              value="leaves"
              className="px-3 py-2 text-xs sm:text-sm font-medium data-active:border-primary data-active:text-primary rounded-none border-b-2 border-transparent transition-all cursor-pointer"
            >
              Távollétek & Csapatnaptár
            </TabsTrigger>

            <TabsTrigger
              value="templates"
              className="px-3 py-2 text-xs sm:text-sm font-medium data-active:border-primary data-active:text-primary rounded-none border-b-2 border-transparent transition-all cursor-pointer"
            >
              Műszaksablonok
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Műszakbeosztás Tervező */}
        <TabsContent value="shifts" className="m-0 focus-visible:outline-none">
          <ShiftPlannerWeeklyGrid initialData={initialRosterData} />
        </TabsContent>

        {/* Tab 2: Távollétek & Csapatnaptár (A meglévő TeamCalendar) */}
        <TabsContent value="leaves" className="m-0 focus-visible:outline-none">
          <TeamCalendar
            teamMembers={teamMembers}
            leaves={leaves}
            orgUnits={orgUnits}
          />
        </TabsContent>

        {/* Tab 3: Műszaksablonok beállítása */}
        <TabsContent value="templates" className="m-0 focus-visible:outline-none">
          <ShiftTemplatesManager initialTemplates={initialTemplates} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
