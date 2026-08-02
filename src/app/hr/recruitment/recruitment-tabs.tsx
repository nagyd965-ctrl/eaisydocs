"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KanbanBoard } from "./kanban-board"
import { AddCandidateDialog } from "@/components/hr/add-candidate-dialog"
import { JobPostingsList } from "@/components/hr/job-postings-list"

export function RecruitmentTabs({
  candidates,
  postings,
  jobs,
}: {
  candidates: any[]
  postings: any[]
  jobs: any[]
}) {
  const [tab, setTab] = useState("postings")

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
      <div className="flex justify-between items-center shrink-0 mb-4">
        <TabsList>
          <TabsTrigger value="postings">Álláshirdetések (Karrieroldal)</TabsTrigger>
          <TabsTrigger value="kanban">Kanban Tábla (Jelentkezők)</TabsTrigger>
        </TabsList>

        {/* Jelentkező hozzáadása csak a Kanban tabon releváns */}
        {tab === "kanban" && (
          <div className="flex gap-4">
            <AddCandidateDialog jobs={jobs} />
          </div>
        )}
      </div>

      <TabsContent value="postings" className="flex-1 overflow-auto m-0 p-0">
        <JobPostingsList
          initialPostings={postings}
          jobs={jobs}
          candidates={candidates}
        />
      </TabsContent>

      <TabsContent value="kanban" className="flex-1 overflow-hidden m-0 p-0">
        <KanbanBoard initialCandidates={candidates} />
      </TabsContent>
    </Tabs>
  )
}
